import { Test, TestingModule } from '@nestjs/testing';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { ConfigService } from '@nestjs/config';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ApiKeyGuard } from '../auth/api-key.guard';

describe('TelegramController', () => {
  let controller: TelegramController;
  let service: TelegramService;

  const mockTelegramService = {
    isChannelNameAvailable: jest.fn(),
    findTakenChannelHandles: jest.fn(),
    getChannelInviteInfo: jest.fn(),
    getCoAdminStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelegramController],
      providers: [
        {
          provide: TelegramService,
          useValue: mockTelegramService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => null),
          },
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TelegramController>(TelegramController);
    service = module.get<TelegramService>(TelegramService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkChannelAvailability', () => {
    it('should return taken handles from service', async () => {
      mockTelegramService.findTakenChannelHandles.mockResolvedValue(['a']);
      const dto = { handles: ['a', 'b'] } as any;
      const result = await controller.checkChannelAvailability(dto);
      expect(service.findTakenChannelHandles).toHaveBeenCalledWith(['a', 'b']);
      expect(result).toEqual({ taken: ['a'] });
    });
  });

  describe('getChannelInviteInfo', () => {
    it('should return channel invite info for authenticated user', async () => {
      const mockChannelInfo = {
        channelHandle: 'testchannel',
        inviteLink: 'https://t.me/joinchat/abc123',
        channelId: '1234567890',
        coAdminAdded: false,
      };
      mockTelegramService.getChannelInviteInfo.mockResolvedValue(
        mockChannelInfo,
      );

      const mockRequest = {
        user: { uid: 'test-firebase-uid' },
      } as any;

      const result = await controller.getChannelInviteInfo(mockRequest);

      expect(service.getChannelInviteInfo).toHaveBeenCalledWith(
        'test-firebase-uid',
      );
      expect(result).toEqual(mockChannelInfo);
    });

    it('should throw UnauthorizedException if user uid is missing', async () => {
      const mockRequest = {
        user: {},
      } as any;

      await expect(
        controller.getChannelInviteInfo(mockRequest),
      ).rejects.toThrow('Missing Firebase user identity');
    });
  });

  describe('getCoAdminStatus', () => {
    it('should return co-admin status for authenticated user', async () => {
      const mockStatus = {
        coAdminAdded: true,
        channelHandle: 'testchannel',
        channelId: '-1001234567890',
        lastChecked: '2025-11-02T14:30:15.000Z',
      };
      mockTelegramService.getCoAdminStatus.mockResolvedValue(mockStatus);

      const mockRequest = {
        user: { uid: 'test-firebase-uid' },
      } as any;

      const result = await controller.getCoAdminStatus(mockRequest);

      expect(service.getCoAdminStatus).toHaveBeenCalledWith(
        'test-firebase-uid',
      );
      expect(result).toEqual(mockStatus);
    });

    it('should handle user_id field for Firebase identity', async () => {
      const mockStatus = {
        coAdminAdded: false,
        channelHandle: 'testchannel',
        channelId: '-1001234567890',
        lastChecked: '2025-11-02T14:30:15.000Z',
      };
      mockTelegramService.getCoAdminStatus.mockResolvedValue(mockStatus);

      const mockRequest = {
        user: { user_id: 'test-firebase-uid-2' },
      } as any;

      const result = await controller.getCoAdminStatus(mockRequest);

      expect(service.getCoAdminStatus).toHaveBeenCalledWith(
        'test-firebase-uid-2',
      );
      expect(result).toEqual(mockStatus);
    });

    it('should throw UnauthorizedException if user uid is missing', async () => {
      const mockRequest = {
        user: {},
      } as any;

      await expect(controller.getCoAdminStatus(mockRequest)).rejects.toThrow(
        'Missing Firebase user identity',
      );
    });
  });
});
