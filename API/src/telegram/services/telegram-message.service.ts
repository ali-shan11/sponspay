import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { TelegramChannel } from '../../creator/entities/telegram-channel.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { RedisService } from '../../redis/redis.service';
import { TelegramConfig } from '../config/telegram.config';
import { TelegramNotificationService } from './telegram-notification.service';
import { TelegramAdapterService } from '../telegram-adapter.service';

/**
 * Handles message delivery, fetching, and reply checking for Telegram channels.
 * All GramJS operations are delegated to the Telegram adapter microservice via HTTP.
 */
@Injectable()
export class TelegramMessageService {
  private readonly logger = new Logger(TelegramMessageService.name);

  constructor(
    private readonly adapter: TelegramAdapterService,
    private readonly dataSource: DataSource,
    private readonly notificationService: TelegramNotificationService,
    private readonly redisService: RedisService,
    private readonly telegramConfig: TelegramConfig,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Deliver a fan message to the Telegram channel (single attempt).
   * Handles formatting, sending via adapter, DB updates, and WebSocket notification.
   * Designed to be called from BullMQ processor which handles retries.
   *
   * @param transaction - Transaction with youtubeChannel.telegramChannel and currency loaded
   * @param attemptNumber - Current attempt number (for DB tracking)
   * @throws Error on delivery failure (BullMQ will retry)
   */
  async deliver(
    transaction: Transaction,
    attemptNumber: number,
  ): Promise<void> {
    this.logger.log(
      `Message delivery attempt ${attemptNumber} for transaction ${transaction.id}`,
    );

    // TEST MODE: Simulate delivery failure
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (
      nodeEnv !== 'production' &&
      transaction.subject &&
      transaction.subject.trim().toLowerCase() === 'refund me'
    ) {
      this.logger.warn(
        `TEST MODE: Simulated message delivery failure for transaction ${transaction.id}`,
      );
      throw new Error(
        'TEST MODE: Simulated message delivery failure triggered by subject "Refund me"',
      );
    }

    const channel = transaction.youtubeChannel?.telegramChannel;
    if (!channel) {
      throw new Error(
        `No Telegram channel found for transaction ${transaction.id}`,
      );
    }

    const messageText = this.formatFanMessage(
      transaction.payerFullName,
      transaction.messageContent || '',
      transaction.amount,
      transaction.currency.shortCode,
      transaction.subject,
    );

    const result = await this.adapter.sendMessage(
      channel.channelHandle,
      messageText,
      channel.channelId,
    );

    // Update transaction with success
    await this.dataSource.getRepository(Transaction).update(transaction.id, {
      messageId: result.messageId,
      messageDeliveryStatus: 'delivered',
      messageDeliveredAt: new Date(),
      messageDeliveryAttempts: attemptNumber,
    });

    this.logger.log(
      `Successfully delivered message for transaction ${transaction.id} on attempt ${attemptNumber}`,
    );

    if (transaction.fanSessionId) {
      this.notificationService.notifyMessageDelivery(transaction.fanSessionId, {
        status: 'delivered',
        messageId: result.messageId || null,
      });
    }
  }

  /**
   * Handle permanent delivery failure: update DB status, notify fan, log error.
   * Called by the processor when all BullMQ retries are exhausted.
   */
  async handleDeliveryFailure(
    transactionId: string,
    attemptCount: number,
    errorMessage: string,
  ): Promise<void> {
    this.logger.error(
      `Message delivery permanently failed for transaction ${transactionId} after ${attemptCount} attempts: ${errorMessage}`,
    );

    await this.dataSource.getRepository(Transaction).update(transactionId, {
      messageDeliveryStatus: 'failed',
      messageDeliveryAttempts: attemptCount,
      messageDeliveryError: errorMessage,
    });

    const transaction = await this.dataSource
      .getRepository(Transaction)
      .findOne({ where: { id: transactionId } });

    if (transaction?.fanSessionId) {
      this.notificationService.notifyMessageDelivery(transaction.fanSessionId, {
        status: 'failed',
        messageId: null,
        error: errorMessage,
        refunded: true,
      });
    }
  }

  async fetchChannelMessages(
    channelHandle: string,
    limit: number = 5,
  ): Promise<
    Array<{
      payerFullName: string;
      content: string;
      timestamp: string;
      senderType: 'creator' | 'paid';
      telegramMessageId: string | null;
      replyToMessageId: string | null;
      subject: string | null;
      amount: string | null;
      youtubeVideoId: string | null;
      youtubeVideoTitle: string | null;
    }>
  > {
    try {
      const channel = await this.dataSource
        .getRepository(TelegramChannel)
        .findOne({
          where: { channelHandle: channelHandle.toLowerCase() },
        });

      if (!channel || !channel.channelId) {
        this.logger.warn(
          `Channel ${channelHandle} not found or not configured`,
        );
        return [];
      }

      // Fetch via adapter (fetch 3x to account for filtering)
      const historyResult = await this.adapter.fetchMessages(
        channel.channelHandle,
        limit * 3,
        channel.channelId,
      );

      const messages: Array<{
        payerFullName: string;
        content: string;
        timestamp: string;
        senderType: 'creator' | 'paid';
        telegramMessageId: string | null;
        replyToMessageId: string | null;
        subject: string | null;
        amount: string | null;
        youtubeVideoId: string | null;
        youtubeVideoTitle: string | null;
      }> = [];

      for (const msg of historyResult.messages) {
        if (
          !msg.message ||
          typeof msg.message !== 'string' ||
          msg.message.trim().length === 0
        ) {
          continue;
        }

        const isPaidMessage = msg.message.startsWith('💬');
        const senderType: 'creator' | 'paid' = isPaidMessage
          ? 'paid'
          : 'creator';

        const parsed = this.parseMessagePayload(msg.message, senderType);

        const timestamp = msg.date
          ? new Date(msg.date * 1000).toISOString()
          : new Date().toISOString();

        const telegramMessageId = msg.id ? String(msg.id) : null;
        const replyToMessageId =
          msg.replyTo && typeof msg.replyTo === 'object'
            ? msg.replyTo.replyToMsgId
              ? String(msg.replyTo.replyToMsgId)
              : null
            : null;

        messages.push({
          payerFullName: parsed.senderName,
          content: parsed.content,
          timestamp,
          senderType,
          telegramMessageId,
          replyToMessageId,
          subject: parsed.subject,
          amount: parsed.amount,
          youtubeVideoId: null,
          youtubeVideoTitle: null,
        });

        if (messages.length >= limit) break;
      }

      this.logger.log(
        `Fetched ${messages.length} messages from channel ${channelHandle}`,
      );

      return messages;
    } catch (error: any) {
      this.logger.error(
        `Error fetching messages from channel ${channelHandle}:`,
        error?.message || error,
      );
      return [];
    }
  }

  /**
   * Parse a raw Telegram message string into structured fields.
   * Strips the "Sent via SponsPay" footer. For paid messages, extracts
   * the fan name, amount, subject, and quoted message body.
   */
  parseMessagePayload(
    raw: string,
    senderType: 'creator' | 'paid',
  ): {
    senderName: string;
    content: string;
    subject: string | null;
    amount: string | null;
  } {
    const stripped = raw.replace(/\s*---\s*Sent via SponsPay\s*$/s, '').trim();

    if (senderType === 'creator') {
      return {
        senderName: 'Creator',
        content: stripped,
        subject: null,
        amount: null,
      };
    }

    // Legacy format (try first — more specific prefix):
    //   💬 New Fan Message
    //   From: <name>
    //   Amount: <amount> <currency>
    //   Subject: <subject>
    //
    //   "<body>"
    const legacy = stripped.match(
      /^💬\s*New Fan Message\s+From:\s*([^\n]+?)(?:\s+Amount:\s*([\d,.]+\s+[A-Za-z]{3,5}))?(?:\s+Subject:\s*([^\n]+?))?(?:\s+"([\s\S]*?)")?\s*$/,
    );
    if (legacy) {
      const [, name, amount, subject, body] = legacy;
      return {
        senderName: (name || 'Anonymous').trim(),
        content: (body || '').trim(),
        subject: subject ? subject.trim() : null,
        amount: amount ? amount.trim() : null,
      };
    }

    // Compact format (current production):
    //   💬 <name> sent <amount> <currency>
    //   Subject: <subject>
    //
    //   "<body>"
    const compact = stripped.match(
      /^💬\s*([^\n]+?)\s+sent\s+([\d,.]+\s+[A-Za-z]{3,5})(?:\s+Subject:\s*([^\n]+?))?(?:\s+"([\s\S]*?)")?\s*$/,
    );
    if (compact) {
      const [, name, amount, subject, body] = compact;
      return {
        senderName: (name || 'Anonymous').trim(),
        content: (body || '').trim(),
        subject: subject ? subject.trim() : null,
        amount: amount ? amount.trim() : null,
      };
    }

    // Unknown paid format — fall back to showing the whole payload minus the footer
    return {
      senderName: 'Anonymous',
      content: stripped,
      subject: null,
      amount: null,
    };
  }

  async checkMessagesForAdminReplies(
    channelHandle: string,
    messageIds: string[],
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    messageIds.forEach((id) => results.set(id, false));

    if (messageIds.length === 0) return results;

    try {
      // Check cache
      const redis = this.redisService.getPubClient();
      const uncachedIds: string[] = [];

      for (const msgId of messageIds) {
        const cachedKey = `reply-check:${channelHandle}:${msgId}`;
        const cached = await redis.get(cachedKey);
        if (cached !== null) {
          results.set(msgId, cached === 'true');
        } else {
          uncachedIds.push(msgId);
        }
      }

      if (uncachedIds.length === 0) {
        this.logger.log(
          `All ${messageIds.length} reply checks served from cache`,
        );
        return results;
      }

      // Find channel
      const channel = await this.dataSource
        .getRepository(TelegramChannel)
        .findOne({
          where: { channelHandle: channelHandle.toLowerCase() },
        });

      if (!channel?.channelId) {
        this.logger.warn(`Channel ${channelHandle} not found`);
        return results;
      }

      // Fetch history via adapter
      const historyResult = await this.adapter.fetchMessages(
        channel.channelHandle,
        this.telegramConfig.maxHistoryFetchLimit,
        channel.channelId,
      );

      // Check for replies
      for (const msg of historyResult.messages) {
        if (msg.replyTo) {
          const replyToMsgId =
            'replyToMsgId' in msg.replyTo
              ? msg.replyTo.replyToMsgId?.toString()
              : null;

          if (replyToMsgId && uncachedIds.includes(replyToMsgId)) {
            results.set(replyToMsgId, true);
          }
        }
      }

      // Cache only positive results (has reply) — negative results should
      // always be re-checked so replies are detected promptly
      const cacheTTL = this.telegramConfig.replyCacheTTL;
      for (const msgId of uncachedIds) {
        const hasReply = results.get(msgId) || false;
        if (hasReply) {
          const cachedKey = `reply-check:${channelHandle}:${msgId}`;
          await redis.set(cachedKey, 'true', 'EX', cacheTTL);
        }
      }

      this.logger.log(
        `Batch checked ${messageIds.length} messages (${uncachedIds.length} uncached) in channel ${channelHandle}`,
      );

      return results;
    } catch (error: any) {
      this.logger.error(
        `Error batch checking replies in channel ${channelHandle}:`,
        error?.message || error,
      );
      return results;
    }
  }

  async replyToMessage(
    channelHandle: string,
    text: string,
    messageId: string,
  ): Promise<{ messageId: string; success: boolean }> {
    const channel = await this.dataSource
      .getRepository(TelegramChannel)
      .findOne({
        where: { channelHandle: channelHandle.toLowerCase() },
      });

    const formattedText = `${text}\n\n---\nSent via SponsPay`;

    const result = await this.adapter.replyToMessage(
      channelHandle,
      formattedText,
      messageId,
      channel?.channelId,
    );

    // Invalidate the reply-check cache for this message
    try {
      const redis = this.redisService.getPubClient();
      await redis.del(`reply-check:${channelHandle}:${messageId}`);
    } catch (error: any) {
      this.logger.warn(
        `Failed to invalidate reply cache for ${channelHandle}:${messageId}: ${error?.message}`,
      );
    }

    return result;
  }

  formatFanMessage(
    fanName: string,
    messageContent: string,
    amount: string,
    currency: string,
    subject?: string | null,
  ): string {
    const subjectLine = subject ? `\nSubject: <i>${subject}</i>\n` : '\n';

    return `💬 <b>${fanName}</b> sent <b>${amount} ${currency}</b>${subjectLine}
"${messageContent}"

---
Sent via SponsPay`.trim();
  }
}
