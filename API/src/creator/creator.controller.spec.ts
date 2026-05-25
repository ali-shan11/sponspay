import { Test, TestingModule } from '@nestjs/testing';
import { CreatorController } from './creator.controller';
import { CreatorService } from './creator.service';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { CreatorOnboardingResponseDto } from './dto/creator-onboarding-response.dto';
import { UserRole } from './enums/user.enum';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('CreatorController', () => {
  let controller: CreatorController;
  let creatorService: jest.Mocked<CreatorService>;

  beforeEach(async () => {
    const mockCreatorService = {
      createSignInContact: jest.fn(),
      assignCreatorRole: jest.fn(),
      onboardCreator: jest.fn(),
      acceptTerms: jest.fn(),
      getCreatorOnboardingStatus: jest.fn(),
      cancelOnboarding: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreatorController],
      providers: [
        {
          provide: CreatorService,
          useValue: mockCreatorService,
        },
      ],
    })
      // sign-in-contact uses ApiKeyGuard - bypass it in tests
      .overrideGuard(ApiKeyGuard)
      .useValue({
        canActivate: () => true,
      })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CreatorController>(CreatorController);
    creatorService = module.get(CreatorService) as jest.Mocked<CreatorService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

    it('should create prospect successfully', async () => {
      const expectedResult = {
        success: true,
        message: 'Contact created or updated successfully in ZohoCRM',
      };
      creatorService.createSignInContact.mockResolvedValue(expectedResult);

      const result = await controller.createSignInContact(
        mockCreateProspectDto,
      );

      expect(creatorService.createSignInContact).toHaveBeenCalledWith(
        mockCreateProspectDto,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Service unavailable');
      creatorService.createSignInContact.mockRejectedValue(serviceError);

      await expect(
        controller.createSignInContact(mockCreateProspectDto),
      ).rejects.toThrow(serviceError);
      expect(creatorService.createSignInContact).toHaveBeenCalledWith(
        mockCreateProspectDto,
      );
    });

    it('should handle prospect with minimal data', async () => {
      const minimalProspectDto: CreateProspectDto = {
        displayName: 'Jane Smith',
        email: 'jane.smith@example.com',
        googleUserId: 'google456',
      };

      const expectedResult = {
        success: true,
        message: 'Contact created or updated successfully in ZohoCRM',
      };
      creatorService.createSignInContact.mockResolvedValue(expectedResult);

      const result = await controller.createSignInContact(minimalProspectDto);

      expect(creatorService.createSignInContact).toHaveBeenCalledWith(
        minimalProspectDto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('cancelOnboarding', () => {
    const dto = { email: 'john.doe@example.com', reason: 'left flow' };

    it('should cancel onboarding successfully', async () => {
      const expected = {
        success: true,
        message: 'Contact updated successfully in ZohoCRM',
      };
      creatorService.cancelOnboarding.mockResolvedValue(expected);

      const req: any = { user: { uid: 'firebase123' } };
      const result = await controller.cancelOnboarding(dto, req);

      expect(creatorService.cancelOnboarding).toHaveBeenCalledWith(
        'firebase123',
        dto,
      );
      expect(result).toEqual(expected);
    });

    it('should handle service errors', async () => {
      const err = new Error('service error');
      const req: any = { user: { uid: 'firebase123' } };
      creatorService.cancelOnboarding.mockRejectedValue(err);
      await expect(controller.cancelOnboarding(dto, req)).rejects.toThrow(err);
      expect(creatorService.cancelOnboarding).toHaveBeenCalledWith(
        'firebase123',
        dto,
      );
    });
  });

  describe('acceptTerms', () => {
    it('should call service with uid and version', async () => {
      const req: any = { user: { uid: 'firebase123' } };
      creatorService.acceptTerms.mockResolvedValue({ success: true });
      const result = await controller.acceptTerms({ version: 1 }, req);
      expect(creatorService.acceptTerms).toHaveBeenCalledWith('firebase123', 1);
      expect(result).toEqual({ success: true });
    });

    it('should throw if uid missing', async () => {
      await expect(
        controller.acceptTerms({ version: 1 }, {} as any),
      ).rejects.toThrow('Missing Firebase user identity');
    });
  });

  describe('onboardCreator', () => {
    const uid = 'firebase123';
    const req: any = { user: { uid } };

    const mockCreateCreatorDto: CreateCreatorDto = {
      youtubeChannelId: 'UC1234567890',
      telegramHandle: 'johns_channel',
      youtubePayingUsersPercentage: 15.5,
      sponspayPayingUsersPercentage: 8.2,
    };

    it('should onboard creator successfully', async () => {
      const expectedResult: CreatorOnboardingResponseDto = {
        success: true,
        message: 'Creator onboarded successfully',
        data: {
          userId: 'user-123',
          youtubeChannelId: 'channel-123',
          telegramChannelHandle: 'johns_channel',
          role: UserRole.Creator,
        },
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: false,
      };

      creatorService.getCreatorOnboardingStatus.mockResolvedValueOnce({
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        youtubeConnected: false,
      });
      creatorService.onboardCreator.mockResolvedValue(expectedResult);

      const result = await controller.onboardCreator(mockCreateCreatorDto, req);

      expect(creatorService.getCreatorOnboardingStatus).toHaveBeenCalledWith(
        uid,
      );
      expect(creatorService.onboardCreator).toHaveBeenCalledWith(
        uid,
        mockCreateCreatorDto,
      );
      expect(result).toEqual({
        ...expectedResult,
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        youtubeConnected: false,
      });
    });

    it('should return status when user is already a creator', async () => {
      creatorService.getCreatorOnboardingStatus.mockResolvedValueOnce({
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true,
        youtubeConnected: false,
      });

      const result = await controller.onboardCreator(mockCreateCreatorDto, req);

      expect(creatorService.onboardCreator).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'User already onboarded as a creator',
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true,
        youtubeConnected: false,
      });
    });

    it('should handle service errors during onboarding', async () => {
      const serviceError = new Error(
        'Failed to onboard creator. Please try again.',
      );
      creatorService.getCreatorOnboardingStatus.mockResolvedValueOnce({
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        youtubeConnected: false,
      });
      creatorService.onboardCreator.mockRejectedValue(serviceError);

      await expect(
        controller.onboardCreator(mockCreateCreatorDto, req),
      ).rejects.toThrow(serviceError);

      expect(creatorService.getCreatorOnboardingStatus).toHaveBeenCalledWith(
        uid,
      );
      expect(creatorService.onboardCreator).toHaveBeenCalledWith(
        uid,
        mockCreateCreatorDto,
      );
    });

    it('should handle creator onboarding with all required fields', async () => {
      const completeCreatorDto: CreateCreatorDto = {
        youtubeChannelId: 'UC9876543210',
        telegramHandle: 'janes_tech_channel',
        youtubePayingUsersPercentage: 22.3,
        sponspayPayingUsersPercentage: 12.7,
      };

      const expectedResult: CreatorOnboardingResponseDto = {
        success: true,
        message: 'Creator onboarded successfully',
        data: {
          userId: 'user-456',
          youtubeChannelId: 'channel-456',
          telegramChannelHandle: 'janes_tech_channel',
          role: UserRole.Creator,
        },
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: false,
      };

      creatorService.getCreatorOnboardingStatus.mockResolvedValueOnce({
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        youtubeConnected: false,
      });
      creatorService.onboardCreator.mockResolvedValue(expectedResult);

      const result = await controller.onboardCreator(completeCreatorDto, req);

      expect(creatorService.getCreatorOnboardingStatus).toHaveBeenCalledWith(
        uid,
      );
      expect(creatorService.onboardCreator).toHaveBeenCalledWith(
        uid,
        completeCreatorDto,
      );
      expect(result).toEqual({
        ...expectedResult,
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        youtubeConnected: false,
      });
    });

    it('should handle creator onboarding with edge case percentages', async () => {
      const edgeCaseDto: CreateCreatorDto = {
        ...mockCreateCreatorDto,
        youtubePayingUsersPercentage: 0,
        sponspayPayingUsersPercentage: 100,
      };

      const expectedResult: CreatorOnboardingResponseDto = {
        success: true,
        message: 'Creator onboarded successfully',
        data: {
          userId: 'user-789',
          youtubeChannelId: 'channel-789',
          telegramChannelHandle: 'johns_channel',
          role: UserRole.Creator,
        },
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: false,
      };

      creatorService.getCreatorOnboardingStatus.mockResolvedValueOnce({
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        youtubeConnected: false,
      });
      creatorService.onboardCreator.mockResolvedValue(expectedResult);

      const result = await controller.onboardCreator(edgeCaseDto, req);

      expect(creatorService.getCreatorOnboardingStatus).toHaveBeenCalledWith(
        uid,
      );
      expect(creatorService.onboardCreator).toHaveBeenCalledWith(
        uid,
        edgeCaseDto,
      );
      expect(result).toEqual({
        ...expectedResult,
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        youtubeConnected: false,
      });
    });
  });
});
