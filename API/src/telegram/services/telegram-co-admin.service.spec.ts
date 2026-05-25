import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TelegramCoAdminService } from './telegram-co-admin.service';
import { TelegramAdapterService } from '../telegram-adapter.service';
import { TelegramNotificationService } from './telegram-notification.service';
import { TelegramChannel } from '../../creator/entities/telegram-channel.entity';
import { UserChannel } from '../../creator/entities/user-channel.entity';

describe('TelegramCoAdminService', () => {
  let service: TelegramCoAdminService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockAdapterService: jest.Mocked<TelegramAdapterService>;
  let mockNotificationService: jest.Mocked<TelegramNotificationService>;

  const mockTelegramChannelRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockUserChannelRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    mockTelegramChannelRepo.findOne.mockReset();
    mockTelegramChannelRepo.update.mockReset();
    mockUserChannelRepo.findOne.mockReset();

    mockDataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === TelegramChannel) return mockTelegramChannelRepo;
        if (entity === UserChannel) return mockUserChannelRepo;
        return { findOne: jest.fn() };
      }),
    } as any;

    mockAdapterService = {
      getParticipants: jest.fn(),
      promote: jest.fn(),
    } as any;

    mockNotificationService = {
      notifyCoAdminAdded: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramCoAdminService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: TelegramAdapterService, useValue: mockAdapterService },
        {
          provide: TelegramNotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<TelegramCoAdminService>(TelegramCoAdminService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getCoAdminStatus', () => {
    it('should return co-admin status for user', async () => {
      const mockUserChannel = {
        id: 'uc-1',
        youtubeChannel: { id: 'yt-uuid' },
      };

      const mockTelegramChannel = {
        coAdminAdded: true,
        channelHandle: 'test_channel',
        channelId: '123456',
      };

      mockUserChannelRepo.findOne.mockResolvedValue(mockUserChannel);
      mockTelegramChannelRepo.findOne.mockResolvedValue(mockTelegramChannel);

      const result = await service.getCoAdminStatus('user123');

      expect(result).toMatchObject({
        coAdminAdded: true,
        channelHandle: 'test_channel',
        channelId: '123456',
      });
      expect(result.lastChecked).toBeDefined();
      // Should NOT attempt recovery when already promoted
      expect(mockAdapterService.getParticipants).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user has no channels', async () => {
      mockUserChannelRepo.findOne.mockResolvedValue(null);

      await expect(service.getCoAdminStatus('user123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if no Telegram channel found', async () => {
      mockUserChannelRepo.findOne.mockResolvedValue({
        youtubeChannel: { id: 'yt-uuid' },
      });
      mockTelegramChannelRepo.findOne.mockResolvedValue(null);

      await expect(service.getCoAdminStatus('user123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty channelId when not set', async () => {
      mockUserChannelRepo.findOne.mockResolvedValue({
        youtubeChannel: { id: 'yt-uuid' },
      });
      mockTelegramChannelRepo.findOne.mockResolvedValue({
        coAdminAdded: false,
        channelHandle: 'test_channel',
        channelId: null,
      });

      const result = await service.getCoAdminStatus('user123');

      expect(result.channelId).toBe('');
      expect(result.coAdminAdded).toBe(false);
    });

    it('should attempt recovery when coAdminAdded is false and channelId exists', async () => {
      mockUserChannelRepo.findOne.mockResolvedValue({
        youtubeChannel: { id: 'yt-uuid' },
      });
      mockTelegramChannelRepo.findOne.mockResolvedValue({
        id: 1,
        coAdminAdded: false,
        channelHandle: 'test_channel',
        channelId: '123456',
      });
      mockAdapterService.getParticipants.mockResolvedValue({
        participants: [
          { userId: '999', className: 'ChannelParticipantCreator' },
          { userId: '12345', className: 'ChannelParticipant' },
        ],
        users: [],
      });
      mockAdapterService.promote.mockResolvedValue(undefined);
      mockTelegramChannelRepo.update.mockResolvedValue({});

      const result = await service.getCoAdminStatus('user123');

      expect(mockAdapterService.getParticipants).toHaveBeenCalled();
      expect(mockAdapterService.promote).toHaveBeenCalledWith(
        '123456',
        'test_channel',
        '12345',
      );
      expect(mockTelegramChannelRepo.update).toHaveBeenCalledWith(
        { id: 1 },
        { joinedUserId: '12345', coAdminAdded: true },
      );
      expect(mockNotificationService.notifyCoAdminAdded).toHaveBeenCalledWith(
        'user123',
        'test_channel',
      );
      expect(result.coAdminAdded).toBe(true);
    });

    it('should not attempt recovery if only the service account is in channel', async () => {
      mockUserChannelRepo.findOne.mockResolvedValue({
        youtubeChannel: { id: 'yt-uuid' },
      });
      mockTelegramChannelRepo.findOne.mockResolvedValue({
        id: 1,
        coAdminAdded: false,
        channelHandle: 'no_joiner',
        channelId: '123456',
      });
      mockAdapterService.getParticipants.mockResolvedValue({
        participants: [
          { userId: '999', className: 'ChannelParticipantCreator' },
        ],
        users: [],
      });

      const result = await service.getCoAdminStatus('user123');

      expect(mockAdapterService.promote).not.toHaveBeenCalled();
      expect(result.coAdminAdded).toBe(false);
    });

    it('should throttle recovery attempts with 15s cooldown', async () => {
      const channelData = {
        id: 1,
        coAdminAdded: false,
        channelHandle: 'throttle_test',
        channelId: '123456',
      };

      mockUserChannelRepo.findOne.mockResolvedValue({
        youtubeChannel: { id: 'yt-uuid' },
      });
      mockTelegramChannelRepo.findOne.mockResolvedValue(channelData);
      mockAdapterService.getParticipants.mockResolvedValue({
        participants: [
          { userId: '999', className: 'ChannelParticipantCreator' },
        ],
        users: [],
      });

      await service.getCoAdminStatus('user123');
      await service.getCoAdminStatus('user123');

      // Should only call getParticipants once due to throttle
      expect(mockAdapterService.getParticipants).toHaveBeenCalledTimes(1);
    });

    it('should handle recovery errors gracefully', async () => {
      mockUserChannelRepo.findOne.mockResolvedValue({
        youtubeChannel: { id: 'yt-uuid' },
      });
      mockTelegramChannelRepo.findOne.mockResolvedValue({
        id: 1,
        coAdminAdded: false,
        channelHandle: 'error_test',
        channelId: '123456',
      });
      mockAdapterService.getParticipants.mockRejectedValue(
        new Error('adapter down'),
      );

      const result = await service.getCoAdminStatus('user123');

      // Should not throw, just return the current status
      expect(result.coAdminAdded).toBe(false);
    });
  });
});
