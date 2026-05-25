import { Test, TestingModule } from '@nestjs/testing';
import { UserProfileBackfillService } from './user-profile-backfill.service';
import { DataSource, Repository } from 'typeorm';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user.enum';
import { Logger } from '@nestjs/common';

describe('UserProfileBackfillService', () => {
  let service: UserProfileBackfillService;
  let userRepository: jest.Mocked<Repository<User>>;
  let firebaseAdminService: jest.Mocked<FirebaseAdminService>;

  beforeEach(async () => {
    userRepository = {
      find: jest.fn(),
      save: jest.fn(),
    } as any;

    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue(userRepository),
    };

    const mockFirebaseAdminService = {
      getUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileBackfillService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: FirebaseAdminService, useValue: mockFirebaseAdminService },
      ],
    }).compile();

    service = module.get<UserProfileBackfillService>(
      UserProfileBackfillService,
    );
    firebaseAdminService = module.get(FirebaseAdminService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should skip when all users already have displayName and email', async () => {
    userRepository.find.mockResolvedValue([]);

    await service.onApplicationBootstrap();

    expect(userRepository.find).toHaveBeenCalled();
    expect(firebaseAdminService.getUser).not.toHaveBeenCalled();
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      'All users already have displayName and email.',
    );
  });

  it('should backfill users with null displayName and email from Firebase', async () => {
    const mockUser: User = {
      id: 'user-1',
      firebaseUid: 'firebase-uid-1',
      role: UserRole.Fan,
      displayName: null,
      email: null,
      userChannels: [],
      acceptedTerms: null,
      acceptedTermsAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    userRepository.find.mockResolvedValue([mockUser]);
    firebaseAdminService.getUser.mockResolvedValue({
      displayName: 'John Doe',
      email: 'john@example.com',
    } as any);
    userRepository.save.mockResolvedValue(mockUser);

    await service.onApplicationBootstrap();

    expect(firebaseAdminService.getUser).toHaveBeenCalledWith('firebase-uid-1');
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'John Doe',
        email: 'john@example.com',
      }),
    );
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      'Backfilled displayName/email for 1 users.',
    );
  });

  it('should only backfill null fields and preserve existing values', async () => {
    const mockUser: User = {
      id: 'user-1',
      firebaseUid: 'firebase-uid-1',
      role: UserRole.Fan,
      displayName: 'Existing Name',
      email: null,
      userChannels: [],
      acceptedTerms: null,
      acceptedTermsAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    userRepository.find.mockResolvedValue([mockUser]);
    firebaseAdminService.getUser.mockResolvedValue({
      displayName: 'Firebase Name',
      email: 'john@example.com',
    } as any);
    userRepository.save.mockResolvedValue(mockUser);

    await service.onApplicationBootstrap();

    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'Existing Name',
        email: 'john@example.com',
      }),
    );
  });

  it('should skip user when Firebase returns null', async () => {
    const mockUser: User = {
      id: 'user-1',
      firebaseUid: 'firebase-uid-1',
      role: UserRole.Fan,
      displayName: null,
      email: null,
      userChannels: [],
      acceptedTerms: null,
      acceptedTermsAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    userRepository.find.mockResolvedValue([mockUser]);
    firebaseAdminService.getUser.mockResolvedValue(null);

    await service.onApplicationBootstrap();

    expect(userRepository.save).not.toHaveBeenCalled();
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      'Could not fetch Firebase user for UID: firebase-uid-1, skipping.',
    );
  });

  it('should continue processing when one user fails', async () => {
    const user1: User = {
      id: 'user-1',
      firebaseUid: 'firebase-uid-1',
      role: UserRole.Fan,
      displayName: null,
      email: null,
      userChannels: [],
      acceptedTerms: null,
      acceptedTermsAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const user2: User = {
      id: 'user-2',
      firebaseUid: 'firebase-uid-2',
      role: UserRole.Fan,
      displayName: null,
      email: null,
      userChannels: [],
      acceptedTerms: null,
      acceptedTermsAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    userRepository.find.mockResolvedValue([user1, user2]);
    firebaseAdminService.getUser
      .mockRejectedValueOnce(new Error('Firebase error'))
      .mockResolvedValueOnce({
        displayName: 'User Two',
        email: 'user2@example.com',
      } as any);
    userRepository.save.mockResolvedValue(user2);

    await service.onApplicationBootstrap();

    expect(firebaseAdminService.getUser).toHaveBeenCalledTimes(2);
    expect(userRepository.save).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to backfill user firebase-uid-1'),
    );
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      'Backfilled displayName/email for 1 users.',
    );
  });

  it('should handle overall failure gracefully', async () => {
    userRepository.find.mockRejectedValue(new Error('DB connection failed'));

    await service.onApplicationBootstrap();

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'User profile backfill failed',
      expect.any(Error),
    );
  });
});
