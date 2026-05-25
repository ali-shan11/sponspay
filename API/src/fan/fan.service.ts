import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, QueryFailedError } from 'typeorm';
import { randomUUID } from 'crypto';
import { LinkClick } from '../link-click/entities/link-click.entity';
import { TelegramChannel } from '../creator/entities/telegram-channel.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { TransactionStatus } from '../transaction/entities/transaction-status.entity';
import { Currency } from '../transaction/entities/currency.entity';
import { YouTubeApiService } from './youtube/youtube-api.service';
import { PawapayService } from '../pawapay/pawapay.service';
import {
  PawapayRejectionException,
  PawapayDuplicateException,
} from '../pawapay/pawapay.exceptions';
import { ProviderCacheService } from '../pawapay/provider-cache.service';
import { PaymentCountryService } from '../pawapay/payment-country.service';
import { CountryPriceService } from '../transaction/services/country-price.service';
import { TelegramService } from '../telegram/telegram.service';
import { RedisService } from '../redis/redis.service';
import { UserChannelRole } from '../creator/entities/user-channel.entity';
import {
  ChannelInfoResponseDto,
  RecentMessageDto,
} from './dto/channel-info.response.dto';
import { FanPaymentRequestDto } from './dto/fan-payment-request.dto';
import { FanPaymentResponseDto } from './dto/fan-payment-response.dto';

@Injectable()
export class FanService {
  private readonly logger = new Logger(FanService.name);

  constructor(
    @InjectRepository(LinkClick)
    private readonly linkClickRepo: Repository<LinkClick>,
    @InjectRepository(TelegramChannel)
    private readonly telegramChannelRepo: Repository<TelegramChannel>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionStatus)
    private readonly transactionStatusRepo: Repository<TransactionStatus>,
    @InjectRepository(Currency)
    private readonly currencyRepo: Repository<Currency>,
    private readonly providerCacheService: ProviderCacheService,
    private readonly paymentCountryService: PaymentCountryService,
    @Inject(forwardRef(() => CountryPriceService))
    private readonly countryPriceService: CountryPriceService,
    private readonly youtubeApiService: YouTubeApiService,
    private readonly pawapayService: PawapayService,
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
    private readonly redisService: RedisService,
  ) {}

  private readonly MESSAGES_CACHE_TTL = 60; // 1 minutes
  private readonly MESSAGES_CACHE_KEY_PREFIX = 'telegram:messages:';

  async getChannelInfo(
    channelHandle: string,
    limit: number = 5,
    referral: {
      referralSource: string | null;
      referralMedium: string | null;
      referralCampaign: string | null;
      referrerUrl: string | null;
      referrerNetwork: string | null;
    } = {
      referralSource: null,
      referralMedium: null,
      referralCampaign: null,
      referrerUrl: null,
      referrerNetwork: null,
    },
  ): Promise<ChannelInfoResponseDto> {
    // 1. Validate channel handle exists (case-insensitive)
    const telegramChannel = await this.telegramChannelRepo.findOne({
      where: { channelHandle: channelHandle.toLowerCase() },
      relations: [
        'youtubeChannel',
        'youtubeChannel.userChannels',
        'youtubeChannel.userChannels.user',
      ],
    });

    if (!telegramChannel) {
      throw new NotFoundException(
        `Channel with handle "${channelHandle}" not found`,
      );
    }

    // Record link click (fire-and-forget, don't block the response)
    this.linkClickRepo
      .save({
        telegramChannel,
        referralSource: referral.referralSource,
        referralMedium: referral.referralMedium,
        referralCampaign: referral.referralCampaign,
        referrerUrl: referral.referrerUrl,
        referrerNetwork: referral.referrerNetwork,
      })
      .catch((err) => {
        this.logger.error(
          `Failed to record link click for ${channelHandle}:`,
          err?.message || err,
        );
      });

    // 2. Get YouTube channel info via the direct relationship
    const youtubeChannel = telegramChannel.youtubeChannel;

    // Resolve creator display name from channel owner
    const owner = youtubeChannel?.userChannels?.find(
      (uc) => uc.role === UserChannelRole.Owner,
    )?.user;
    const creatorName = owner?.displayName ?? telegramChannel.channelHandle;

    let youtubeVideoInfo = null;
    if (youtubeChannel) {
      // Check for active live stream or get latest video
      youtubeVideoInfo = await this.youtubeApiService.getVideoInfo(
        youtubeChannel.channelId,
      );
    } else {
      this.logger.warn(
        `No YouTube channel found for Telegram channel ${channelHandle}`,
      );
    }

    // 3. Get recent messages from Telegram (with Redis cache)
    const recentMessages = await this.fetchMessagesFromTelegram(
      telegramChannel.channelHandle,
      limit,
    );

    // 3b. Attach youtubeVideoId + title for paid messages by joining on messageId
    await this.attachVideoContextToMessages(recentMessages);

    // 4. Verify channel access and creator presence
    const paymentsAvailable = await this.telegramService.verifyChannelAccess(
      telegramChannel.channelHandle,
    );

    // 5. Get fan invite link with self-healing
    let inviteLink: string | null = null;
    try {
      inviteLink = await this.telegramService.getFanInviteLink(
        telegramChannel.channelHandle,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to get fan invite link for channel ${telegramChannel.channelHandle}:`,
        error?.message || error,
      );
      // Continue with inviteLink = null
    }

    // 6. Get payment countries with operators and pricing
    const paymentCountries =
      await this.paymentCountryService.getPaymentCountries();

    // 7. Build response
    return {
      channelHandle: telegramChannel.channelHandle,
      creatorName,
      youtubeEmbed: youtubeVideoInfo
        ? {
            channelName: youtubeChannel!.channelName,
            embedUrl: youtubeVideoInfo.embedUrl,
            isLiveStream: youtubeVideoInfo.isLiveStream,
            title: youtubeVideoInfo.title,
            description: youtubeVideoInfo.description,
            thumbnailUrl: youtubeVideoInfo.thumbnailUrl,
          }
        : null,
      recentMessages,
      paymentsAvailable,
      inviteLink,
      paymentCountries,
    };
  }

  /**
   * Joins Telegram-sourced paid messages against our Transaction records
   * (by Telegram messageId) to attach youtubeVideoId + cached YouTube title.
   * Mutates the passed-in array.
   */
  private async attachVideoContextToMessages(
    messages: RecentMessageDto[],
  ): Promise<void> {
    const paidMessageIds = messages
      .filter((m) => m.senderType === 'paid' && m.telegramMessageId)
      .map((m) => m.telegramMessageId as string);

    if (paidMessageIds.length === 0) return;

    try {
      const transactions = await this.transactionRepo.find({
        where: { messageId: In(paidMessageIds) },
        select: ['messageId', 'youtubeVideoId'],
      });

      const videoIdByMessageId = new Map<string, string>();
      const videoIds: string[] = [];
      for (const tx of transactions) {
        if (tx.youtubeVideoId) {
          videoIdByMessageId.set(tx.messageId, tx.youtubeVideoId);
          videoIds.push(tx.youtubeVideoId);
        }
      }

      const titles =
        videoIds.length > 0
          ? await this.youtubeApiService.getVideoTitles(videoIds)
          : new Map<string, string>();

      for (const msg of messages) {
        if (msg.senderType !== 'paid' || !msg.telegramMessageId) continue;
        const videoId = videoIdByMessageId.get(msg.telegramMessageId);
        if (!videoId) continue;
        msg.youtubeVideoId = videoId;
        msg.youtubeVideoTitle = titles.get(videoId) ?? null;
      }
    } catch (error: any) {
      this.logger.error(
        'Failed to attach video context to messages',
        error?.message || error,
      );
    }
  }

  /**
   * Fetch messages directly from Telegram channel with Redis caching.
   * Cache TTL: 2 minutes (120 seconds)
   *
   * @param channelHandle - Channel handle (without @)
   * @param limit - Number of messages to fetch (1-20, default 5)
   * @returns Array of RecentMessageDto
   */
  private async fetchMessagesFromTelegram(
    channelHandle: string,
    limit: number = 5,
  ): Promise<RecentMessageDto[]> {
    try {
      // 1. Check cache first
      const cached = await this.getCachedMessages(channelHandle, limit);
      if (cached) {
        this.logger.log(
          `Cache hit for Telegram messages: ${channelHandle} (limit: ${limit})`,
        );
        return cached;
      }

      this.logger.log(
        `Cache miss for Telegram messages: ${channelHandle}, fetching from API`,
      );

      // 2. Fetch from Telegram
      const messages = await this.telegramService.fetchChannelMessages(
        channelHandle,
        limit,
      );

      // 3. Cache the results
      await this.cacheMessages(channelHandle, limit, messages);

      return messages;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch Telegram messages for channel ${channelHandle}:`,
        error?.message || error,
      );
      // Graceful degradation: return empty array
      return [];
    }
  }

  /**
   * Get cached messages from Redis.
   */
  private async getCachedMessages(
    channelHandle: string,
    limit: number,
  ): Promise<RecentMessageDto[] | null> {
    try {
      const redis = this.redisService.getPubClient();
      const cacheKey = `${this.MESSAGES_CACHE_KEY_PREFIX}${channelHandle}:${limit}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached) as RecentMessageDto[];
      }

      return null;
    } catch (error: any) {
      this.logger.error(
        `Error reading messages from cache for channel ${channelHandle}:`,
        error?.message || error,
      );
      return null;
    }
  }

  /**
   * Cache messages in Redis with TTL.
   */
  private async cacheMessages(
    channelHandle: string,
    limit: number,
    messages: RecentMessageDto[],
  ): Promise<void> {
    try {
      const redis = this.redisService.getPubClient();
      const cacheKey = `${this.MESSAGES_CACHE_KEY_PREFIX}${channelHandle}:${limit}`;
      await redis.setex(
        cacheKey,
        this.MESSAGES_CACHE_TTL,
        JSON.stringify(messages),
      );
      this.logger.log(
        `Cached Telegram messages for channel ${channelHandle} (limit: ${limit}, TTL: ${this.MESSAGES_CACHE_TTL}s)`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error writing messages to cache for channel ${channelHandle}:`,
        error?.message || error,
      );
      // Non-blocking - continue even if cache write fails
    }
  }

  async initiatePayment(
    channelHandle: string,
    dto: FanPaymentRequestDto,
  ): Promise<FanPaymentResponseDto> {
    // 1. Validate channel exists and is verified
    const telegramChannel = await this.telegramChannelRepo.findOne({
      where: {
        channelHandle: channelHandle.toLowerCase(),
        coAdminAdded: true, // Only accept payments for verified channels
      },
      relations: ['youtubeChannel'],
    });

    if (!telegramChannel) {
      throw new NotFoundException(
        `Channel "${channelHandle}" not found or not ready for payments`,
      );
    }

    // 2. Verify bot can access the channel before accepting payment
    const canAccessChannel =
      await this.telegramService.verifyChannelAccess(channelHandle);

    if (!canAccessChannel) {
      this.logger.warn(
        `Payment rejected for channel ${channelHandle}: bot cannot access channel`,
      );
      throw new BadRequestException(
        `Channel "${channelHandle}" is currently unavailable for payments. The creator may need to re-add the bot.`,
      );
    }

    // 2.5. Idempotency check: look for existing transaction with same key
    const existingTransaction = await this.transactionRepo.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
      relations: ['status'],
    });

    if (existingTransaction) {
      const statusCode = existingTransaction.status.code;

      if (
        statusCode === 'pending' ||
        statusCode === 'processing' ||
        statusCode === 'succeeded'
      ) {
        this.logger.log(
          `Idempotent replay: idempotencyKey=${dto.idempotencyKey} ` +
            `matched existing transaction ${existingTransaction.id} (status: ${statusCode})`,
        );
        return {
          depositId: existingTransaction.depositId!,
          fanSessionId: existingTransaction.fanSessionId!,
          transactionId: existingTransaction.id,
          status: statusCode,
          channelHandle: telegramChannel.channelHandle,
        };
      }

      // Terminal failed status (failed/rejected) — allow retry by clearing key on old row
      this.logger.log(
        `Clearing idempotencyKey on failed transaction ${existingTransaction.id} ` +
          `(status: ${statusCode}) to allow retry with key ${dto.idempotencyKey}`,
      );
      await this.transactionRepo.update(existingTransaction.id, {
        idempotencyKey: null,
      });
    }

    // 3. Generate IDs
    const depositId = randomUUID();
    const fanSessionId = randomUUID();

    // 4. Look up currency
    const currency = await this.currencyRepo.findOne({
      where: { shortCode: dto.currency.toUpperCase() },
    });

    if (!currency) {
      throw new NotFoundException(`Currency "${dto.currency}" not found`);
    }

    // 5. Get provider info to determine country code
    const allProviders = await this.providerCacheService.getProviders();
    const paymentProvider = allProviders.find(
      (p) => p.name === dto.correspondent,
    );

    if (!paymentProvider) {
      throw new NotFoundException(
        `Payment provider "${dto.correspondent}" not found`,
      );
    }

    // 6. Get country-based price
    const countryPrice = await this.countryPriceService.getPrice(
      paymentProvider.countryCode,
      currency.shortCode,
    );

    if (countryPrice === null) {
      throw new BadRequestException(
        `Payments in ${currency.shortCode} for ${paymentProvider.countryCode} are not enabled at this time. Price not configured.`,
      );
    }

    // 7. Calculate actual amount (before validation)
    // Round to whole number - most providers (especially mobile money) don't support decimals
    const numericAmount = Math.round(countryPrice * dto.priceMultiple);
    const calculatedAmount = numericAmount.toString();

    // 8. Validate payment operator (availability, currency, limits)
    const validation = await this.paymentCountryService.validatePaymentOperator(
      dto.correspondent,
      currency,
      numericAmount,
      paymentProvider.countryCode,
    );

    if (!validation.isValid) {
      const { code, message, details } = validation.error!;

      // Map error codes to user-friendly messages
      switch (code) {
        case 'OPERATOR_NOT_FOUND':
          throw new NotFoundException(
            `Payment provider "${dto.correspondent}" not found`,
          );

        case 'CURRENCY_MISMATCH':
          throw new BadRequestException(
            `Payment provider ${dto.correspondent} does not support currency ${currency.shortCode}. ` +
              `Provider supports: ${details!.providerCurrency}`,
          );

        case 'OPERATOR_UNAVAILABLE':
          throw new BadRequestException(
            `Payment operator "${dto.correspondent}" is currently unavailable (status: CLOSED). ` +
              `Please try a different payment method or check back later.`,
          );

        case 'AMOUNT_BELOW_MINIMUM':
          throw new BadRequestException(
            `Payment amount ${calculatedAmount} ${currency.shortCode} is below the minimum ` +
              `of ${details!.minPrice} ${currency.shortCode} for operator ${dto.correspondent}. ` +
              `Please increase your payment amount.`,
          );

        case 'AMOUNT_ABOVE_MAXIMUM':
          throw new BadRequestException(
            `Payment amount ${calculatedAmount} ${currency.shortCode} exceeds the maximum ` +
              `of ${details!.maxPrice} ${currency.shortCode} for operator ${dto.correspondent}. ` +
              `Please reduce your payment amount.`,
          );

        case 'MULTIPLE_EXCEEDS_LIMIT':
          throw new BadRequestException(
            `Price multiple of ${dto.priceMultiple} exceeds the maximum allowed multiple ` +
              `of ${details!.maxMultiple} for operator ${dto.correspondent}. ` +
              `Maximum amount: ${details!.maxPrice} ${currency.shortCode}.`,
          );

        case 'AVAILABILITY_UNKNOWN':
          this.logger.error(
            `Cannot determine availability for operator ${dto.correspondent}. ` +
              `PawaPay API may be unreachable.`,
          );
          throw new BadRequestException(
            `Unable to process payment at this time. Please try again later.`,
          );

        case 'PRICE_NOT_CONFIGURED':
          throw new BadRequestException(
            `Payments in ${currency.shortCode} are not enabled at this time. Price not configured.`,
          );

        default:
          this.logger.error(
            `Unexpected validation error for operator ${dto.correspondent}: ${message}`,
          );
          throw new BadRequestException(message);
      }
    }

    // Log successful validation
    this.logger.log(
      `Validated payment: operator=${dto.correspondent}, ` +
        `status=${validation.operator!.status}, ` +
        `amount=${calculatedAmount} ${currency.shortCode}, ` +
        `price=${validation.operator!.price}, ` +
        `maxMultiple=${validation.operator!.maxMultiple}`,
    );

    // 9. Get pending status
    const pendingStatus = await this.transactionStatusRepo.findOne({
      where: { code: 'pending' },
    });

    if (!pendingStatus) {
      throw new Error('Transaction status "pending" not found in database');
    }

    // 9.5. Parse YouTube video ID from URL (if provided)
    let youtubeVideoId: string | null = null;
    if (dto.youtubeUrl) {
      const videoIdMatch = dto.youtubeUrl.match(
        /(?:v=|youtu\.be\/|live\/|embed\/)([a-zA-Z0-9_-]{11})/,
      );
      youtubeVideoId = videoIdMatch?.[1] || null;
      if (youtubeVideoId) {
        this.logger.log(
          `Extracted YouTube video ID ${youtubeVideoId} from URL ${dto.youtubeUrl}`,
        );
      } else {
        this.logger.warn(
          `Could not extract video ID from YouTube URL: ${dto.youtubeUrl}`,
        );
      }
    }

    // Create pending transaction with denormalized provider fields
    const transaction = this.transactionRepo.create({
      depositId,
      fanSessionId,
      idempotencyKey: dto.idempotencyKey,
      amount: calculatedAmount,
      currency,
      messageContent: dto.messageContent,
      subject: dto.subject ?? null,
      messageType: dto.messageType ?? null,
      payerFullName: dto.payerFullName,
      payerPhone: dto.payerPhone,
      youtubeChannel: telegramChannel.youtubeChannel,
      providerName: paymentProvider.name,
      providerCountryCode: paymentProvider.countryCode,
      status: pendingStatus,
      messageDeliveryStatus: 'pending',
      messageDeliveryAttempts: 0,
      messageId: '', // Will be filled after Telegram delivery
      multiplier: dto.priceMultiple,
      // Referral tracking (optional)
      referralSource: dto.referralSource ?? null,
      referralMedium: dto.referralMedium ?? null,
      referralCampaign: dto.referralCampaign ?? null,
      // YouTube tracking (optional)
      youtubeVideoId,
      youtubeLiveChatId: dto.youtubeLiveChatId ?? null,
    });

    try {
      await this.transactionRepo.save(transaction);
    } catch (error) {
      // Handle unique constraint violation race condition
      // (two concurrent requests with same idempotencyKey)
      if (
        error instanceof QueryFailedError &&
        (error as any).code === '23505'
      ) {
        this.logger.warn(
          `Idempotency race condition caught for key ${dto.idempotencyKey}, ` +
            `re-querying existing transaction`,
        );
        const raceWinner = await this.transactionRepo.findOne({
          where: { idempotencyKey: dto.idempotencyKey },
          relations: ['status'],
        });

        if (raceWinner) {
          return {
            depositId: raceWinner.depositId!,
            fanSessionId: raceWinner.fanSessionId!,
            transactionId: raceWinner.id,
            status: raceWinner.status.code,
            channelHandle: telegramChannel.channelHandle,
          };
        }
      }
      throw error;
    }

    this.logger.log(
      `Created pending transaction ${transaction.id} for channel ${channelHandle} ` +
        `with depositId ${depositId}, amount ${calculatedAmount} ${currency.shortCode} ` +
        `(${dto.priceMultiple}x base price of ${countryPrice})`,
    );

    // 11. Initiate PawaPay deposit (v2 API)
    try {
      await this.pawapayService.createDeposit({
        depositId,
        payer: {
          type: 'MMO',
          accountDetails: {
            phoneNumber: dto.payerPhone.replace('+', ''),
            provider: dto.correspondent,
          },
        },
        amount: calculatedAmount,
        currency: dto.currency,
        clientReferenceId: transaction.id,
        // Truncate to 22 chars max (PawaPay requirement: 4-22 alphanumeric + spaces only)
        // Remove @ symbol and any other non-alphanumeric characters (except spaces)
        customerMessage:
          `Msg ${channelHandle.replace(/[^a-zA-Z0-9\s]/g, '')}`.slice(0, 22),
        metadata: [
          {
            transactionId: transaction.id,
            isPII: false,
          },
          {
            channelHandle: channelHandle,
            isPII: false,
          },
          ...(dto.messageType
            ? [
                {
                  messageType: dto.messageType,
                  isPII: false,
                },
              ]
            : []),
          // Include referral tracking if provided
          ...(dto.referralSource
            ? [
                {
                  referralSource: dto.referralSource,
                  isPII: false,
                },
              ]
            : []),
          ...(dto.referralMedium
            ? [
                {
                  referralMedium: dto.referralMedium,
                  isPII: false,
                },
              ]
            : []),
          ...(dto.referralCampaign
            ? [
                {
                  referralCampaign: dto.referralCampaign,
                  isPII: false,
                },
              ]
            : []),
        ],
      });

      this.logger.log(
        `Initiated PawaPay deposit ${depositId} for transaction ${transaction.id}`,
      );
    } catch (error) {
      // Handle business-level rejections from PawaPay
      if (error instanceof PawapayRejectionException) {
        // PawaPay explicitly rejected the transaction (wrong phone, insufficient funds, etc.)
        const rejectedStatus = await this.transactionStatusRepo.findOne({
          where: { code: 'rejected' },
        });

        if (!rejectedStatus) {
          throw new Error(
            'Transaction status "rejected" not found in database',
            { cause: error },
          );
        }

        await this.transactionRepo.update(transaction.id, {
          status: rejectedStatus,
        });

        this.logger.warn(
          `Transaction ${transaction.id} rejected by PawaPay: ${JSON.stringify(error.rejectionReason)}`,
        );

        throw error; // Re-throw to return error to client
      }

      // Handle duplicate submissions
      if (error instanceof PawapayDuplicateException) {
        // Transaction was already submitted (duplicate depositId)
        // Keep status as pending since the original request is still processing
        this.logger.warn(
          `Transaction ${transaction.id} ignored by PawaPay as duplicate (depositId: ${depositId})`,
        );
        throw error; // Re-throw to return error to client
      }

      // Handle all other errors (network failures, timeouts, 5xx errors, etc.)
      const failedStatus = await this.transactionStatusRepo.findOne({
        where: { code: 'failed' },
      });

      if (!failedStatus) {
        throw new Error('Transaction status "failed" not found in database', {
          cause: error,
        });
      }

      await this.transactionRepo.update(transaction.id, {
        status: failedStatus,
      });

      this.logger.error(
        `Failed to initiate PawaPay deposit for transaction ${transaction.id}:`,
        error,
      );
      throw error;
    }

    // 8. Return response
    return {
      depositId,
      fanSessionId,
      transactionId: transaction.id,
      status: 'pending',
      channelHandle: telegramChannel.channelHandle,
    };
  }
}
