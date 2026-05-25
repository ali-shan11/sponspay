import { Test, TestingModule } from '@nestjs/testing';
import { CreatorService } from './creator.service';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { ZohoService } from '../zoho/zoho.service';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { TelegramService } from '../telegram/telegram.service';
import { YouTubeTokenService } from '../youtube-message/services/youtube-token.service';
import { YouTubeOAuthService } from '../youtube-oauth/youtube-oauth.service';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { User } from './entities/user.entity';
import { YouTubeChannel } from './entities/youtube-channel.entity';
import { ChannelSnapshot } from './entities/channel-snapshot.entity';
import { TelegramChannel } from './entities/telegram-channel.entity';
import { UserChannel, UserChannelRole } from './entities/user-channel.entity';
import { LinkClick } from '../link-click/entities/link-click.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { YouTubeOAuthToken } from '../youtube-message/entities/youtube-oauth-token.entity';
import { UserRole } from './enums/user.enum';
import { Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { Terms } from '../terms/entities/terms.entity';
import * as firebaseAdmin from 'firebase-admin';

describe('CreatorService', () => {
  let service: CreatorService;
  let zohoService: jest.Mocked<ZohoService>;
  let firebaseAdminService: jest.Mocked<FirebaseAdminService>;
  let telegramService: jest.Mocked<TelegramService>;
  let youtubeOAuthService: jest.Mocked<YouTubeOAuthService>;
  let userRepository: jest.Mocked<Repository<User>>;
  let youtubeChannelRepository: jest.Mocked<Repository<YouTubeChannel>>;
  let channelSnapshotRepository: jest.Mocked<Repository<ChannelSnapshot>>;
  let telegramChannelRepository: jest.Mocked<Repository<TelegramChannel>>;
  let userChannelRepository: jest.Mocked<Repository<UserChannel>>;
  let youtubeOAuthTokenRepository: jest.Mocked<Repository<YouTubeOAuthToken>>;
  let linkClickRepository: jest.Mocked<Repository<LinkClick>>;
  let transactionRepository: jest.Mocked<Repository<Transaction>>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let dataSource: DataSource;

  const uid = 'firebase123';

  beforeEach(async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orUpdate: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };

    userRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any;

    youtubeChannelRepository = {
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    } as any;

    channelSnapshotRepository = {
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    telegramChannelRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as any;

    userChannelRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      upsert: jest.fn(),
    } as any;

    youtubeOAuthTokenRepository = {
      findOne: jest.fn(),
    } as any;

    linkClickRepository = {
      count: jest.fn(),
    } as any;

    transactionRepository = {
      count: jest.fn(),
    } as any;

    const mockManager = {
      getRepository: jest.fn((entity) => {
        if (entity === User) return userRepository;
        if (entity === YouTubeChannel) return youtubeChannelRepository;
        if (entity === ChannelSnapshot) return channelSnapshotRepository;
        if (entity === TelegramChannel) return telegramChannelRepository;
        if (entity === UserChannel) return userChannelRepository;
        if (entity === YouTubeOAuthToken) return youtubeOAuthTokenRepository;
        if (entity === LinkClick) return linkClickRepository;
        if (entity === Transaction) return transactionRepository;
        return userRepository;
      }),
    };

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: mockManager,
    } as any;

    const mockDataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === User) return userRepository;
        if (entity === YouTubeChannel) return youtubeChannelRepository;
        if (entity === ChannelSnapshot) return channelSnapshotRepository;
        if (entity === TelegramChannel) return telegramChannelRepository;
        if (entity === UserChannel) return userChannelRepository;
        if (entity === YouTubeOAuthToken) return youtubeOAuthTokenRepository;
        if (entity === LinkClick) return linkClickRepository;
        if (entity === Transaction) return transactionRepository;
        return userRepository;
      }),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    const mockZohoService = {
      createContactFromSignIn: jest.fn(),
      markContactOnboardingCancelled: jest.fn(),
    };

    const mockFirebaseAdminService = {
      addCustomClaim: jest.fn(),
      getFirebaseUidByGoogleId: jest.fn(),
    };

    const mockTelegramService = {
      createPrivateChannel: jest.fn(),
    };

    const mockYouTubeTokenService = {
      upsertRefreshToken: jest.fn().mockResolvedValue(undefined),
    };

    const mockYouTubeOAuthService = {
      getChannelDataForEstimator: jest.fn().mockResolvedValue({
        connected: true,
        channels: [
          {
            id: 'UC1234567890',
            title: "John's Channel",
            subscriberCount: '100000',
          },
        ],
      }),
      getAnalyticsReport: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ZohoService,
          useValue: mockZohoService,
        },
        {
          provide: FirebaseAdminService,
          useValue: mockFirebaseAdminService,
        },
        {
          provide: TelegramService,
          useValue: mockTelegramService,
        },
        {
          provide: YouTubeTokenService,
          useValue: mockYouTubeTokenService,
        },
        {
          provide: YouTubeOAuthService,
          useValue: mockYouTubeOAuthService,
        },
      ],
    }).compile();

    service = module.get<CreatorService>(CreatorService);
    dataSource = module.get(DataSource);
    zohoService = module.get(ZohoService);
    firebaseAdminService = module.get(FirebaseAdminService);
    telegramService = module.get(TelegramService);
    youtubeOAuthService = module.get(YouTubeOAuthService);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSignInContact', () => {
    const mockCreateProspectDto: CreateProspectDto = {
      displayName: 'John Doe',
      email: 'john.doe@example.com',
      googleUserId: 'google123',
      profilePictureUrl: 'https://example.com/pic.jpg',
      locale: 'en-US',
      signInContext: 'web',
    };

    it('should create sign-in contact successfully without onboarding status when user not in Firebase', async () => {
      zohoService.createContactFromSignIn.mockResolvedValue(undefined);
      firebaseAdminService.getFirebaseUidByGoogleId.mockResolvedValue(null);

      const result = await service.createSignInContact(mockCreateProspectDto);

      expect(zohoService.createContactFromSignIn).toHaveBeenCalledWith(
        mockCreateProspectDto,
      );
      expect(
        firebaseAdminService.getFirebaseUidByGoogleId,
      ).toHaveBeenCalledWith('google123');
      expect(result).toEqual({
        success: true,
        message: 'Contact created or updated successfully in ZohoCRM',
      });
    });

    it('should use provided firebaseUid and skip Firebase lookup', async () => {
      const dtoWithFirebaseUid: CreateProspectDto = {
        ...mockCreateProspectDto,
        firebaseUid: 'firebase-uid-direct',
      };

      const mockUser: User = {
        id: 'user-123',
        firebaseUid: 'firebase-uid-direct',
        role: UserRole.Creator,
        displayName: 'John Doe',
        email: 'john.doe@example.com',
        userChannels: [],
        acceptedTerms: null,
        acceptedTermsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      zohoService.createContactFromSignIn.mockResolvedValue(undefined);
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.createSignInContact(dtoWithFirebaseUid);

      // Should NOT call getFirebaseUidByGoogleId when firebaseUid is provided
      expect(
        firebaseAdminService.getFirebaseUidByGoogleId,
      ).not.toHaveBeenCalled();

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Contact created or updated successfully in ZohoCRM',
          isCreator: true,
          isCoAdmin: false,
          hasAcceptedTerms: false,
        }),
      );
    });

    it('should fall back to Firebase lookup when firebaseUid is not provided', async () => {
      const mockUser: User = {
        id: 'user-123',
        firebaseUid: 'firebase-uid-123',
        role: UserRole.Creator,
        displayName: 'John Doe',
        email: 'john.doe@example.com',
        userChannels: [],
        acceptedTerms: null,
        acceptedTermsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      zohoService.createContactFromSignIn.mockResolvedValue(undefined);
      firebaseAdminService.getFirebaseUidByGoogleId.mockResolvedValue(
        'firebase-uid-123',
      );
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.createSignInContact(mockCreateProspectDto);

      // Should call getFirebaseUidByGoogleId when firebaseUid is NOT provided
      expect(
        firebaseAdminService.getFirebaseUidByGoogleId,
      ).toHaveBeenCalledWith('google123');

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Contact created or updated successfully in ZohoCRM',
          isCreator: true,
          isCoAdmin: false,
          hasAcceptedTerms: false,
        }),
      );
    });

    it('should include onboarding status when user exists in Firebase and database', async () => {
      const mockUser: User = {
        id: 'user-123',
        firebaseUid: 'firebase-uid-123',
        role: UserRole.Creator,
        displayName: 'John Doe',
        email: 'john.doe@example.com',
        userChannels: [],
        acceptedTerms: null,
        acceptedTermsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      zohoService.createContactFromSignIn.mockResolvedValue(undefined);
      firebaseAdminService.getFirebaseUidByGoogleId.mockResolvedValue(
        'firebase-uid-123',
      );
      userRepository.findOne.mockResolvedValue(mockUser);

      // Mock UserChannel lookup (no channels linked yet)
      userChannelRepository.findOne.mockResolvedValue(null);

      const result = await service.createSignInContact(mockCreateProspectDto);

      expect(
        firebaseAdminService.getFirebaseUidByGoogleId,
      ).toHaveBeenCalledWith('google123');
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Contact created or updated successfully in ZohoCRM',
          isCreator: true,
          isCoAdmin: false,
          hasAcceptedTerms: false,
        }),
      );
    });

    it('should return all onboarding flags as true when user has completed onboarding', async () => {
      const mockTerms: Terms = {
        id: 'terms-1',
        version: 1,
        html: '<p>Terms content</p>',
        createdAt: new Date(),
      };

      const mockYtChannel: YouTubeChannel = {
        id: 'yt-channel-123',
        channelId: 'UC1234567890',
        channelName: 'Test Channel',
        feePercentage: '15.00',
        snapshots: [],
        userChannels: [],
        telegramChannel: null as any,
        createdAt: new Date(),
      };

      const mockUser: User = {
        id: 'user-123',
        firebaseUid: 'firebase-uid-123',
        role: UserRole.Creator,
        displayName: 'John Doe',
        email: 'john.doe@example.com',
        userChannels: [],
        acceptedTerms: mockTerms,
        acceptedTermsAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      zohoService.createContactFromSignIn.mockResolvedValue(undefined);
      firebaseAdminService.getFirebaseUidByGoogleId.mockResolvedValue(
        'firebase-uid-123',
      );
      userRepository.findOne.mockResolvedValue(mockUser);

      // Mock UserChannel lookup with a linked YouTube channel
      userChannelRepository.findOne.mockResolvedValue({
        id: 'uc-1',
        userId: 'user-123',
        youtubeChannelId: 'yt-channel-123',
        youtubeChannel: mockYtChannel,
      } as any);

      // Mock TelegramChannel lookup with coAdminAdded: true
      telegramChannelRepository.findOne.mockResolvedValue({
        id: 1,
        channelHandle: 'test_channel',
        channelId: 'telegram-123',
        youtubeChannelId: 'yt-channel-123',
        youtubeChannel: mockYtChannel,
        coAdminAdded: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as TelegramChannel);

      const result = await service.createSignInContact(mockCreateProspectDto);

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Contact created or updated successfully in ZohoCRM',
          isCreator: true,
          isCoAdmin: true,
          hasAcceptedTerms: true,
        }),
      );
    });

    it('should short-circuit all onboarding flags for Admin users', async () => {
      const mockUser: User = {
        id: 'user-123',
        firebaseUid: 'firebase-uid-123',
        role: UserRole.Admin,
        displayName: 'John Doe',
        email: 'john.doe@example.com',
        userChannels: [],
        acceptedTerms: null,
        acceptedTermsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      zohoService.createContactFromSignIn.mockResolvedValue(undefined);
      firebaseAdminService.getFirebaseUidByGoogleId.mockResolvedValue(
        'firebase-uid-123',
      );
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.createSignInContact(mockCreateProspectDto);

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Contact created or updated successfully in ZohoCRM',
          isCreator: true,
          isCoAdmin: true,
          hasAcceptedTerms: true,
          youtubeConnected: true,
        }),
      );
    });

    it('should return isCreator false for Fan users', async () => {
      const mockUser: User = {
        id: 'user-123',
        firebaseUid: 'firebase-uid-123',
        role: UserRole.Fan,
        displayName: 'John Doe',
        email: 'john.doe@example.com',
        userChannels: [],
        acceptedTerms: null,
        acceptedTermsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      zohoService.createContactFromSignIn.mockResolvedValue(undefined);
      firebaseAdminService.getFirebaseUidByGoogleId.mockResolvedValue(
        'firebase-uid-123',
      );
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.createSignInContact(mockCreateProspectDto);

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Contact created or updated successfully in ZohoCRM',
          isCreator: false,
          isCoAdmin: false,
          hasAcceptedTerms: false,
        }),
      );
    });

    it('should handle Zoho service errors', async () => {
      const zohoError = new Error('Zoho API failed');
      zohoService.createContactFromSignIn.mockRejectedValue(zohoError);

      const result = await service.createSignInContact(mockCreateProspectDto);

      expect(zohoService.createContactFromSignIn).toHaveBeenCalledWith(
        mockCreateProspectDto,
      );
      expect(result).toEqual({
        success: false,
        message: 'Failed to create or update contact in ZohoCRM',
      });
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to create or update contact from sign-in',
        zohoError,
      );
    });
  });

  describe('cancelOnboarding', () => {
    const firebaseUid = 'test-firebase-uid';

    beforeEach(() => {
      // Mock Firebase Admin SDK
      const mockFirebaseAuth = {
        getUser: jest.fn().mockResolvedValue({ email: 'john.doe@example.com' }),
      };
      jest
        .spyOn(firebaseAdmin, 'auth')
        .mockReturnValue(mockFirebaseAuth as any);
    });

    it('should update contact cancellation successfully with reason and wantsUpdates', async () => {
      const mockUser = { id: 'user-123', firebaseUid };
      userRepository.findOne.mockResolvedValue(mockUser as any);
      zohoService.markContactOnboardingCancelled.mockResolvedValue(undefined);

      const result = await service.cancelOnboarding(firebaseUid, {
        reason: 'User closed window',
        wantsUpdates: true,
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid },
      });
      expect(zohoService.markContactOnboardingCancelled).toHaveBeenCalledWith(
        'john.doe@example.com',
        'User closed window',
        true,
      );
      expect(result).toEqual({
        success: true,
        message: 'Contact updated successfully in ZohoCRM',
      });
    });

    it('should update contact cancellation with wantsUpdates false', async () => {
      const mockUser = { id: 'user-123', firebaseUid };
      userRepository.findOne.mockResolvedValue(mockUser as any);
      zohoService.markContactOnboardingCancelled.mockResolvedValue(undefined);

      const result = await service.cancelOnboarding(firebaseUid, {
        reason: 'Changed my mind',
        wantsUpdates: false,
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid },
      });
      expect(zohoService.markContactOnboardingCancelled).toHaveBeenCalledWith(
        'john.doe@example.com',
        'Changed my mind',
        false,
      );
      expect(result).toEqual({
        success: true,
        message: 'Contact updated successfully in ZohoCRM',
      });
    });

    it('should default wantsUpdates to false when not provided', async () => {
      const mockUser = { id: 'user-123', firebaseUid };
      userRepository.findOne.mockResolvedValue(mockUser as any);
      zohoService.markContactOnboardingCancelled.mockResolvedValue(undefined);

      const result = await service.cancelOnboarding(firebaseUid, {
        reason: 'User closed window',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid },
      });
      expect(zohoService.markContactOnboardingCancelled).toHaveBeenCalledWith(
        'john.doe@example.com',
        'User closed window',
        false, // Should default to false
      );
      expect(result).toEqual({
        success: true,
        message: 'Contact updated successfully in ZohoCRM',
      });
    });

    it('should handle cancellation without reason but with wantsUpdates', async () => {
      const mockUser = { id: 'user-123', firebaseUid };
      userRepository.findOne.mockResolvedValue(mockUser as any);
      zohoService.markContactOnboardingCancelled.mockResolvedValue(undefined);

      const result = await service.cancelOnboarding(firebaseUid, {
        wantsUpdates: true,
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid },
      });
      expect(zohoService.markContactOnboardingCancelled).toHaveBeenCalledWith(
        'john.doe@example.com',
        undefined,
        true,
      );
      expect(result).toEqual({
        success: true,
        message: 'Contact updated successfully in ZohoCRM',
      });
    });

    it('should handle Zoho service errors', async () => {
      const mockUser = { id: 'user-123', firebaseUid };
      userRepository.findOne.mockResolvedValue(mockUser as any);

      const err = new Error('Zoho failure');
      zohoService.markContactOnboardingCancelled.mockRejectedValue(err);

      const result = await service.cancelOnboarding(firebaseUid, {});

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid },
      });
      expect(zohoService.markContactOnboardingCancelled).toHaveBeenCalledWith(
        'john.doe@example.com',
        undefined,
        false, // Should default to false
      );
      expect(result).toEqual({
        success: false,
        message: 'Failed to update contact in ZohoCRM',
      });
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to update contact for onboarding cancellation',
        err,
      );
    });
  });

  describe('assignCreatorRole', () => {
    it('should assign creator role to user', async () => {
      firebaseAdminService.addCustomClaim.mockResolvedValue(undefined);

      await service.assignCreatorRole(uid);

      expect(firebaseAdminService.addCustomClaim).toHaveBeenCalledWith(
        uid,
        'role',
        'creator',
      );
    });
  });

  describe('getCreatorOnboardingStatus', () => {
    it('should return defaults when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const result = await service.getCreatorOnboardingStatus(uid);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid: uid },
        relations: ['acceptedTerms'],
      });
      expect(result).toEqual(
        expect.objectContaining({
          isCreator: false,
          isCoAdmin: false,
          hasAcceptedTerms: false,
        }),
      );
    });

    it('should short-circuit all flags for admin users', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-123',
        role: UserRole.Admin,
        acceptedTerms: null,
      } as any);

      const result = await service.getCreatorOnboardingStatus(uid);
      expect(result).toEqual({
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true,
        youtubeConnected: true,
      });
      // Should not query for channels or tokens
      expect(userChannelRepository.findOne).not.toHaveBeenCalled();
      expect(youtubeOAuthTokenRepository.findOne).not.toHaveBeenCalled();
    });

    it('should short-circuit all flags for manager users', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-123',
        role: UserRole.Fan,
        acceptedTerms: null,
      } as any);

      // First findOne call for manager check returns a manager record
      userChannelRepository.findOne.mockResolvedValueOnce({
        id: 'uc-1',
        userId: 'user-123',
        role: UserChannelRole.Manager,
      } as any);

      const result = await service.getCreatorOnboardingStatus(uid);
      expect(result).toEqual({
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true,
        youtubeConnected: true,
      });
      expect(userChannelRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-123', role: UserChannelRole.Manager },
      });
    });

    it('should return status flags for existing creator user', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-123',
        role: UserRole.Creator,
        userChannels: [],
        acceptedTerms: {},
      } as any);

      // First findOne: manager check (no manager record)
      userChannelRepository.findOne.mockResolvedValueOnce(null);

      // Second findOne: owner channel check
      userChannelRepository.findOne.mockResolvedValueOnce({
        id: 'uc-1',
        userId: 'user-123',
        youtubeChannelId: 'yt-channel-123',
        youtubeChannel: { id: 'yt-channel-123' },
      } as any);

      // Mock TelegramChannel with coAdminAdded: true
      telegramChannelRepository.findOne.mockResolvedValue({
        id: 1,
        youtubeChannelId: 'yt-channel-123',
        coAdminAdded: true,
      } as any);

      const result = await service.getCreatorOnboardingStatus(uid);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid: uid },
        relations: ['acceptedTerms'],
      });
      expect(result).toEqual(
        expect.objectContaining({
          isCreator: true,
          isCoAdmin: true,
          hasAcceptedTerms: true,
        }),
      );
    });
  });

  describe('onboardCreator', () => {
    const mockCreateCreatorDto: CreateCreatorDto = {
      youtubeChannelId: 'UC1234567890',
      telegramHandle: 'johns_channel',
      youtubePayingUsersPercentage: 15.5,
      sponspayPayingUsersPercentage: 8.2,
    };

    const mockUser: User = {
      id: 'user-123',
      firebaseUid: uid,
      role: UserRole.Creator,
      displayName: 'John Doe',
      email: 'john.doe@example.com',
      userChannels: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      acceptedTerms: null,
      acceptedTermsAt: null,
    };

    const mockYouTubeChannel: YouTubeChannel = {
      id: 'channel-123',
      channelId: 'UC1234567890',
      channelName: "John's Channel",
      feePercentage: '15.00',
      snapshots: [],
      userChannels: [],
      telegramChannel: null as any,
      createdAt: new Date(),
    };

    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks();

      // Reset YouTube OAuth Service mocks to default values
      youtubeOAuthService.getChannelDataForEstimator.mockResolvedValue({
        connected: true,
        channels: [
          {
            id: 'UC1234567890',
            title: "John's Channel",
            subscriberCount: '100000',
            viewCount: '1000000',
            videoCount: '50',
            thumbnailUrl: 'https://example.com/thumbnail.jpg',
          },
        ],
      });
      youtubeOAuthService.getAnalyticsReport.mockResolvedValue({
        kind: 'youtubeAnalytics#resultTable',
        columnHeaders: [
          { name: 'country', columnType: 'DIMENSION', dataType: 'STRING' },
          { name: 'views', columnType: 'METRIC', dataType: 'INTEGER' },
          {
            name: 'subscribersGained',
            columnType: 'METRIC',
            dataType: 'INTEGER',
          },
        ],
        rows: [
          ['US', 5000, 100],
          ['GB', 2000, 50],
        ],
      });
    });

    it('should onboard new creator successfully', async () => {
      // Mock existing user (created during sign-in) with Fan role
      const existingFan = { ...mockUser, role: UserRole.Fan };
      userRepository.findOne.mockResolvedValue(existingFan);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock YouTube channel creation
      youtubeChannelRepository.create.mockReturnValue(mockYouTubeChannel);
      youtubeChannelRepository.save.mockResolvedValue(mockYouTubeChannel);

      // Mock channel snapshot creation
      const mockSnapshot = { id: 'snapshot-123' } as ChannelSnapshot;
      channelSnapshotRepository.create.mockReturnValue(mockSnapshot);
      channelSnapshotRepository.save.mockResolvedValue(mockSnapshot);

      // Mock Telegram channel creation
      telegramService.createPrivateChannel.mockResolvedValue({
        success: true,
        channelId: 'telegram-123',
      });

      // Mock Telegram channel entity creation
      const mockTelegramChannel = {
        id: 1,
        channelHandle: mockCreateCreatorDto.telegramHandle,
        channelId: 'telegram-123',
        youtubeChannelId: mockYouTubeChannel.id,
        youtubeChannel: mockYouTubeChannel,
        createdAt: new Date(),
        updatedAt: new Date(),
        coAdminAdded: false,
      } as TelegramChannel;
      telegramChannelRepository.create.mockReturnValue(mockTelegramChannel);
      telegramChannelRepository.save.mockResolvedValue(mockTelegramChannel);

      // Mock UserChannel entity creation
      const mockUserChannel = {
        id: 'uc-1',
        userId: mockUser.id,
        youtubeChannelId: mockYouTubeChannel.id,
      } as UserChannel;
      userChannelRepository.create.mockReturnValue(mockUserChannel);
      userChannelRepository.save.mockResolvedValue(mockUserChannel);

      // Mock Firebase role assignment
      firebaseAdminService.addCustomClaim.mockResolvedValue(undefined);

      const result = await service.onboardCreator(uid, mockCreateCreatorDto);

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid: uid },
      });
      expect(userRepository.update).toHaveBeenCalledWith(
        { firebaseUid: uid },
        { role: UserRole.Creator },
      );

      // Verify YouTube OAuth service calls
      expect(
        youtubeOAuthService.getChannelDataForEstimator,
      ).toHaveBeenCalledWith(mockUser.id);
      expect(youtubeOAuthService.getAnalyticsReport).toHaveBeenCalledWith(
        mockUser.id,
        mockCreateCreatorDto.youtubeChannelId,
        12,
      );

      expect(youtubeChannelRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: mockCreateCreatorDto.youtubeChannelId,
          channelName: "John's Channel",
        }),
      );
      expect(channelSnapshotRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: mockYouTubeChannel.id,
          youtubePayingUsersPercentage:
            mockCreateCreatorDto.youtubePayingUsersPercentage,
          sponspayPayingUsersPercentage:
            mockCreateCreatorDto.sponspayPayingUsersPercentage,
        }),
      );
      expect(telegramService.createPrivateChannel).toHaveBeenCalledWith(
        mockCreateCreatorDto.telegramHandle,
      );
      expect(telegramChannelRepository.create).toHaveBeenCalledWith({
        channelHandle: mockCreateCreatorDto.telegramHandle,
        channelId: 'telegram-123',
        youtubeChannelId: mockYouTubeChannel.id,
      });
      expect(telegramChannelRepository.save).toHaveBeenCalledWith(
        mockTelegramChannel,
      );
      expect(firebaseAdminService.addCustomClaim).toHaveBeenCalledWith(
        uid,
        'role',
        UserRole.Creator,
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();

      expect(result).toEqual({
        success: true,
        message: 'Creator onboarded successfully',
        data: {
          userId: mockUser.id,
          youtubeChannelId: mockYouTubeChannel.id,
          telegramChannelHandle: mockCreateCreatorDto.telegramHandle,
          role: UserRole.Creator,
        },
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: false,
      });
    });

    it('should upgrade existing user to creator role', async () => {
      const existingUser = { ...mockUser, role: UserRole.Fan };

      // Mock existing user found
      userRepository.findOne.mockResolvedValue(existingUser);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock YouTube channel creation
      youtubeChannelRepository.create.mockReturnValue(mockYouTubeChannel);
      youtubeChannelRepository.save.mockResolvedValue(mockYouTubeChannel);

      // Mock channel snapshot creation
      const mockSnapshot = { id: 'snapshot-123' } as ChannelSnapshot;
      channelSnapshotRepository.create.mockReturnValue(mockSnapshot);
      channelSnapshotRepository.save.mockResolvedValue(mockSnapshot);

      // Mock Telegram channel creation
      telegramService.createPrivateChannel.mockResolvedValue({
        success: true,
        channelId: 'telegram-123',
      });

      // Mock Telegram channel entity creation
      const mockTelegramChannel = {
        id: 1,
        channelHandle: mockCreateCreatorDto.telegramHandle,
        channelId: 'telegram-123',
        youtubeChannelId: mockYouTubeChannel.id,
        youtubeChannel: mockYouTubeChannel,
        createdAt: new Date(),
        updatedAt: new Date(),
        coAdminAdded: false,
      } as TelegramChannel;
      telegramChannelRepository.create.mockReturnValue(mockTelegramChannel);
      telegramChannelRepository.save.mockResolvedValue(mockTelegramChannel);

      // Mock UserChannel entity creation
      const mockUserChannel = {
        id: 'uc-1',
        userId: mockUser.id,
        youtubeChannelId: mockYouTubeChannel.id,
      } as UserChannel;
      userChannelRepository.create.mockReturnValue(mockUserChannel);
      userChannelRepository.save.mockResolvedValue(mockUserChannel);

      // Mock Firebase role assignment
      firebaseAdminService.addCustomClaim.mockResolvedValue(undefined);

      const result = await service.onboardCreator(uid, mockCreateCreatorDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid: uid },
      });
      expect(userRepository.update).toHaveBeenCalledWith(
        { firebaseUid: uid },
        {
          role: UserRole.Creator,
        },
      );

      // Verify YouTube OAuth service calls
      expect(
        youtubeOAuthService.getChannelDataForEstimator,
      ).toHaveBeenCalledWith(existingUser.id);
      expect(youtubeOAuthService.getAnalyticsReport).toHaveBeenCalledWith(
        existingUser.id,
        mockCreateCreatorDto.youtubeChannelId,
        12,
      );

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should preserve Admin role when Admin user onboards as creator', async () => {
      const existingAdmin = { ...mockUser, role: UserRole.Admin };

      // Mock existing admin user found
      userRepository.findOne.mockResolvedValue(existingAdmin);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock YouTube channel creation
      youtubeChannelRepository.create.mockReturnValue(mockYouTubeChannel);
      youtubeChannelRepository.save.mockResolvedValue(mockYouTubeChannel);

      // Mock channel snapshot creation
      const mockSnapshot = { id: 'snapshot-123' } as ChannelSnapshot;
      channelSnapshotRepository.create.mockReturnValue(mockSnapshot);
      channelSnapshotRepository.save.mockResolvedValue(mockSnapshot);

      // Mock Telegram channel creation
      telegramService.createPrivateChannel.mockResolvedValue({
        success: true,
        channelId: 'telegram-123',
      });

      // Mock Telegram channel entity creation
      const mockTelegramChannel = {
        id: 1,
        channelHandle: mockCreateCreatorDto.telegramHandle,
        channelId: 'telegram-123',
        youtubeChannelId: mockYouTubeChannel.id,
        youtubeChannel: mockYouTubeChannel,
        createdAt: new Date(),
        updatedAt: new Date(),
        coAdminAdded: false,
      } as TelegramChannel;
      telegramChannelRepository.create.mockReturnValue(mockTelegramChannel);
      telegramChannelRepository.save.mockResolvedValue(mockTelegramChannel);

      // Mock UserChannel entity creation
      const mockUserChannel = {
        id: 'uc-1',
        userId: mockUser.id,
        youtubeChannelId: mockYouTubeChannel.id,
      } as UserChannel;
      userChannelRepository.create.mockReturnValue(mockUserChannel);
      userChannelRepository.save.mockResolvedValue(mockUserChannel);

      const result = await service.onboardCreator(uid, mockCreateCreatorDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid: uid },
      });
      expect(userRepository.update).toHaveBeenCalledWith(
        { firebaseUid: uid },
        {
          role: UserRole.Admin, // Should preserve Admin role
        },
      );

      // Verify YouTube OAuth service calls
      expect(
        youtubeOAuthService.getChannelDataForEstimator,
      ).toHaveBeenCalledWith(existingAdmin.id);
      expect(youtubeOAuthService.getAnalyticsReport).toHaveBeenCalledWith(
        existingAdmin.id,
        mockCreateCreatorDto.youtubeChannelId,
        12,
      );

      // Firebase role assignment should NOT be called for Admin users
      expect(firebaseAdminService.addCustomClaim).not.toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data!.role).toBe(UserRole.Admin); // Response should show Admin role
    });

    it('should throw BadRequestException if user does not exist', async () => {
      // Mock no user found (user must sign in first)
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.onboardCreator(uid, mockCreateCreatorDto),
      ).rejects.toThrow(BadRequestException);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid: uid },
      });
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw ConflictException if user is already a creator', async () => {
      const existingCreator = { ...mockUser, role: UserRole.Creator };

      // Mock existing creator found
      userRepository.findOne.mockResolvedValue(existingCreator);

      await expect(
        service.onboardCreator(uid, mockCreateCreatorDto),
      ).rejects.toThrow(ConflictException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw ConflictException if YouTube channel is already owned by an onboarded user', async () => {
      const existingFan = { ...mockUser, role: UserRole.Fan };
      // First findOne: current user; Second findOne: the onboarded owner (Creator, regardless of terms)
      userRepository.findOne
        .mockResolvedValueOnce(existingFan)
        .mockResolvedValueOnce({
          id: 'other-user-id',
          role: UserRole.Creator,
        } as any);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock YouTube channel already exists in DB
      youtubeChannelRepository.findOne.mockResolvedValue(mockYouTubeChannel);

      // Mock another user already owns this channel
      userChannelRepository.findOne.mockResolvedValue({
        id: 'uc-other',
        userId: 'other-user-id',
        youtubeChannelId: mockYouTubeChannel.id,
        role: UserChannelRole.Owner,
      } as UserChannel);

      await expect(
        service.onboardCreator(uid, mockCreateCreatorDto),
      ).rejects.toThrow(ConflictException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should remove stale ownership and proceed if previous owner is still a Fan', async () => {
      const existingFan = { ...mockUser, role: UserRole.Fan };
      // First findOne: current user; Second findOne: the stale owner (still Fan — never called /onboard)
      userRepository.findOne
        .mockResolvedValueOnce(existingFan)
        .mockResolvedValueOnce({
          id: 'other-user-id',
          role: UserRole.Fan,
        } as any);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock YouTube channel already exists in DB
      youtubeChannelRepository.findOne.mockResolvedValue(mockYouTubeChannel);
      youtubeChannelRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock another user owns this channel but never completed onboarding
      userChannelRepository.findOne.mockResolvedValue({
        id: 'uc-other',
        userId: 'other-user-id',
        youtubeChannelId: mockYouTubeChannel.id,
        role: UserChannelRole.Owner,
      } as UserChannel);
      userChannelRepository.delete = jest
        .fn()
        .mockResolvedValue({ affected: 1 }) as any;
      userChannelRepository.upsert.mockResolvedValue(undefined as any);

      // Mock Telegram channel creation
      telegramService.createPrivateChannel.mockResolvedValue({
        success: true,
        channelId: 'telegram-123',
      });
      telegramChannelRepository.create.mockReturnValue({} as any);
      telegramChannelRepository.save.mockResolvedValue({} as any);

      // Mock Firebase role assignment
      firebaseAdminService.addCustomClaim.mockResolvedValue(undefined);

      const result = await service.onboardCreator(uid, mockCreateCreatorDto);

      // Stale ownership should be removed
      expect(userChannelRepository.delete).toHaveBeenCalledWith({
        id: 'uc-other',
      });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException if YouTube is not connected', async () => {
      // Mock existing user (created during sign-in) with Fan role
      const existingFan = { ...mockUser, role: UserRole.Fan };
      userRepository.findOne.mockResolvedValue(existingFan);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock YouTube not connected
      youtubeOAuthService.getChannelDataForEstimator.mockResolvedValue({
        connected: false,
        error: 'Not connected',
      });

      await expect(
        service.onboardCreator(uid, mockCreateCreatorDto),
      ).rejects.toThrow(BadRequestException);

      expect(
        youtubeOAuthService.getChannelDataForEstimator,
      ).toHaveBeenCalledWith(existingFan.id);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no YouTube channels found', async () => {
      // Mock existing user (created during sign-in) with Fan role
      const existingFan = { ...mockUser, role: UserRole.Fan };
      userRepository.findOne.mockResolvedValue(existingFan);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock YouTube connected but no channels
      youtubeOAuthService.getChannelDataForEstimator.mockResolvedValue({
        connected: true,
        channels: [],
      });

      await expect(
        service.onboardCreator(uid, mockCreateCreatorDto),
      ).rejects.toThrow(BadRequestException);

      expect(
        youtubeOAuthService.getChannelDataForEstimator,
      ).toHaveBeenCalledWith(existingFan.id);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw error if Telegram channel creation fails', async () => {
      // Mock existing user (created during sign-in) with Fan role
      const existingFan = { ...mockUser, role: UserRole.Fan };
      userRepository.findOne.mockResolvedValue(existingFan);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock YouTube channel creation
      youtubeChannelRepository.create.mockReturnValue(mockYouTubeChannel);
      youtubeChannelRepository.save.mockResolvedValue(mockYouTubeChannel);

      // Mock channel snapshot creation
      const mockSnapshot = { id: 'snapshot-123' } as ChannelSnapshot;
      channelSnapshotRepository.create.mockReturnValue(mockSnapshot);
      channelSnapshotRepository.save.mockResolvedValue(mockSnapshot);

      // Mock Telegram channel creation failure
      telegramService.createPrivateChannel.mockResolvedValue({
        success: false,
      });

      await expect(
        service.onboardCreator(uid, mockCreateCreatorDto),
      ).rejects.toThrow('Failed to onboard creator. Please try again.');

      expect(telegramService.createPrivateChannel).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to onboard creator:',
        expect.any(Error),
      );
    });

    it('should rollback transaction on database error', async () => {
      // Mock existing user (created during sign-in) with Fan role
      const existingFan = { ...mockUser, role: UserRole.Fan };
      userRepository.findOne.mockResolvedValue(existingFan);

      // Mock user update failure
      userRepository.update.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(
        service.onboardCreator(uid, mockCreateCreatorDto),
      ).rejects.toThrow('Failed to onboard creator. Please try again.');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to onboard creator:',
        expect.any(Error),
      );
    });

    it('should link existing YouTubeChannel and skip snapshot creation', async () => {
      // Mock existing user (created during sign-in) with Fan role
      const existingFan = { ...mockUser, role: UserRole.Fan };
      userRepository.findOne.mockResolvedValue(existingFan);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock existing YouTube channel (created during sign-in)
      const existingChannel: YouTubeChannel = {
        id: 'existing-channel-123',
        channelId: 'UC1234567890',
        channelName: 'Old Channel Name',
        feePercentage: '15.00',
        snapshots: [],
        userChannels: [],
        telegramChannel: null as any,
        createdAt: new Date(),
      };
      youtubeChannelRepository.findOne.mockResolvedValue(existingChannel);
      youtubeChannelRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock Telegram channel creation
      telegramService.createPrivateChannel.mockResolvedValue({
        success: true,
        channelId: 'telegram-123',
      });

      const mockTelegramChannel = {
        id: 1,
        channelHandle: mockCreateCreatorDto.telegramHandle,
        channelId: 'telegram-123',
        youtubeChannelId: existingChannel.id,
      } as TelegramChannel;
      telegramChannelRepository.create.mockReturnValue(mockTelegramChannel);
      telegramChannelRepository.save.mockResolvedValue(mockTelegramChannel);

      // Mock UserChannel entity creation
      const mockUserChannel = {
        id: 'uc-1',
        userId: mockUser.id,
        youtubeChannelId: existingChannel.id,
      } as UserChannel;
      userChannelRepository.create.mockReturnValue(mockUserChannel);
      userChannelRepository.save.mockResolvedValue(mockUserChannel);

      firebaseAdminService.addCustomClaim.mockResolvedValue(undefined);

      const result = await service.onboardCreator(uid, mockCreateCreatorDto);

      // Should find existing channel
      expect(youtubeChannelRepository.findOne).toHaveBeenCalledWith({
        where: { channelId: mockCreateCreatorDto.youtubeChannelId },
      });

      // Should update existing channel name
      expect(youtubeChannelRepository.update).toHaveBeenCalledWith(
        { id: existingChannel.id },
        expect.objectContaining({
          channelName: "John's Channel",
        }),
      );

      // Should NOT create a new channel
      expect(youtubeChannelRepository.create).not.toHaveBeenCalled();

      // Should NOT create snapshot (avoiding duplication)
      expect(channelSnapshotRepository.create).not.toHaveBeenCalled();

      // Should log about linking and skipping
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Linked existing YouTubeChannel'),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Skipped snapshot creation'),
      );

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle Firebase role assignment errors gracefully', async () => {
      // Mock existing user (created during sign-in) with Fan role
      const existingFan = { ...mockUser, role: UserRole.Fan };
      userRepository.findOne.mockResolvedValue(existingFan);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock YouTube channel creation
      youtubeChannelRepository.create.mockReturnValue(mockYouTubeChannel);
      youtubeChannelRepository.save.mockResolvedValue(mockYouTubeChannel);

      // Mock channel snapshot creation
      const mockSnapshot = { id: 'snapshot-123' } as ChannelSnapshot;
      channelSnapshotRepository.create.mockReturnValue(mockSnapshot);
      channelSnapshotRepository.save.mockResolvedValue(mockSnapshot);

      // Mock Telegram channel creation
      telegramService.createPrivateChannel.mockResolvedValue({
        success: true,
        channelId: 'telegram-123',
      });

      // Mock Telegram channel entity creation
      const mockTelegramChannel = {
        id: 1,
        channelHandle: mockCreateCreatorDto.telegramHandle,
        channelId: 'telegram-123',
        youtubeChannelId: mockYouTubeChannel.id,
        youtubeChannel: mockYouTubeChannel,
        createdAt: new Date(),
        updatedAt: new Date(),
        coAdminAdded: false,
      } as TelegramChannel;
      telegramChannelRepository.create.mockReturnValue(mockTelegramChannel);
      telegramChannelRepository.save.mockResolvedValue(mockTelegramChannel);

      // Mock UserChannel entity creation
      const mockUserChannel = {
        id: 'uc-1',
        userId: mockUser.id,
        youtubeChannelId: mockYouTubeChannel.id,
      } as UserChannel;
      userChannelRepository.create.mockReturnValue(mockUserChannel);
      userChannelRepository.save.mockResolvedValue(mockUserChannel);

      // Mock Firebase role assignment failure
      const firebaseError = new Error('Firebase error');
      firebaseAdminService.addCustomClaim.mockRejectedValue(firebaseError);

      await expect(
        service.onboardCreator(uid, mockCreateCreatorDto),
      ).rejects.toThrow('Failed to onboard creator. Please try again.');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to onboard creator:',
        firebaseError,
      );
    });
  });

  describe('acceptTerms', () => {
    const uid = 'firebase123';

    it('should throw error if user does not exist', async () => {
      const userRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      } as any;
      const terms: Terms = {
        id: 'terms1',
        version: 1,
        html: '<p>t1</p>',
        createdAt: new Date(),
      } as Terms;
      const termsRepo = {
        findOne: jest.fn().mockResolvedValue(terms),
      } as any;
      jest.spyOn(dataSource, 'getRepository').mockImplementation((entity) => {
        if (entity === User) return userRepo;
        if (entity === Terms) return termsRepo;
        return {} as any;
      });

      await expect(service.acceptTerms(uid, 1)).rejects.toThrow(
        'User not found. User must be onboarded as a creator before accepting terms.',
      );
      expect(termsRepo.findOne).toHaveBeenCalledWith({ where: { version: 1 } });
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { firebaseUid: uid },
      });
    });

    it('should update existing user', async () => {
      const existingUser = { firebaseUid: uid, role: UserRole.Fan } as User;
      const userRepo = {
        findOne: jest.fn().mockResolvedValue(existingUser),
        save: jest.fn().mockResolvedValue(existingUser),
      } as any;
      const terms: Terms = {
        id: 'terms2',
        version: 2,
        html: '<p>t2</p>',
        createdAt: new Date(),
      } as Terms;
      const termsRepo = { findOne: jest.fn().mockResolvedValue(terms) } as any;
      jest.spyOn(dataSource, 'getRepository').mockImplementation((entity) => {
        if (entity === User) return userRepo;
        if (entity === Terms) return termsRepo;
        return {} as any;
      });

      const result = await service.acceptTerms(uid, 2);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { firebaseUid: uid },
      });
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ acceptedTerms: terms }),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('getUserChannels', () => {
    it('should return only user channels when isAdmin is false', async () => {
      const mockUserChannels = [
        {
          youtubeChannel: {
            id: 'yt-1',
            channelId: 'UC111',
            channelName: 'Channel One',
          },
          role: 'owner',
          createdAt: new Date('2025-01-01'),
        },
      ];
      userChannelRepository.find.mockResolvedValue(mockUserChannels as any);
      telegramChannelRepository.findOne.mockResolvedValue({
        channelHandle: 'chan_one',
      } as any);

      const result = await service.getUserChannels(uid, false);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'yt-1',
          youtubeChannelId: 'UC111',
          channelName: 'Channel One',
          telegramHandle: 'chan_one',
          role: 'owner',
        }),
      );
    });

    it('should return all channels when isAdmin is true', async () => {
      const mockChannels = [
        {
          id: 'yt-1',
          channelId: 'UC111',
          channelName: 'Channel One',
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 'yt-2',
          channelId: 'UC222',
          channelName: 'Channel Two',
          createdAt: new Date('2025-02-01'),
        },
      ];
      youtubeChannelRepository.find = jest
        .fn()
        .mockResolvedValue(mockChannels) as any;
      telegramChannelRepository.findOne
        .mockResolvedValueOnce({ channelHandle: 'chan_one' } as any)
        .mockResolvedValueOnce({ channelHandle: 'chan_two' } as any);

      const result = await service.getUserChannels(uid, true);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('admin');
      expect(result[1].role).toBe('admin');
      expect(result[0].channelName).toBe('Channel One');
      expect(result[1].channelName).toBe('Channel Two');
    });
  });

  describe('transformAnalyticsToCountryAnalysis', () => {
    it('should transform YouTube Analytics response to countryAnalysis format', () => {
      const analyticsReport = {
        columnHeaders: [
          { name: 'country' },
          { name: 'views' },
          { name: 'subscribersGained' },
        ],
        rows: [
          ['US', 10000, 500],
          ['GB', 5000, 250],
          ['KE', 3000, 150],
        ],
      };

      const result =
        service['transformAnalyticsToCountryAnalysis'](analyticsReport);

      expect(result).toEqual({
        US: { views: 10000, subscribers: 500 },
        GB: { views: 5000, subscribers: 250 },
        KE: { views: 3000, subscribers: 150 },
      });
    });

    it('should return empty object when analyticsReport is null/undefined', () => {
      expect(service['transformAnalyticsToCountryAnalysis'](null)).toEqual({});
      expect(service['transformAnalyticsToCountryAnalysis'](undefined)).toEqual(
        {},
      );
    });

    it('should return empty object when rows array is empty', () => {
      const analyticsReport = {
        columnHeaders: [],
        rows: [],
      };

      const result =
        service['transformAnalyticsToCountryAnalysis'](analyticsReport);

      expect(result).toEqual({});
    });

    it('should handle null/undefined values in rows by defaulting to 0', () => {
      const analyticsReport = {
        columnHeaders: [
          { name: 'country' },
          { name: 'views' },
          { name: 'subscribersGained' },
        ],
        rows: [
          ['US', null, undefined],
          ['GB', 0, null],
        ],
      };

      const result =
        service['transformAnalyticsToCountryAnalysis'](analyticsReport);

      expect(result).toEqual({
        US: { views: 0, subscribers: 0 },
        GB: { views: 0, subscribers: 0 },
      });
    });

    it('should handle single country result', () => {
      const analyticsReport = {
        columnHeaders: [
          { name: 'country' },
          { name: 'views' },
          { name: 'subscribersGained' },
        ],
        rows: [['KE', 15000, 750]],
      };

      const result =
        service['transformAnalyticsToCountryAnalysis'](analyticsReport);

      expect(result).toEqual({
        KE: { views: 15000, subscribers: 750 },
      });
    });
  });
});
