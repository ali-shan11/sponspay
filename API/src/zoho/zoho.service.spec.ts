import { Test, TestingModule } from '@nestjs/testing';
import { ZohoService } from './zoho.service';
import { ZohoApiService } from './services/zoho-api.service';
import { ZohoTokenService } from './services/zoho-token.service';
import { ZohoContactService } from './services/zoho-contact.service';
import { ZohoLeadService } from './services/zoho-lead.service';
import { ContactUsDTO } from '../marketing/dto/contact-us.dto';
import { CreateProspectDto } from '../creator/dto/create-prospect.dto';
import { ZohoTokenStatus } from './interfaces/zoho-token.interface';

describe('ZohoService', () => {
  let service: ZohoService;
  let zohoApiService: ZohoApiService;
  let zohoTokenService: ZohoTokenService;
  let zohoContactService: ZohoContactService;
  let zohoLeadService: ZohoLeadService;

  const mockContactUsData: ContactUsDTO = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    interest: 'creator',
    message: 'I am interested in your platform',
    country: 'US',
    phoneNumber: '+1234567890',
  };

  const mockSignInData: CreateProspectDto = {
    displayName: 'Jane Smith',
    email: 'jane.smith@example.com',
    googleUserId: 'google-123',
    profilePictureUrl: 'https://example.com/profile.jpg',
    locale: 'en-US',
    signInContext: 'revenue-estimator',
  };

  const mockTokenStatus: ZohoTokenStatus = {
    hasToken: true,
    expiresAt: Date.now() + 300000,
    timeUntilExpiry: 300000,
  };

  const mockContactId = 'contact-123';
  const mockLeadId = 'lead-456';
  const mockAccessToken = 'test-access-token';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZohoService,
        {
          provide: ZohoApiService,
          useValue: {
            testConnection: jest.fn(),
          },
        },
        {
          provide: ZohoTokenService,
          useValue: {
            isConfigured: jest.fn().mockReturnValue(true),
            ensureValidToken: jest.fn().mockResolvedValue(mockAccessToken),
            getTokenStatus: jest.fn().mockReturnValue(mockTokenStatus),
            forceTokenRefresh: jest.fn(),
          },
        },
        {
          provide: ZohoContactService,
          useValue: {
            createContactFromContactForm: jest
              .fn()
              .mockResolvedValue(mockContactId),
            createOrUpdateContactFromSignIn: jest.fn(),
            markOnboardingCancelled: jest.fn(),
          },
        },
        {
          provide: ZohoLeadService,
          useValue: {
            promoteContactToLead: jest.fn(),
            getLeadById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ZohoService>(ZohoService);
    zohoApiService = module.get<ZohoApiService>(ZohoApiService);
    zohoTokenService = module.get<ZohoTokenService>(ZohoTokenService);
    zohoContactService = module.get<ZohoContactService>(ZohoContactService);
    zohoLeadService = module.get<ZohoLeadService>(ZohoLeadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should log success message when configured', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.onModuleInit();

      expect(zohoTokenService.isConfigured).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Zoho CRM service initialized successfully',
      );
    });

    it('should log warning when not configured', async () => {
      jest.spyOn(zohoTokenService, 'isConfigured').mockReturnValue(false);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Zoho CRM service not initialized - ZOHO_REFRESH_TOKEN not found. Run setup scripts to configure.',
      );
    });
  });

  describe('createContactAndPromoteToLead', () => {
    it('should create contact and promote to lead successfully', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.createContactAndPromoteToLead(mockContactUsData);

      expect(
        zohoContactService.createContactFromContactForm,
      ).toHaveBeenCalledWith(mockContactUsData);
      expect(zohoLeadService.promoteContactToLead).toHaveBeenCalledWith(
        mockContactUsData,
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        `Successfully created contact and promoted to lead for ${mockContactUsData.email} with contact ID: ${mockContactId}`,
      );
    });

    it('should return early when not configured', async () => {
      jest.spyOn(zohoTokenService, 'isConfigured').mockReturnValue(false);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.createContactAndPromoteToLead(mockContactUsData);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Zoho CRM not configured - skipping contact and lead creation. Run setup scripts to configure.',
      );
      expect(
        zohoContactService.createContactFromContactForm,
      ).not.toHaveBeenCalled();
      expect(zohoLeadService.promoteContactToLead).not.toHaveBeenCalled();
    });

    it('should handle contact creation errors gracefully', async () => {
      const contactError = new Error('Contact creation failed');
      jest
        .spyOn(zohoContactService, 'createContactFromContactForm')
        .mockRejectedValue(contactError);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      // Should not throw
      await service.createContactAndPromoteToLead(mockContactUsData);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to create contact and lead for ${mockContactUsData.email}`,
        contactError,
      );
      expect(zohoLeadService.promoteContactToLead).not.toHaveBeenCalled();
    });

    it('should handle lead promotion errors gracefully', async () => {
      const leadError = new Error('Lead promotion failed');
      jest
        .spyOn(zohoLeadService, 'promoteContactToLead')
        .mockRejectedValue(leadError);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      // Should not throw
      await service.createContactAndPromoteToLead(mockContactUsData);

      expect(
        zohoContactService.createContactFromContactForm,
      ).toHaveBeenCalledWith(mockContactUsData);
      expect(zohoLeadService.promoteContactToLead).toHaveBeenCalledWith(
        mockContactUsData,
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to create contact and lead for ${mockContactUsData.email}`,
        leadError,
      );
    });

    it('should continue with lead promotion even if contact creation returns empty string', async () => {
      jest
        .spyOn(zohoContactService, 'createContactFromContactForm')
        .mockResolvedValue('');
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.createContactAndPromoteToLead(mockContactUsData);

      expect(
        zohoContactService.createContactFromContactForm,
      ).toHaveBeenCalledWith(mockContactUsData);
      expect(zohoLeadService.promoteContactToLead).toHaveBeenCalledWith(
        mockContactUsData,
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        `Successfully created contact and promoted to lead for ${mockContactUsData.email} with contact ID: `,
      );
    });
  });

  describe('createContactFromSignIn', () => {
    it('should create contact from sign-in data successfully', async () => {
      await service.createContactFromSignIn(mockSignInData);

      expect(
        zohoContactService.createOrUpdateContactFromSignIn,
      ).toHaveBeenCalledWith(mockSignInData);
    });

    it('should handle errors gracefully without throwing', async () => {
      const signInError = new Error('Sign-in contact creation failed');
      jest
        .spyOn(zohoContactService, 'createOrUpdateContactFromSignIn')
        .mockRejectedValue(signInError);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      // Should not throw
      await service.createContactFromSignIn(mockSignInData);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to create/update Zoho contact for ${mockSignInData.email}`,
        signInError,
      );
    });
  });

  describe('markContactOnboardingCancelled', () => {
    it('should delegate to contact service with all parameters', async () => {
      await service.markContactOnboardingCancelled(
        'john.doe@example.com',
        'reason',
        true,
      );
      expect(zohoContactService.markOnboardingCancelled).toHaveBeenCalledWith(
        'john.doe@example.com',
        'reason',
        true,
      );
    });

    it('should delegate to contact service without wantsUpdates', async () => {
      await service.markContactOnboardingCancelled(
        'john.doe@example.com',
        'reason',
      );
      expect(zohoContactService.markOnboardingCancelled).toHaveBeenCalledWith(
        'john.doe@example.com',
        'reason',
        undefined,
      );
    });

    it('should handle errors gracefully', async () => {
      const err = new Error('fail');
      jest
        .spyOn(zohoContactService, 'markOnboardingCancelled')
        .mockRejectedValue(err);
      const loggerSpy = jest.spyOn(service['logger'], 'error');
      await service.markContactOnboardingCancelled('a@b.com');
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to update Zoho contact for onboarding cancellation of a@b.com',
        err,
      );
    });
  });

  describe('checkConnection', () => {
    it('should return true for successful connection', async () => {
      jest.spyOn(zohoApiService, 'testConnection').mockResolvedValue(true);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      const result = await service.checkConnection();

      expect(result).toBe(true);
      expect(zohoTokenService.ensureValidToken).toHaveBeenCalled();
      expect(zohoApiService.testConnection).toHaveBeenCalledWith(
        mockAccessToken,
      );
      expect(loggerSpy).toHaveBeenCalledWith('Zoho connection check: SUCCESS');
    });

    it('should return false for failed connection', async () => {
      jest.spyOn(zohoApiService, 'testConnection').mockResolvedValue(false);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      const result = await service.checkConnection();

      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith('Zoho connection check: FAILED');
    });

    it('should return false when not configured', async () => {
      jest.spyOn(zohoTokenService, 'isConfigured').mockReturnValue(false);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      const result = await service.checkConnection();

      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Zoho CRM not configured - connection check failed',
      );
      expect(zohoTokenService.ensureValidToken).not.toHaveBeenCalled();
      expect(zohoApiService.testConnection).not.toHaveBeenCalled();
    });

    it('should handle token errors gracefully', async () => {
      const tokenError = new Error('Token refresh failed');
      jest
        .spyOn(zohoTokenService, 'ensureValidToken')
        .mockRejectedValue(tokenError);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      const result = await service.checkConnection();

      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Zoho connection check failed',
        tokenError,
      );
      expect(zohoApiService.testConnection).not.toHaveBeenCalled();
    });

    it('should handle connection test errors gracefully', async () => {
      const connectionError = new Error('Connection test failed');
      jest
        .spyOn(zohoApiService, 'testConnection')
        .mockRejectedValue(connectionError);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      const result = await service.checkConnection();

      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Zoho connection check failed',
        connectionError,
      );
    });
  });

  describe('getLeadById', () => {
    it('should retrieve lead by ID successfully', async () => {
      const mockLead = {
        id: mockLeadId,
        First_Name: 'John',
        Last_Name: 'Doe',
        Email: 'john@example.com',
      };

      jest.spyOn(zohoLeadService, 'getLeadById').mockResolvedValue(mockLead);

      const result = await service.getLeadById(mockLeadId);

      expect(result).toEqual(mockLead);
      expect(zohoLeadService.getLeadById).toHaveBeenCalledWith(mockLeadId);
    });

    it('should handle errors from lead service', async () => {
      const leadError = new Error('Lead not found');
      jest.spyOn(zohoLeadService, 'getLeadById').mockRejectedValue(leadError);

      await expect(service.getLeadById(mockLeadId)).rejects.toThrow(
        'Lead not found',
      );
    });
  });

  describe('getTokenStatus', () => {
    it('should return token status from token service', () => {
      const result = service.getTokenStatus();

      expect(result).toEqual(mockTokenStatus);
      expect(zohoTokenService.getTokenStatus).toHaveBeenCalled();
    });
  });

  describe('forceTokenRefresh', () => {
    it('should force token refresh successfully', async () => {
      await service.forceTokenRefresh();

      expect(zohoTokenService.forceTokenRefresh).toHaveBeenCalled();
    });

    it('should handle token refresh errors', async () => {
      const refreshError = new Error('Force refresh failed');
      jest
        .spyOn(zohoTokenService, 'forceTokenRefresh')
        .mockRejectedValue(refreshError);

      await expect(service.forceTokenRefresh()).rejects.toThrow(
        'Force refresh failed',
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete contact form workflow', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.createContactAndPromoteToLead(mockContactUsData);

      expect(zohoTokenService.isConfigured).toHaveBeenCalled();
      expect(
        zohoContactService.createContactFromContactForm,
      ).toHaveBeenCalledWith(mockContactUsData);
      expect(zohoLeadService.promoteContactToLead).toHaveBeenCalledWith(
        mockContactUsData,
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Successfully created contact and promoted to lead',
        ),
      );
    });

    it('should handle complete sign-in workflow', async () => {
      await service.createContactFromSignIn(mockSignInData);

      expect(
        zohoContactService.createOrUpdateContactFromSignIn,
      ).toHaveBeenCalledWith(mockSignInData);
    });

    it('should handle health check workflow', async () => {
      jest.spyOn(zohoApiService, 'testConnection').mockResolvedValue(true);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      const isHealthy = await service.checkConnection();

      expect(isHealthy).toBe(true);
      expect(zohoTokenService.isConfigured).toHaveBeenCalled();
      expect(zohoTokenService.ensureValidToken).toHaveBeenCalled();
      expect(zohoApiService.testConnection).toHaveBeenCalledWith(
        mockAccessToken,
      );
      expect(loggerSpy).toHaveBeenCalledWith('Zoho connection check: SUCCESS');
    });

    it('should handle debugging workflow', () => {
      const tokenStatus = service.getTokenStatus();
      expect(tokenStatus).toEqual(mockTokenStatus);
      expect(zohoTokenService.getTokenStatus).toHaveBeenCalled();
    });
  });

  describe('error resilience', () => {
    it('should not break contact form submission when Zoho is down', async () => {
      const zohoError = new Error('Zoho service unavailable');
      jest
        .spyOn(zohoContactService, 'createContactFromContactForm')
        .mockRejectedValue(zohoError);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      // Should complete without throwing
      await service.createContactAndPromoteToLead(mockContactUsData);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to create contact and lead for ${mockContactUsData.email}`,
        zohoError,
      );
    });

    it('should not break sign-in when Zoho is down', async () => {
      const zohoError = new Error('Zoho service unavailable');
      jest
        .spyOn(zohoContactService, 'createOrUpdateContactFromSignIn')
        .mockRejectedValue(zohoError);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      // Should complete without throwing
      await service.createContactFromSignIn(mockSignInData);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to create/update Zoho contact for ${mockSignInData.email}`,
        zohoError,
      );
    });

    it('should gracefully handle partial service failures', async () => {
      // Contact creation succeeds, lead promotion fails
      const leadError = new Error('Lead service down');
      jest
        .spyOn(zohoLeadService, 'promoteContactToLead')
        .mockRejectedValue(leadError);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.createContactAndPromoteToLead(mockContactUsData);

      expect(
        zohoContactService.createContactFromContactForm,
      ).toHaveBeenCalled();
      expect(zohoLeadService.promoteContactToLead).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to create contact and lead for ${mockContactUsData.email}`,
        leadError,
      );
    });
  });

  describe('configuration edge cases', () => {
    it('should handle configuration changes during runtime', async () => {
      // First call to establish baseline
      await service.createContactAndPromoteToLead(mockContactUsData);
      expect(zohoTokenService.isConfigured).toHaveBeenCalled();

      // Simulate configuration loss
      jest.spyOn(zohoTokenService, 'isConfigured').mockReturnValue(false);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.createContactAndPromoteToLead(mockContactUsData);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Zoho CRM not configured - skipping contact and lead creation. Run setup scripts to configure.',
      );
    });

    it('should handle token service initialization failures', async () => {
      jest
        .spyOn(zohoTokenService, 'ensureValidToken')
        .mockRejectedValue(new Error('Token service not initialized'));
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      const result = await service.checkConnection();

      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Zoho connection check failed',
        expect.any(Error),
      );
    });
  });
});
