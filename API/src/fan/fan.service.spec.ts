import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { FanService } from './fan.service';
import { LinkClick } from '../link-click/entities/link-click.entity';
import { TelegramChannel } from '../creator/entities/telegram-channel.entity';
import { YouTubeChannel } from '../creator/entities/youtube-channel.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { TransactionStatus } from '../transaction/entities/transaction-status.entity';
import { Currency } from '../transaction/entities/currency.entity';
import { YouTubeApiService } from './youtube/youtube-api.service';
import { PawapayService } from '../pawapay/pawapay.service';
import {
  PawapayRejectionException,
  PawapayDuplicateException,
} from '../pawapay/pawapay.exceptions';
import { TelegramService } from '../telegram/telegram.service';
import { RedisService } from '../redis/redis.service';
import { MessageType } from '../transaction/entities/message-type.enum';
import { FanPaymentRequestDto } from './dto/fan-payment-request.dto';
import { ProviderCacheService } from '../pawapay/provider-cache.service';
import { PaymentCountryService } from '../pawapay/payment-country.service';
import { CountryPriceService } from '../transaction/services/country-price.service';
import { Provider } from '../pawapay/interfaces/provider.interface';

describe('FanService', () => {
  let service: FanService;
  let telegramRepo: jest.Mocked<Repository<TelegramChannel>>;
  let youtubeRepo: jest.Mocked<Repository<YouTubeChannel>>;
  let transactionRepo: jest.Mocked<Repository<Transaction>>;
  let transactionStatusRepo: jest.Mocked<Repository<TransactionStatus>>;
  let currencyRepo: jest.Mocked<Repository<Currency>>;
  let providerCacheService: jest.Mocked<ProviderCacheService>;
  let paymentCountryService: jest.Mocked<PaymentCountryService>;
  let countryPriceService: jest.Mocked<CountryPriceService>;
  let youtubeApiService: jest.Mocked<YouTubeApiService>;
  let pawapayService: jest.Mocked<PawapayService>;
  let telegramService: jest.Mocked<TelegramService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    telegramRepo = {
      findOne: jest.fn(),
    } as any;

    youtubeRepo = {
      findOne: jest.fn(),
    } as any;

    transactionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any;

    transactionStatusRepo = {
      findOne: jest.fn(),
    } as any;

    currencyRepo = {
      findOne: jest.fn(),
    } as any;

    providerCacheService = {
      getProviders: jest.fn(),
      getProvidersByCountry: jest.fn(),
      validateProvider: jest.fn(),
      clearCache: jest.fn(),
    } as any;

    paymentCountryService = {
      getPaymentCountries: jest.fn().mockResolvedValue([]),
      clearCache: jest.fn(),
      validatePaymentOperator: jest.fn(),
    } as any;

    countryPriceService = {
      getPrice: jest.fn().mockResolvedValue(10),
      getAllPricesAsMap: jest
        .fn()
        .mockResolvedValue(new Map([['ZMB:ZMW', 10]])),
    } as any;

    youtubeApiService = {
      getVideoInfo: jest.fn(),
      getVideoTitles: jest.fn().mockResolvedValue(new Map<string, string>()),
    } as any;

    pawapayService = {
      createDeposit: jest.fn(),
      createRefund: jest.fn(),
    } as any;

    telegramService = {
      verifyChannelAccess: jest.fn().mockResolvedValue(true),
      sendMessageToChannel: jest.fn(),
      fetchChannelMessages: jest.fn().mockResolvedValue([
        {
          payerFullName: 'Test Fan',
          content: 'Test message',
          timestamp: '2025-01-01T00:00:00.000Z',
          senderType: 'paid',
          telegramMessageId: null,
          replyToMessageId: null,
          subject: null,
          amount: null,
          youtubeVideoId: null,
          youtubeVideoTitle: null,
        },
      ]),
      getFanInviteLink: jest.fn().mockResolvedValue('https://t.me/+test'),
    } as any;

    redisService = {
      getPubClient: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue('OK'),
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FanService,
        {
          provide: getRepositoryToken(LinkClick),
          useValue: { save: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: getRepositoryToken(TelegramChannel),
          useValue: telegramRepo,
        },
        { provide: getRepositoryToken(YouTubeChannel), useValue: youtubeRepo },
        { provide: getRepositoryToken(Transaction), useValue: transactionRepo },
        {
          provide: getRepositoryToken(TransactionStatus),
          useValue: transactionStatusRepo,
        },
        { provide: getRepositoryToken(Currency), useValue: currencyRepo },
        { provide: ProviderCacheService, useValue: providerCacheService },
        { provide: PaymentCountryService, useValue: paymentCountryService },
        { provide: CountryPriceService, useValue: countryPriceService },
        { provide: YouTubeApiService, useValue: youtubeApiService },
        { provide: PawapayService, useValue: pawapayService },
        { provide: TelegramService, useValue: telegramService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<FanService>(FanService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws NotFoundException when channel handle does not exist', async () => {
    telegramRepo.findOne.mockResolvedValue(null);

    await expect(service.getChannelInfo('missing')).rejects.toThrow(
      NotFoundException,
    );

    expect(telegramRepo.findOne).toHaveBeenCalledWith({
      where: { channelHandle: 'missing' },
      relations: [
        'youtubeChannel',
        'youtubeChannel.userChannels',
        'youtubeChannel.userChannels.user',
      ],
    });
  });

  it('returns youtubeEmbed null and recentMessages when no youtube channel exists', async () => {
    const mockTelegram = {
      channelHandle: 'mychannel',
      youtubeChannel: null,
    } as any;

    telegramRepo.findOne.mockResolvedValue(mockTelegram);
    telegramService.fetchChannelMessages.mockResolvedValue([]);

    const res = await service.getChannelInfo('MyChannel');

    expect(res.channelHandle).toEqual('mychannel');
    expect(res.creatorName).toEqual('mychannel');
    expect(res.youtubeEmbed).toBeNull();
    expect(res.recentMessages).toEqual([]);
    expect(telegramService.fetchChannelMessages).toHaveBeenCalledWith(
      'mychannel',
      5,
    );
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining('No YouTube channel found for Telegram channel'),
    );
  });

  it('returns youtubeEmbed when youtube channel exists and maps recent messages', async () => {
    const mockTelegram = {
      channelHandle: 'myawesomechannel',
      youtubeChannel: {
        id: 'yt-1',
        channelId: 'UC_TEST_CHANNEL',
        channelName: 'Test Channel',
        feePercentage: '15.00',
        userChannels: [
          {
            role: 'owner',
            user: { displayName: 'Scott D.' },
          },
        ],
      },
    } as any;

    const now = new Date();
    const mockMessages = [
      {
        payerFullName: 'John Doe',
        content: 'Hello world',
        timestamp: now.toISOString(),
        senderType: 'paid' as const,
        telegramMessageId: null,
        replyToMessageId: null,
        subject: null,
        amount: null,
        youtubeVideoId: null,
        youtubeVideoTitle: null,
      },
    ];

    const mockVideoInfo = {
      embedUrl: 'https://www.youtube.com/embed/vid',
      isLiveStream: false,
      title: 'Test Video',
      description: 'Desc',
      thumbnailUrl: 'https://thumb',
    } as any;

    telegramRepo.findOne.mockResolvedValue(mockTelegram);
    youtubeApiService.getVideoInfo.mockResolvedValue(mockVideoInfo);
    telegramService.fetchChannelMessages.mockResolvedValue(mockMessages);

    const res = await service.getChannelInfo('myawesomechannel');

    expect(res.creatorName).toEqual('Scott D.');
    expect(youtubeApiService.getVideoInfo).toHaveBeenCalledWith(
      'UC_TEST_CHANNEL',
    );
    expect(res.youtubeEmbed).toEqual({
      channelName: 'Test Channel',
      embedUrl: mockVideoInfo.embedUrl,
      isLiveStream: mockVideoInfo.isLiveStream,
      title: mockVideoInfo.title,
      description: mockVideoInfo.description,
      thumbnailUrl: mockVideoInfo.thumbnailUrl,
    });

    expect(telegramService.fetchChannelMessages).toHaveBeenCalledWith(
      'myawesomechannel',
      5,
    );
    expect(res.recentMessages).toHaveLength(1);
    expect(res.recentMessages[0].payerFullName).toEqual('John Doe');
    expect(res.recentMessages[0].content).toEqual('Hello world');
    expect(res.recentMessages[0].timestamp).toEqual(now.toISOString());
    expect(res.recentMessages[0].senderType).toEqual('paid');
  });

  it('should include invite link in channel info when available', async () => {
    const mockTelegram = {
      channelHandle: 'testchannel',
      youtubeChannel: null,
    } as any;

    telegramRepo.findOne.mockResolvedValue(mockTelegram);
    telegramService.fetchChannelMessages.mockResolvedValue([]);
    telegramService.getFanInviteLink = jest
      .fn()
      .mockResolvedValue('https://t.me/+TestInviteLink');

    const res = await service.getChannelInfo('testchannel');

    expect(res.inviteLink).toBe('https://t.me/+TestInviteLink');
    expect(telegramService.getFanInviteLink).toHaveBeenCalledWith(
      'testchannel',
    );
  });

  it('should handle invite link failure gracefully and return null', async () => {
    const mockTelegram = {
      channelHandle: 'testchannel',
      youtubeChannel: null,
    } as any;

    telegramRepo.findOne.mockResolvedValue(mockTelegram);
    telegramService.fetchChannelMessages.mockResolvedValue([]);
    telegramService.getFanInviteLink = jest
      .fn()
      .mockRejectedValue(new Error('API error'));

    const res = await service.getChannelInfo('testchannel');

    expect(res.inviteLink).toBeNull();
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to get fan invite link'),
      expect.any(String),
    );
  });

  it('should handle invite link returning null', async () => {
    const mockTelegram = {
      channelHandle: 'testchannel',
      youtubeChannel: null,
    } as any;

    telegramRepo.findOne.mockResolvedValue(mockTelegram);
    telegramService.fetchChannelMessages.mockResolvedValue([]);
    telegramService.getFanInviteLink = jest.fn().mockResolvedValue(null);

    const res = await service.getChannelInfo('testchannel');

    expect(res.inviteLink).toBeNull();
  });

  it('persists referral info on the LinkClick row', async () => {
    const mockTelegram = {
      channelHandle: 'testchannel',
      youtubeChannel: null,
    } as any;
    telegramRepo.findOne.mockResolvedValue(mockTelegram);
    telegramService.fetchChannelMessages.mockResolvedValue([]);

    const linkClickRepo: { save: jest.Mock } = (service as any).linkClickRepo;

    await service.getChannelInfo('testchannel', 5, {
      referralSource: 'youtube',
      referralMedium: 'social',
      referralCampaign: 'launch',
      referrerUrl: 'https://www.youtube.com/watch?v=abc',
      referrerNetwork: 'youtube',
    });

    // Give the fire-and-forget a microtask to flush
    await Promise.resolve();

    expect(linkClickRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        telegramChannel: mockTelegram,
        referralSource: 'youtube',
        referralMedium: 'social',
        referralCampaign: 'launch',
        referrerUrl: 'https://www.youtube.com/watch?v=abc',
        referrerNetwork: 'youtube',
      }),
    );
  });

  it('tags paid messages with youtubeVideoId + title via Transaction join', async () => {
    const mockTelegram = {
      channelHandle: 'testchannel',
      youtubeChannel: null,
    } as any;
    telegramRepo.findOne.mockResolvedValue(mockTelegram);

    telegramService.fetchChannelMessages.mockResolvedValue([
      {
        payerFullName: 'Filip',
        content: 'Great stream!',
        timestamp: '2025-01-01T00:00:00.000Z',
        senderType: 'paid',
        telegramMessageId: '1001',
        replyToMessageId: null,
        subject: 'Shoutout',
        amount: '7500.00 XOF',
        youtubeVideoId: null,
        youtubeVideoTitle: null,
      },
      {
        payerFullName: 'Creator',
        content: 'Thanks everyone',
        timestamp: '2025-01-01T00:01:00.000Z',
        senderType: 'creator',
        telegramMessageId: '1002',
        replyToMessageId: '1001',
        subject: null,
        amount: null,
        youtubeVideoId: null,
        youtubeVideoTitle: null,
      },
    ] as any);

    transactionRepo.find.mockResolvedValue([
      { messageId: '1001', youtubeVideoId: 'abc123' } as any,
    ]);
    (youtubeApiService as any).getVideoTitles.mockResolvedValue(
      new Map([['abc123', 'Live Q&A Session']]),
    );

    const res = await service.getChannelInfo('testchannel');

    expect(res.recentMessages).toHaveLength(2);
    expect(res.recentMessages[0].youtubeVideoId).toBe('abc123');
    expect(res.recentMessages[0].youtubeVideoTitle).toBe('Live Q&A Session');
    // Creator reply has no video context
    expect(res.recentMessages[1].youtubeVideoId).toBeNull();
    expect(res.recentMessages[1].replyToMessageId).toBe('1001');
  });

  describe('initiatePayment', () => {
    const validPaymentDto: FanPaymentRequestDto = {
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      messageContent: 'Great stream!',
      messageType: MessageType.Livestream,
      payerFullName: 'John Doe',
      payerPhone: '+260971234567',
      priceMultiple: 5,
      currency: 'ZMW',
      correspondent: 'MTN_MOMO_ZMB',
    };

    const mockYoutubeChannel = {
      id: 'yt-channel-1',
      channelId: 'UC_TEST_CHANNEL',
      channelName: 'Test Channel',
      feePercentage: '15.00',
      userChannels: [
        {
          role: 'owner',
          user: {
            id: 'creator-123',
            firebaseUid: 'firebase-123',
          },
        },
      ],
    };

    const mockChannel = {
      channelHandle: 'testchannel',
      coAdminAdded: true,
      youtubeChannel: mockYoutubeChannel,
    } as any;

    const mockCurrency = {
      id: 'currency-1',
      shortCode: 'ZMW',
      code: 'ZMW',
      name: 'Zambian Kwacha',
      price: 10.0,
    } as any;

    const mockProvider: Provider = {
      name: 'MTN_MOMO_ZMB',
      country: 'Zambia',
      countryCode: 'ZMB',
      currency: 'ZMW',
      supportsDecimals: true,
      minDepositLimit: 10,
      maxDepositLimit: 10000,
    };

    const mockPendingStatus = {
      id: 'status-1',
      code: 'pending',
    } as any;

    beforeEach(() => {
      jest.clearAllMocks();

      // Default mock for validatePaymentOperator - can be overridden in specific tests
      paymentCountryService.validatePaymentOperator.mockResolvedValue({
        isValid: true,
        operator: {
          name: 'MTN_MOMO_ZMB',
          displayName: 'MTN MOMO ZMB',
          status: 'OPERATIONAL',
          price: 10,
          maxMultiple: 100,
        },
      });
    });

    it('should successfully initiate payment with valid data', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      paymentCountryService.validatePaymentOperator.mockResolvedValue({
        isValid: true,
        operator: {
          name: 'MTN_MOMO_ZMB',
          displayName: 'MTN MOMO ZMB',
          status: 'OPERATIONAL',
          price: 10,
          maxMultiple: 100,
        },
      });
      providerCacheService.getProviders.mockResolvedValue([mockProvider]);
      transactionStatusRepo.findOne.mockResolvedValue(mockPendingStatus);

      const mockTransaction = {
        id: 'tx-123',
        depositId: expect.any(String),
        fanSessionId: expect.any(String),
      } as any;

      transactionRepo.create.mockReturnValue(mockTransaction);
      transactionRepo.save.mockResolvedValue(mockTransaction);
      pawapayService.createDeposit.mockResolvedValue(undefined);

      // Act
      const result = await service.initiatePayment(
        'testchannel',
        validPaymentDto,
      );

      // Assert
      expect(result).toEqual({
        depositId: expect.any(String),
        fanSessionId: expect.any(String),
        transactionId: 'tx-123',
        status: 'pending',
        channelHandle: 'testchannel',
      });

      expect(telegramRepo.findOne).toHaveBeenCalledWith({
        where: { channelHandle: 'testchannel', coAdminAdded: true },
        relations: ['youtubeChannel'],
      });

      expect(telegramService.verifyChannelAccess).toHaveBeenCalledWith(
        'testchannel',
      );
      expect(currencyRepo.findOne).toHaveBeenCalledWith({
        where: { shortCode: 'ZMW' },
      });
      expect(providerCacheService.getProviders).toHaveBeenCalled();
      expect(transactionStatusRepo.findOne).toHaveBeenCalledWith({
        where: { code: 'pending' },
      });

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '50',
          messageContent: 'Great stream!',
          messageType: MessageType.Livestream,
          payerFullName: 'John Doe',
          payerPhone: '+260971234567',
          youtubeChannel: mockYoutubeChannel,
          currency: mockCurrency,
          providerName: mockProvider.name,
          providerCountryCode: mockProvider.countryCode,
          status: mockPendingStatus,
          messageDeliveryStatus: 'pending',
          messageDeliveryAttempts: 0,
          messageId: '',
          multiplier: 5,
        }),
      );

      expect(pawapayService.createDeposit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '50',
          currency: 'ZMW',
          payer: {
            type: 'MMO',
            accountDetails: {
              phoneNumber: '260971234567',
              provider: 'MTN_MOMO_ZMB',
            },
          },
          clientReferenceId: expect.any(String),
        }),
      );
    });

    it('should store referral tracking parameters when provided', async () => {
      // Arrange
      const dtoWithReferral: FanPaymentRequestDto = {
        ...validPaymentDto,
        referralSource: 'facebook',
        referralMedium: 'social',
        referralCampaign: 'summer_2025',
      };

      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      paymentCountryService.validatePaymentOperator.mockResolvedValue({
        isValid: true,
        operator: {
          name: 'MTN_MOMO_ZMB',
          displayName: 'MTN MOMO ZMB',
          status: 'OPERATIONAL',
          price: 10,
          maxMultiple: 100,
        },
      });
      providerCacheService.getProviders.mockResolvedValue([mockProvider]);
      transactionStatusRepo.findOne.mockResolvedValue(mockPendingStatus);

      const mockTransaction = {
        id: 'tx-123',
        depositId: expect.any(String),
        fanSessionId: expect.any(String),
      } as any;

      transactionRepo.create.mockReturnValue(mockTransaction);
      transactionRepo.save.mockResolvedValue(mockTransaction);
      pawapayService.createDeposit.mockResolvedValue(undefined);

      // Act
      await service.initiatePayment('testchannel', dtoWithReferral);

      // Assert - verify transaction created with referral data
      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          multiplier: 5,
          referralSource: 'facebook',
          referralMedium: 'social',
          referralCampaign: 'summer_2025',
        }),
      );

      // Assert - verify PawaPay metadata includes referral parameters
      expect(pawapayService.createDeposit).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.arrayContaining([
            {
              referralSource: 'facebook',
              isPII: false,
            },
            {
              referralMedium: 'social',
              isPII: false,
            },
            {
              referralCampaign: 'summer_2025',
              isPII: false,
            },
          ]),
        }),
      );
    });

    it('should handle missing referral parameters gracefully', async () => {
      // Arrange - use original validPaymentDto without referral fields
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      paymentCountryService.validatePaymentOperator.mockResolvedValue({
        isValid: true,
        operator: {
          name: 'MTN_MOMO_ZMB',
          displayName: 'MTN MOMO ZMB',
          status: 'OPERATIONAL',
          price: 10,
          maxMultiple: 100,
        },
      });
      providerCacheService.getProviders.mockResolvedValue([mockProvider]);
      transactionStatusRepo.findOne.mockResolvedValue(mockPendingStatus);

      const mockTransaction = {
        id: 'tx-123',
        depositId: expect.any(String),
        fanSessionId: expect.any(String),
      } as any;

      transactionRepo.create.mockReturnValue(mockTransaction);
      transactionRepo.save.mockResolvedValue(mockTransaction);
      pawapayService.createDeposit.mockResolvedValue(undefined);

      // Act
      await service.initiatePayment('testchannel', validPaymentDto);

      // Assert - verify transaction created with null referral fields
      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          multiplier: 5,
          referralSource: null,
          referralMedium: null,
          referralCampaign: null,
        }),
      );

      // Assert - verify PawaPay metadata does NOT include referral parameters
      const createDepositCall = pawapayService.createDeposit.mock.calls[0][0];
      const metadata = createDepositCall.metadata || [];
      const hasReferralSource = metadata.some(
        (m: any) => m.fieldName === 'referralSource',
      );
      const hasReferralMedium = metadata.some(
        (m: any) => m.fieldName === 'referralMedium',
      );
      const hasReferralCampaign = metadata.some(
        (m: any) => m.fieldName === 'referralCampaign',
      );

      expect(hasReferralSource).toBe(false);
      expect(hasReferralMedium).toBe(false);
      expect(hasReferralCampaign).toBe(false);
    });

    it('should throw NotFoundException when channel not found', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.initiatePayment('nonexistent', validPaymentDto),
      ).rejects.toThrow(NotFoundException);

      expect(telegramRepo.findOne).toHaveBeenCalledWith({
        where: { channelHandle: 'nonexistent', coAdminAdded: true },
        relations: ['youtubeChannel'],
      });
    });

    it('should throw NotFoundException when channel not verified (coAdminAdded=false)', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(null); // Will return null when coAdminAdded requirement not met

      // Act & Assert
      await expect(
        service.initiatePayment('unverified', validPaymentDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when bot cannot access channel', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.initiatePayment('testchannel', validPaymentDto),
      ).rejects.toThrow(BadRequestException);

      expect(telegramService.verifyChannelAccess).toHaveBeenCalledWith(
        'testchannel',
      );
    });

    it('should throw NotFoundException when currency not found', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.initiatePayment('testchannel', validPaymentDto),
      ).rejects.toThrow(NotFoundException);

      expect(currencyRepo.findOne).toHaveBeenCalledWith({
        where: { shortCode: 'ZMW' },
      });
    });

    it('should throw NotFoundException when payment provider not found', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      // Provider not found in cache - return empty array
      providerCacheService.getProviders.mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.initiatePayment('testchannel', validPaymentDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.initiatePayment('testchannel', validPaymentDto),
      ).rejects.toThrow('Payment provider "MTN_MOMO_ZMB" not found');
    });

    it('should mark transaction as failed when PawaPay call fails', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      providerCacheService.getProviders.mockResolvedValue([mockProvider]);
      transactionStatusRepo.findOne
        .mockResolvedValueOnce(mockPendingStatus)
        .mockResolvedValueOnce({ id: 'status-failed', code: 'failed' } as any);

      const mockTransaction = { id: 'tx-123' } as any;
      transactionRepo.create.mockReturnValue(mockTransaction);
      transactionRepo.save.mockResolvedValue(mockTransaction);

      const pawapayError = new Error('PawaPay service unavailable');
      pawapayService.createDeposit.mockRejectedValue(pawapayError);

      // Act & Assert
      await expect(
        service.initiatePayment('testchannel', validPaymentDto),
      ).rejects.toThrow('PawaPay service unavailable');

      expect(transactionRepo.update).toHaveBeenCalledWith('tx-123', {
        status: { id: 'status-failed', code: 'failed' },
      });
    });

    it('should mark transaction as rejected when PawaPay rejects the deposit', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      providerCacheService.getProviders.mockResolvedValue([mockProvider]);
      transactionStatusRepo.findOne
        .mockResolvedValueOnce(mockPendingStatus)
        .mockResolvedValueOnce({
          id: 'status-rejected',
          code: 'rejected',
        } as any);

      const mockTransaction = { id: 'tx-123' } as any;
      transactionRepo.create.mockReturnValue(mockTransaction);
      transactionRepo.save.mockResolvedValue(mockTransaction);

      const rejectionReason = {
        failureCode: 'WRONG_MSISDN',
        failureMessage: 'Invalid phone number',
      };
      const rejectionError = new PawapayRejectionException(
        'deposit',
        rejectionReason,
        'deposit-123',
      );
      pawapayService.createDeposit.mockRejectedValue(rejectionError);

      // Act & Assert
      await expect(
        service.initiatePayment('testchannel', validPaymentDto),
      ).rejects.toThrow(PawapayRejectionException);

      expect(transactionRepo.update).toHaveBeenCalledWith('tx-123', {
        status: { id: 'status-rejected', code: 'rejected' },
      });
    });

    it('should keep transaction as pending when PawaPay ignores duplicate deposit', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      providerCacheService.getProviders.mockResolvedValue([mockProvider]);
      transactionStatusRepo.findOne.mockResolvedValueOnce(mockPendingStatus);

      const mockTransaction = { id: 'tx-123' } as any;
      transactionRepo.create.mockReturnValue(mockTransaction);
      transactionRepo.save.mockResolvedValue(mockTransaction);

      const duplicateError = new PawapayDuplicateException(
        'deposit',
        'deposit-123',
      );
      pawapayService.createDeposit.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(
        service.initiatePayment('testchannel', validPaymentDto),
      ).rejects.toThrow(PawapayDuplicateException);

      // Transaction status should NOT be updated (stays pending)
      expect(transactionRepo.update).not.toHaveBeenCalled();
    });

    it('should handle lowercase channel handle conversion', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      providerCacheService.getProviders.mockResolvedValue([mockProvider]);
      transactionStatusRepo.findOne.mockResolvedValue(mockPendingStatus);

      const mockTransaction = { id: 'tx-123' } as any;
      transactionRepo.create.mockReturnValue(mockTransaction);
      transactionRepo.save.mockResolvedValue(mockTransaction);
      pawapayService.createDeposit.mockResolvedValue(undefined);

      // Act
      await service.initiatePayment('TestChannel', validPaymentDto);

      // Assert - should convert to lowercase
      expect(telegramRepo.findOne).toHaveBeenCalledWith({
        where: { channelHandle: 'testchannel', coAdminAdded: true },
        relations: ['youtubeChannel'],
      });
    });

    it('should include transaction metadata in PawaPay deposit', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      providerCacheService.getProviders.mockResolvedValue([mockProvider]);
      transactionStatusRepo.findOne.mockResolvedValue(mockPendingStatus);

      const mockTransaction = { id: 'tx-456' } as any;
      transactionRepo.create.mockReturnValue(mockTransaction);
      transactionRepo.save.mockResolvedValue(mockTransaction);
      pawapayService.createDeposit.mockResolvedValue(undefined);

      // Act
      await service.initiatePayment('testchannel', validPaymentDto);

      // Assert
      expect(pawapayService.createDeposit).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.arrayContaining([
            { transactionId: 'tx-456', isPII: false },
            {
              channelHandle: 'testchannel',
              isPII: false,
            },
            {
              messageType: MessageType.Livestream,
              isPII: false,
            },
          ]),
        }),
      );
    });

    it('should throw BadRequestException when country price is not configured', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      providerCacheService.getProviders.mockResolvedValue([mockProvider]);
      countryPriceService.getPrice.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.initiatePayment('testchannel', validPaymentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.initiatePayment('testchannel', validPaymentDto),
      ).rejects.toThrow(
        'Payments in ZMW for ZMB are not enabled at this time. Price not configured.',
      );
    });

    it('should throw BadRequestException when payment provider currency does not match requested currency', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      providerCacheService.getProviders.mockResolvedValue([mockProvider]);
      countryPriceService.getPrice.mockResolvedValue(10);
      paymentCountryService.validatePaymentOperator.mockResolvedValue({
        isValid: false,
        error: {
          code: 'CURRENCY_MISMATCH',
          message:
            'Payment provider MTN_MOMO_ZMB does not support currency ZMW',
          details: {
            providerCurrency: 'KES',
            requestedCurrency: 'ZMW',
          },
        },
      });

      // Act & Assert
      await expect(
        service.initiatePayment('testchannel', validPaymentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.initiatePayment('testchannel', validPaymentDto),
      ).rejects.toThrow('Provider supports: KES');
    });

    it('should calculate amount correctly with priceMultiple of 1', async () => {
      // Arrange
      const dtoWithMultiple1 = { ...validPaymentDto, priceMultiple: 1 };
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      providerCacheService.getProviders.mockResolvedValue([mockProvider]);
      transactionStatusRepo.findOne.mockResolvedValue(mockPendingStatus);

      const mockTransaction = { id: 'tx-123' } as any;
      transactionRepo.create.mockReturnValue(mockTransaction);
      transactionRepo.save.mockResolvedValue(mockTransaction);
      pawapayService.createDeposit.mockResolvedValue(undefined);

      // Act
      await service.initiatePayment('testchannel', dtoWithMultiple1);

      // Assert - 10.00 * 1 = 10.00
      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '10',
          multiplier: 1,
        }),
      );
      expect(pawapayService.createDeposit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '10',
        }),
      );
    });

    it('should calculate amount correctly with priceMultiple of 100', async () => {
      // Arrange
      const dtoWithMultiple100 = { ...validPaymentDto, priceMultiple: 100 };
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      providerCacheService.getProviders.mockResolvedValue([mockProvider]);
      transactionStatusRepo.findOne.mockResolvedValue(mockPendingStatus);

      const mockTransaction = { id: 'tx-123' } as any;
      transactionRepo.create.mockReturnValue(mockTransaction);
      transactionRepo.save.mockResolvedValue(mockTransaction);
      pawapayService.createDeposit.mockResolvedValue(undefined);

      // Act
      await service.initiatePayment('testchannel', dtoWithMultiple100);

      // Assert - 10.00 * 100 = 1000.00
      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '1000',
          multiplier: 100,
        }),
      );
      expect(pawapayService.createDeposit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '1000',
        }),
      );
    });

    it('should auto-lookup country from payment provider', async () => {
      // Arrange
      telegramRepo.findOne.mockResolvedValue(mockChannel);
      telegramService.verifyChannelAccess.mockResolvedValue(true);
      currencyRepo.findOne.mockResolvedValue(mockCurrency);
      paymentCountryService.validatePaymentOperator.mockResolvedValue({
        isValid: true,
        operator: {
          name: 'MTN_MOMO_ZMB',
          displayName: 'MTN MOMO ZMB',
          status: 'OPERATIONAL',
          price: 10,
          maxMultiple: 100,
        },
      });
      providerCacheService.getProviders.mockResolvedValue([mockProvider]);
      transactionStatusRepo.findOne.mockResolvedValue(mockPendingStatus);

      const mockTransaction = { id: 'tx-123' } as any;
      transactionRepo.create.mockReturnValue(mockTransaction);
      transactionRepo.save.mockResolvedValue(mockTransaction);
      pawapayService.createDeposit.mockResolvedValue(undefined);

      // Act
      await service.initiatePayment('testchannel', validPaymentDto);

      // Assert - provider should be in payer.accountDetails
      expect(pawapayService.createDeposit).toHaveBeenCalledWith(
        expect.objectContaining({
          payer: expect.objectContaining({
            type: 'MMO',
            accountDetails: expect.objectContaining({
              provider: 'MTN_MOMO_ZMB',
            }),
          }),
        }),
      );
    });

    describe('Idempotency', () => {
      beforeEach(() => {
        telegramRepo.findOne.mockResolvedValue(mockChannel);
        telegramService.verifyChannelAccess.mockResolvedValue(true);
        currencyRepo.findOne.mockResolvedValue(mockCurrency);
        providerCacheService.getProviders.mockResolvedValue([mockProvider]);
        transactionStatusRepo.findOne.mockResolvedValue(mockPendingStatus);
      });

      it('should return existing transaction for pending idempotencyKey', async () => {
        const existingTx = {
          id: 'tx-existing',
          depositId: 'dep-existing',
          fanSessionId: 'fan-existing',
          status: { code: 'pending' },
        };
        transactionRepo.findOne.mockResolvedValue(existingTx as any);

        const result = await service.initiatePayment(
          'testchannel',
          validPaymentDto,
        );

        expect(result).toEqual({
          depositId: 'dep-existing',
          fanSessionId: 'fan-existing',
          transactionId: 'tx-existing',
          status: 'pending',
          channelHandle: 'testchannel',
        });
        expect(transactionRepo.create).not.toHaveBeenCalled();
        expect(pawapayService.createDeposit).not.toHaveBeenCalled();
      });

      it('should return existing transaction for succeeded idempotencyKey', async () => {
        const existingTx = {
          id: 'tx-existing',
          depositId: 'dep-existing',
          fanSessionId: 'fan-existing',
          status: { code: 'succeeded' },
        };
        transactionRepo.findOne.mockResolvedValue(existingTx as any);

        const result = await service.initiatePayment(
          'testchannel',
          validPaymentDto,
        );

        expect(result.status).toEqual('succeeded');
        expect(transactionRepo.create).not.toHaveBeenCalled();
        expect(pawapayService.createDeposit).not.toHaveBeenCalled();
      });

      it('should allow retry when previous transaction failed', async () => {
        const failedTx = {
          id: 'tx-failed',
          depositId: 'dep-failed',
          fanSessionId: 'fan-failed',
          idempotencyKey: validPaymentDto.idempotencyKey,
          status: { code: 'failed' },
        };
        // First findOne returns the failed tx, second returns null (after key cleared)
        transactionRepo.findOne
          .mockResolvedValueOnce(failedTx as any)
          .mockResolvedValue(null);

        const mockTransaction = { id: 'tx-new' } as any;
        transactionRepo.create.mockReturnValue(mockTransaction);
        transactionRepo.save.mockResolvedValue(mockTransaction);
        pawapayService.createDeposit.mockResolvedValue(undefined);

        const result = await service.initiatePayment(
          'testchannel',
          validPaymentDto,
        );

        // Should clear key on old row
        expect(transactionRepo.update).toHaveBeenCalledWith('tx-failed', {
          idempotencyKey: null,
        });
        // Should create new transaction
        expect(transactionRepo.create).toHaveBeenCalled();
        expect(result.transactionId).toEqual('tx-new');
      });

      it('should allow retry when previous transaction was rejected', async () => {
        const rejectedTx = {
          id: 'tx-rejected',
          depositId: 'dep-rejected',
          fanSessionId: 'fan-rejected',
          idempotencyKey: validPaymentDto.idempotencyKey,
          status: { code: 'rejected' },
        };
        transactionRepo.findOne
          .mockResolvedValueOnce(rejectedTx as any)
          .mockResolvedValue(null);

        const mockTransaction = { id: 'tx-new' } as any;
        transactionRepo.create.mockReturnValue(mockTransaction);
        transactionRepo.save.mockResolvedValue(mockTransaction);
        pawapayService.createDeposit.mockResolvedValue(undefined);

        const result = await service.initiatePayment(
          'testchannel',
          validPaymentDto,
        );

        expect(transactionRepo.update).toHaveBeenCalledWith('tx-rejected', {
          idempotencyKey: null,
        });
        expect(transactionRepo.create).toHaveBeenCalled();
        expect(result.transactionId).toEqual('tx-new');
      });

      it('should handle race condition on unique constraint violation', async () => {
        // First findOne returns null (no existing tx)
        transactionRepo.findOne.mockResolvedValueOnce(null);

        const mockTransaction = { id: 'tx-loser' } as any;
        transactionRepo.create.mockReturnValue(mockTransaction);

        // save() throws unique constraint violation
        const uniqueError = new QueryFailedError('INSERT', [], new Error());
        (uniqueError as any).code = '23505';
        transactionRepo.save.mockRejectedValue(uniqueError);

        // Second findOne (after catch) returns the race winner
        const raceWinner = {
          id: 'tx-winner',
          depositId: 'dep-winner',
          fanSessionId: 'fan-winner',
          status: { code: 'pending' },
        };
        transactionRepo.findOne.mockResolvedValueOnce(raceWinner as any);

        const result = await service.initiatePayment(
          'testchannel',
          validPaymentDto,
        );

        expect(result).toEqual({
          depositId: 'dep-winner',
          fanSessionId: 'fan-winner',
          transactionId: 'tx-winner',
          status: 'pending',
          channelHandle: 'testchannel',
        });
        expect(pawapayService.createDeposit).not.toHaveBeenCalled();
      });

      it('should include idempotencyKey when creating transaction', async () => {
        transactionRepo.findOne.mockResolvedValue(null);

        const mockTransaction = { id: 'tx-123' } as any;
        transactionRepo.create.mockReturnValue(mockTransaction);
        transactionRepo.save.mockResolvedValue(mockTransaction);
        pawapayService.createDeposit.mockResolvedValue(undefined);

        await service.initiatePayment('testchannel', validPaymentDto);

        expect(transactionRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
          }),
        );
      });
    });

    // New validation tests
    describe('Payment Operator Validation', () => {
      beforeEach(() => {
        telegramRepo.findOne.mockResolvedValue(mockChannel);
        telegramService.verifyChannelAccess.mockResolvedValue(true);
        currencyRepo.findOne.mockResolvedValue(mockCurrency);
        providerCacheService.getProviders.mockResolvedValue([mockProvider]);
        countryPriceService.getPrice.mockResolvedValue(10);
      });

      it('should throw BadRequestException when operator is unavailable (CLOSED)', async () => {
        paymentCountryService.validatePaymentOperator.mockResolvedValue({
          isValid: false,
          error: {
            code: 'OPERATOR_UNAVAILABLE',
            message: 'Operator MTN_MOMO_ZMB is currently unavailable',
            details: { status: 'CLOSED' },
          },
        });

        await expect(
          service.initiatePayment('testchannel', validPaymentDto),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.initiatePayment('testchannel', validPaymentDto),
        ).rejects.toThrow('currently unavailable (status: CLOSED)');
      });

      it('should throw BadRequestException when amount is below minimum', async () => {
        paymentCountryService.validatePaymentOperator.mockResolvedValue({
          isValid: false,
          error: {
            code: 'AMOUNT_BELOW_MINIMUM',
            message: 'Amount 30 is below minimum 50',
            details: {
              minPrice: 50,
              requestedAmount: 30,
              currency: 'ZMW',
            },
          },
        });

        await expect(
          service.initiatePayment('testchannel', validPaymentDto),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.initiatePayment('testchannel', validPaymentDto),
        ).rejects.toThrow('is below the minimum of 50 ZMW');
      });

      it('should throw BadRequestException when amount is above maximum', async () => {
        paymentCountryService.validatePaymentOperator.mockResolvedValue({
          isValid: false,
          error: {
            code: 'AMOUNT_ABOVE_MAXIMUM',
            message: 'Amount 15000 exceeds maximum 10000',
            details: {
              maxPrice: 10000,
              requestedAmount: 15000,
              currency: 'ZMW',
            },
          },
        });

        await expect(
          service.initiatePayment('testchannel', validPaymentDto),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.initiatePayment('testchannel', validPaymentDto),
        ).rejects.toThrow('exceeds the maximum of 10000 ZMW');
      });

      it('should throw BadRequestException when price multiple exceeds limit', async () => {
        paymentCountryService.validatePaymentOperator.mockResolvedValue({
          isValid: false,
          error: {
            code: 'MULTIPLE_EXCEEDS_LIMIT',
            message: 'Price multiple 50 exceeds limit 20',
            details: {
              maxMultiple: 20,
              requestedMultiple: 50,
              maxPrice: 2000,
              currency: 'ZMW',
            },
          },
        });

        await expect(
          service.initiatePayment('testchannel', validPaymentDto),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.initiatePayment('testchannel', validPaymentDto),
        ).rejects.toThrow('exceeds the maximum allowed multiple of 20');
      });

      it('should throw BadRequestException when availability is unknown', async () => {
        paymentCountryService.validatePaymentOperator.mockResolvedValue({
          isValid: false,
          error: {
            code: 'AVAILABILITY_UNKNOWN',
            message: 'Cannot determine availability',
          },
        });

        await expect(
          service.initiatePayment('testchannel', validPaymentDto),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.initiatePayment('testchannel', validPaymentDto),
        ).rejects.toThrow('Unable to process payment at this time');
      });

      it('should throw NotFoundException when operator not found', async () => {
        paymentCountryService.validatePaymentOperator.mockResolvedValue({
          isValid: false,
          error: {
            code: 'OPERATOR_NOT_FOUND',
            message: 'Payment operator "UNKNOWN_OP" not found',
          },
        });

        await expect(
          service.initiatePayment('testchannel', validPaymentDto),
        ).rejects.toThrow(NotFoundException);
      });

      it('should log validation success details', async () => {
        const mockOperator = {
          name: 'MTN_MOMO_ZMB',
          displayName: 'MTN MOMO ZMB',
          price: 10,
          status: 'OPERATIONAL' as const,
          maxMultiple: 100,
        };

        paymentCountryService.validatePaymentOperator.mockResolvedValue({
          isValid: true,
          operator: mockOperator,
        });
        providerCacheService.getProviders.mockResolvedValue([mockProvider]);
        transactionStatusRepo.findOne.mockResolvedValue(mockPendingStatus);

        const mockTransaction = { id: 'tx-123' } as any;
        transactionRepo.create.mockReturnValue(mockTransaction);
        transactionRepo.save.mockResolvedValue(mockTransaction);
        pawapayService.createDeposit.mockResolvedValue(undefined);

        const logSpy = jest.spyOn(Logger.prototype, 'log');

        await service.initiatePayment('testchannel', validPaymentDto);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Validated payment'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('status=OPERATIONAL'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('price=10'),
        );
      });
    });
  });
});
