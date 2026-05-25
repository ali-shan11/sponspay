import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TelegramChannelService } from './telegram-channel.service';
import { TelegramAdapterService } from '../telegram-adapter.service';
import { TelegramNotificationService } from './telegram-notification.service';
import { TelegramChannel } from '../../creator/entities/telegram-channel.entity';
import { UserChannel } from '../../creator/entities/user-channel.entity';

describe('TelegramChannelService', () => {
  let service: TelegramChannelService;
  let mockAdapter: jest.Mocked<TelegramAdapterService>;
  let mockDataSource: jest.Mocked<DataSource>;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  const mockTelegramChannelRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockUserChannelRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    mockTelegramChannelRepo.find.mockReset();
    mockTelegramChannelRepo.findOne.mockReset();
    mockTelegramChannelRepo.update.mockReset();
    mockUserChannelRepo.findOne.mockReset();

    mockDataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === TelegramChannel) return mockTelegramChannelRepo;
        if (entity === UserChannel) return mockUserChannelRepo;
        return { find: jest.fn(), findOne: jest.fn(), update: jest.fn() };
      }),
    } as any;

    mockAdapter = {
      createChannel: jest.fn(),
      getChannelAccess: jest.fn(),
      sendMessage: jest.fn(),
      fetchMessages: jest.fn(),
      promote: jest.fn(),
      generateInviteLink: jest.fn(),
      revokeInviteLink: jest.fn(),
      checkInviteLink: jest.fn(),
      getExportedInvites: jest.fn(),
      getParticipants: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramChannelService,
        { provide: TelegramAdapterService, useValue: mockAdapter },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: TelegramNotificationService,
          useValue: { notifyCoAdminAdded: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TelegramChannelService>(TelegramChannelService);

    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findTakenChannelHandles', () => {
    it('should return handles that are already registered', async () => {
      const handles = ['channel1', 'channel2', 'channel3'];
      const mockRecords = [
        { channelHandle: 'channel1' },
        { channelHandle: 'channel3' },
      ];

      mockTelegramChannelRepo.find.mockResolvedValue(mockRecords);

      const result = await service.findTakenChannelHandles(handles);

      expect(result).toEqual(['channel1', 'channel3']);
      expect(mockTelegramChannelRepo.find).toHaveBeenCalledWith({
        where: { channelHandle: expect.anything() },
        select: ['channelHandle'],
      });
    });

    it('should return empty array when no handles are taken', async () => {
      mockTelegramChannelRepo.find.mockResolvedValue([]);

      const result = await service.findTakenChannelHandles([
        'new_channel1',
        'new_channel2',
      ]);

      expect(result).toEqual([]);
    });
  });

  describe('getChannelInviteInfo', () => {
    const mockTelegramChannel = {
      id: 1,
      channelHandle: 'test_channel',
      channelId: '123456',
      inviteLink: 'https://t.me/+abc123',
      coAdminAdded: false,
      createdAt: new Date('2024-01-01'),
    };

    const mockUserChannel = {
      id: 'uc-1',
      youtubeChannel: { id: 'yt-uuid' },
    };

    it('should throw NotFoundException if user has no channels', async () => {
      mockUserChannelRepo.findOne.mockResolvedValue(null);

      await expect(service.getChannelInviteInfo('user123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return existing valid invite link', async () => {
      mockUserChannelRepo.findOne.mockResolvedValue(mockUserChannel);
      mockTelegramChannelRepo.findOne.mockResolvedValue(mockTelegramChannel);
      mockAdapter.getParticipants.mockResolvedValue({
        participants: [],
        users: [],
      });
      mockAdapter.checkInviteLink.mockResolvedValue({
        valid: true,
        className: 'ChatInvite',
      });

      const result = await service.getChannelInviteInfo('user123');

      expect(result).toEqual({
        channelHandle: 'test_channel',
        inviteLink: 'https://t.me/+abc123',
        channelId: '123456',
        coAdminAdded: false,
      });
    });

    it('should NOT promote the channel creator (service account) during recovery', async () => {
      mockUserChannelRepo.findOne.mockResolvedValue(mockUserChannel);
      mockTelegramChannelRepo.findOne.mockResolvedValue(mockTelegramChannel);
      mockAdapter.getParticipants.mockResolvedValue({
        participants: [
          { userId: '999', className: 'ChannelParticipantCreator' },
        ],
        users: [
          { id: '999', firstName: 'support@sponspay.com', lastName: null },
        ],
      });
      mockAdapter.checkInviteLink.mockResolvedValue({
        valid: true,
        className: 'ChatInvite',
      });

      const result = await service.getChannelInviteInfo('user123');

      expect(result.coAdminAdded).toBe(false);
      expect(mockAdapter.promote).not.toHaveBeenCalled();
    });

    it('should promote a real user (ChannelParticipant) during recovery', async () => {
      mockUserChannelRepo.findOne.mockResolvedValue(mockUserChannel);
      mockTelegramChannelRepo.findOne.mockResolvedValue({
        ...mockTelegramChannel,
      });
      mockAdapter.getParticipants.mockResolvedValue({
        participants: [
          { userId: '999', className: 'ChannelParticipantCreator' },
          { userId: '8230', className: 'ChannelParticipant' },
        ],
        users: [
          { id: '999', firstName: 'support@sponspay.com', lastName: null },
          { id: '8230', firstName: 'Creator', lastName: '' },
        ],
      });
      mockAdapter.promote.mockResolvedValue(undefined);
      mockTelegramChannelRepo.update.mockResolvedValue({});

      const result = await service.getChannelInviteInfo('user123');

      expect(result.coAdminAdded).toBe(true);
      expect(mockAdapter.promote).toHaveBeenCalledWith(
        '123456',
        'test_channel',
        '8230',
      );
    });

    it('should return invite link without checking if co-admin already added', async () => {
      mockUserChannelRepo.findOne.mockResolvedValue(mockUserChannel);
      mockTelegramChannelRepo.findOne.mockResolvedValue({
        ...mockTelegramChannel,
        coAdminAdded: true,
      });

      const result = await service.getChannelInviteInfo('user123');

      expect(result.inviteLink).toBe('https://t.me/+abc123');
      expect(result.coAdminAdded).toBe(true);
      // Should NOT call checkInviteLink when coAdminAdded is true
      expect(mockAdapter.checkInviteLink).not.toHaveBeenCalled();
    });

    it('should regenerate invite link when existing one is expired', async () => {
      mockUserChannelRepo.findOne.mockResolvedValue(mockUserChannel);
      mockTelegramChannelRepo.findOne.mockResolvedValue(mockTelegramChannel);
      mockAdapter.getParticipants.mockResolvedValue({
        participants: [],
        users: [],
      });

      // Link is expired
      mockAdapter.checkInviteLink.mockResolvedValue({
        valid: false,
        className: 'INVITE_HASH_EXPIRED',
      });
      mockAdapter.getExportedInvites.mockResolvedValue({ invites: [] });
      mockAdapter.generateInviteLink.mockResolvedValue({
        inviteLink: 'https://t.me/+newlink',
      });
      mockTelegramChannelRepo.update.mockResolvedValue({});

      const result = await service.getChannelInviteInfo('user123');

      expect(result.inviteLink).toBe('https://t.me/+newlink');
      expect(mockAdapter.generateInviteLink).toHaveBeenCalledWith(
        'test_channel',
        3, // retry usage limit
        'Creator Invite (Retry)',
        '123456',
      );
    });
  });

  describe('getFanInviteLink', () => {
    const mockChannel = {
      id: 1,
      channelHandle: 'test_channel',
      channelId: '123456',
      fanInviteLink: 'https://t.me/+fan123',
    };

    it('should return cached fan invite link if valid', async () => {
      mockTelegramChannelRepo.findOne.mockResolvedValue(mockChannel);
      mockAdapter.checkInviteLink.mockResolvedValue({
        valid: true,
        className: 'ChatInvite',
      });

      const result = await service.getFanInviteLink('test_channel');

      expect(result).toBe('https://t.me/+fan123');
    });

    it('should treat ChatInviteAlready as valid (bot is already a member)', async () => {
      mockTelegramChannelRepo.findOne.mockResolvedValue(mockChannel);
      mockAdapter.checkInviteLink.mockResolvedValue({
        valid: false,
        className: 'ChatInviteAlready',
      });

      const result = await service.getFanInviteLink('test_channel');

      expect(result).toBe('https://t.me/+fan123');
      expect(mockAdapter.revokeInviteLink).not.toHaveBeenCalled();
      expect(mockAdapter.generateInviteLink).not.toHaveBeenCalled();
    });

    it('should return null if channel not found', async () => {
      mockTelegramChannelRepo.findOne.mockResolvedValue(null);

      const result = await service.getFanInviteLink('nonexistent_channel');

      expect(result).toBeNull();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
      );
    });

    it('should generate new link if existing one is expired', async () => {
      mockTelegramChannelRepo.findOne.mockResolvedValue(mockChannel);
      mockAdapter.checkInviteLink.mockResolvedValue({
        valid: false,
        className: 'INVITE_HASH_EXPIRED',
      });
      mockAdapter.revokeInviteLink.mockResolvedValue(undefined);
      mockAdapter.generateInviteLink.mockResolvedValue({
        inviteLink: 'https://t.me/+newfan',
      });
      mockTelegramChannelRepo.update.mockResolvedValue({});

      const result = await service.getFanInviteLink('test_channel');

      expect(result).toBe('https://t.me/+newfan');
      expect(mockAdapter.generateInviteLink).toHaveBeenCalledWith(
        'test_channel',
        0, // unlimited
        'Fan Invite',
        '123456',
      );
    });
  });

  describe('createPrivateChannel', () => {
    it('should create channel and return success with channel ID', async () => {
      mockAdapter.createChannel.mockResolvedValue({
        channelId: '123456',
        inviteLink: 'https://t.me/+invite123',
      });

      const result = await service.createPrivateChannel('test_channel');

      expect(result.success).toBe(true);
      expect(result.channelId).toBe('123456');
      expect(result.inviteLink).toBe('https://t.me/+invite123');
    });

    it('should return success: false on error', async () => {
      mockAdapter.createChannel.mockRejectedValue(new Error('API error'));

      const result = await service.createPrivateChannel('test_channel');

      expect(result.success).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('verifyChannelAccess', () => {
    const mockChannel = {
      id: 1,
      channelHandle: 'test_channel',
      channelId: '123456',
    };

    it('should return true if channel is accessible with 2+ admins', async () => {
      mockTelegramChannelRepo.findOne.mockResolvedValue(mockChannel);
      mockAdapter.getChannelAccess.mockResolvedValue({
        accessible: true,
        adminCount: 2,
      });

      const result = await service.verifyChannelAccess('test_channel');

      expect(result).toBe(true);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 admins present'),
      );
    });

    it('should return false if channel not found in database', async () => {
      mockTelegramChannelRepo.findOne.mockResolvedValue(null);

      const result = await service.verifyChannelAccess('test_channel');

      expect(result).toBe(false);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
      );
    });

    it('should return false if less than 2 admins', async () => {
      mockTelegramChannelRepo.findOne.mockResolvedValue(mockChannel);
      mockAdapter.getChannelAccess.mockResolvedValue({
        accessible: false,
        adminCount: 1,
      });

      const result = await service.verifyChannelAccess('test_channel');

      expect(result).toBe(false);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 admin'),
      );
    });
  });
});
