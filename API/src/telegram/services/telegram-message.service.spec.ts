import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { TelegramMessageService } from './telegram-message.service';
import { TelegramAdapterService } from '../telegram-adapter.service';
import { TelegramNotificationService } from './telegram-notification.service';
import { RedisService } from '../../redis/redis.service';
import { TelegramConfig } from '../config/telegram.config';
import { TelegramChannel } from '../../creator/entities/telegram-channel.entity';

describe('TelegramMessageService', () => {
  let service: TelegramMessageService;
  let mockAdapter: jest.Mocked<TelegramAdapterService>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockTelegramConfig: jest.Mocked<TelegramConfig>;

  beforeEach(async () => {
    mockAdapter = {
      sendMessage: jest.fn(),
      fetchMessages: jest.fn(),
      createChannel: jest.fn(),
      getChannelAccess: jest.fn(),
      promote: jest.fn(),
      generateInviteLink: jest.fn(),
      revokeInviteLink: jest.fn(),
      checkInviteLink: jest.fn(),
      getExportedInvites: jest.fn(),
      getParticipants: jest.fn(),
    } as any;

    mockDataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === TelegramChannel) {
          return {
            findOne: jest.fn().mockResolvedValue({
              id: 1,
              channelHandle: 'test_channel',
              channelId: '123456',
            }),
          };
        }
        return {
          update: jest.fn().mockResolvedValue({}),
          findOne: jest.fn(),
        };
      }),
    } as any;

    mockRedisService = {
      getPubClient: jest.fn(),
    } as any;

    mockTelegramConfig = {
      maxRetryAttempts: 3,
      retryDelays: [100, 200, 300],
      maxHistoryFetchLimit: 100,
      replyCacheTTL: 300,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramMessageService,
        { provide: TelegramAdapterService, useValue: mockAdapter },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: TelegramNotificationService,
          useValue: { notifyMessageDelivery: jest.fn() },
        },
        { provide: RedisService, useValue: mockRedisService },
        { provide: TelegramConfig, useValue: mockTelegramConfig },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test') },
        },
      ],
    }).compile();

    service = module.get<TelegramMessageService>(TelegramMessageService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('formatFanMessage', () => {
    it('should format message with subject using HTML bold and italic', () => {
      const result = service.formatFanMessage(
        'John Doe',
        'Hello creator!',
        '50.00',
        'ZMW',
        'Great content',
      );

      expect(result).toContain('<b>John Doe</b> sent <b>50.00 ZMW</b>');
      expect(result).toContain('Subject: <i>Great content</i>');
      expect(result).toContain('"Hello creator!"');
      expect(result).toContain('Sent via SponsPay');
      expect(result).not.toContain('New Fan Message');
    });

    it('should format message without subject', () => {
      const result = service.formatFanMessage(
        'Jane Doe',
        'Love your work!',
        '25.00',
        'KES',
        null,
      );

      expect(result).toContain('<b>Jane Doe</b> sent <b>25.00 KES</b>');
      expect(result).toContain('"Love your work!"');
      expect(result).not.toContain('Subject:');
    });
  });

  describe('fetchChannelMessages', () => {
    it('should fetch and filter messages from channel', async () => {
      mockAdapter.fetchMessages.mockResolvedValue({
        messages: [
          {
            message:
              '💬 New Fan Message\n\nFrom: John\nAmount: 50 ZMW\n"Hello!"',
            date: Math.floor(Date.now() / 1000),
            fromId: null,
          },
          {
            message: 'Creator reply',
            date: Math.floor(Date.now() / 1000),
            fromId: { userId: '789' },
          },
          {
            message: '', // Empty message - should be filtered
            date: Math.floor(Date.now() / 1000),
            fromId: null,
          },
        ],
        users: [{ id: '789', firstName: 'Creator', lastName: 'Name' }],
      });

      const result = await service.fetchChannelMessages('test_channel', 5);

      expect(result.length).toBe(2);
      expect(result[0].payerFullName).toBe('John');
      expect(result[0].senderType).toBe('paid');
      expect(result[1].payerFullName).toBe('Creator');
      expect(result[1].senderType).toBe('creator');
    });

    it('should return empty array when channel not found', async () => {
      mockDataSource.getRepository = jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      }) as any;

      const result = await service.fetchChannelMessages('nonexistent', 5);

      expect(result).toEqual([]);
    });
  });

  describe('parseMessagePayload', () => {
    it('parses compact paid format into structured fields', () => {
      const raw =
        '💬 Filip sent 7500.00 XOF\nSubject: Filip\'s Special Request\n\n"Testing pasted phone number"\n\n---\nSent via SponsPay';
      const out = service.parseMessagePayload(raw, 'paid');
      expect(out.senderName).toBe('Filip');
      expect(out.amount).toBe('7500.00 XOF');
      expect(out.subject).toBe("Filip's Special Request");
      expect(out.content).toBe('Testing pasted phone number');
    });

    it('parses legacy paid format into structured fields', () => {
      const raw =
        '💬 New Fan Message\nFrom: Peter Rufai\nAmount: 30000.00 XOF\nSubject: Check 2 of Fan Page\n"This is not a test"\n\n---\nSent via SponsPay';
      const out = service.parseMessagePayload(raw, 'paid');
      expect(out.senderName).toBe('Peter Rufai');
      expect(out.amount).toBe('30000.00 XOF');
      expect(out.subject).toBe('Check 2 of Fan Page');
      expect(out.content).toBe('This is not a test');
    });

    it('strips the Sent via SponsPay footer from creator replies', () => {
      const raw =
        'Thanks, Fassil! What other videos would you like me to make?\n\n---\nSent via SponsPay';
      const out = service.parseMessagePayload(raw, 'creator');
      expect(out.senderName).toBe('Creator');
      expect(out.content).toBe(
        'Thanks, Fassil! What other videos would you like me to make?',
      );
      expect(out.subject).toBeNull();
      expect(out.amount).toBeNull();
    });

    it('falls back to raw content when the paid format is unrecognized', () => {
      const raw = '💬 Weird unparseable payload';
      const out = service.parseMessagePayload(raw, 'paid');
      expect(out.senderName).toBe('Anonymous');
      expect(out.content).toBe('💬 Weird unparseable payload');
    });
  });

  describe('checkMessagesForAdminReplies', () => {
    it('should return all false for empty messageIds', async () => {
      const result = await service.checkMessagesForAdminReplies(
        'test_channel',
        [],
      );
      expect(result.size).toBe(0);
    });

    it('should use cache when available', async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValue('true'),
        set: jest.fn(),
      };
      mockRedisService.getPubClient.mockReturnValue(mockRedis as any);

      const result = await service.checkMessagesForAdminReplies(
        'test_channel',
        ['msg-1'],
      );

      expect(result.get('msg-1')).toBe(true);
      expect(mockAdapter.fetchMessages).not.toHaveBeenCalled();
    });
  });
});
