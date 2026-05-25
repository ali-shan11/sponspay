import { Test, TestingModule } from '@nestjs/testing';
import { ZohoContactService } from './zoho-contact.service';
import { ZohoApiService } from './zoho-api.service';
import { ZohoTokenService } from './zoho-token.service';
import { ContactUsDTO } from '../../marketing/dto/contact-us.dto';
import { CreateProspectDto } from '../../creator/dto/create-prospect.dto';
import {
  ContactSearchResponse,
  ContactSearchResult,
} from '../interfaces/zoho-contact.interface';
import { ZohoCreateResponse } from '../interfaces/zoho-response.interface';

describe('ZohoContactService', () => {
  let service: ZohoContactService;
  let zohoApiService: ZohoApiService;
  let zohoTokenService: ZohoTokenService;

  const mockAccessToken = 'test-access-token';
  const mockContactId = 'contact-123';

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

  const mockSuccessResponse: ZohoCreateResponse = {
    data: [
      {
        code: 'SUCCESS',
        details: {
          id: mockContactId,
          Created_Time: '2024-01-01T00:00:00Z',
          Modified_Time: '2024-01-01T00:00:00Z',
        },
        message: 'record added',
        status: 'success',
      },
    ],
  };

  const mockSearchResponse: ContactSearchResponse = {
    data: [
      {
        id: mockContactId,
        Email: 'jane.smith@example.com',
        Description: 'Google OAuth sign-in #2. YouTube Creator: 1 channel(s)',
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZohoContactService,
        {
          provide: ZohoApiService,
          useValue: {
            makeApiRequest: jest.fn(),
          },
        },
        {
          provide: ZohoTokenService,
          useValue: {
            isConfigured: jest.fn().mockReturnValue(true),
            ensureValidToken: jest.fn().mockResolvedValue(mockAccessToken),
          },
        },
      ],
    }).compile();

    service = module.get<ZohoContactService>(ZohoContactService);
    zohoApiService = module.get<ZohoApiService>(ZohoApiService);
    zohoTokenService = module.get<ZohoTokenService>(ZohoTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markOnboardingCancelled', () => {
    it('should update contact with Email Opt Out when wantsUpdates is false', async () => {
      jest
        .spyOn(service, 'findContactByEmail')
        .mockResolvedValue({ id: mockContactId, signInCount: 1 });
      (zohoApiService.makeApiRequest as jest.Mock)
        .mockResolvedValueOnce({ data: [{ Description: 'Existing' }] })
        .mockResolvedValueOnce(mockSuccessResponse);

      await service.markOnboardingCancelled(
        'jane.smith@example.com',
        'user exit',
        false,
      );

      expect(service.findContactByEmail).toHaveBeenCalledWith(
        'jane.smith@example.com',
      );
      expect(zohoApiService.makeApiRequest).toHaveBeenNthCalledWith(
        1,
        `/Contacts/${mockContactId}`,
        'GET',
        mockAccessToken,
      );
      expect(zohoApiService.makeApiRequest).toHaveBeenNthCalledWith(
        2,
        `/Contacts/${mockContactId}`,
        'PUT',
        mockAccessToken,
        {
          data: [
            {
              Description: expect.stringContaining('Onboarding cancelled'),
              Department: 'Cancelled',
              Email_Opt_Out: true,
            },
          ],
        },
      );
    });

    it('should update contact without Email Opt Out when wantsUpdates is true', async () => {
      jest
        .spyOn(service, 'findContactByEmail')
        .mockResolvedValue({ id: mockContactId, signInCount: 1 });
      (zohoApiService.makeApiRequest as jest.Mock)
        .mockResolvedValueOnce({ data: [{ Description: 'Existing' }] })
        .mockResolvedValueOnce(mockSuccessResponse);

      await service.markOnboardingCancelled(
        'jane.smith@example.com',
        'user exit',
        true,
      );

      expect(service.findContactByEmail).toHaveBeenCalledWith(
        'jane.smith@example.com',
      );
      expect(zohoApiService.makeApiRequest).toHaveBeenNthCalledWith(
        2,
        `/Contacts/${mockContactId}`,
        'PUT',
        mockAccessToken,
        {
          data: [
            {
              Description: expect.stringContaining('Onboarding cancelled'),
              Department: 'Cancelled',
            },
          ],
        },
      );
    });

    it('should include "Wants to receive updates" in description when wantsUpdates is true', async () => {
      jest
        .spyOn(service, 'findContactByEmail')
        .mockResolvedValue({ id: mockContactId, signInCount: 1 });
      (zohoApiService.makeApiRequest as jest.Mock)
        .mockResolvedValueOnce({ data: [{ Description: 'Existing' }] })
        .mockResolvedValueOnce(mockSuccessResponse);

      await service.markOnboardingCancelled(
        'jane.smith@example.com',
        'reason',
        true,
      );

      expect(zohoApiService.makeApiRequest).toHaveBeenNthCalledWith(
        2,
        `/Contacts/${mockContactId}`,
        'PUT',
        mockAccessToken,
        {
          data: [
            {
              Description: expect.stringContaining('Wants to receive updates'),
              Department: 'Cancelled',
            },
          ],
        },
      );
    });

    it('should include "Does not want updates" in description when wantsUpdates is false', async () => {
      jest
        .spyOn(service, 'findContactByEmail')
        .mockResolvedValue({ id: mockContactId, signInCount: 1 });
      (zohoApiService.makeApiRequest as jest.Mock)
        .mockResolvedValueOnce({ data: [{ Description: 'Existing' }] })
        .mockResolvedValueOnce(mockSuccessResponse);

      await service.markOnboardingCancelled(
        'jane.smith@example.com',
        'reason',
        false,
      );

      expect(zohoApiService.makeApiRequest).toHaveBeenNthCalledWith(
        2,
        `/Contacts/${mockContactId}`,
        'PUT',
        mockAccessToken,
        {
          data: [
            {
              Description: expect.stringContaining('Does not want updates'),
              Department: 'Cancelled',
              Email_Opt_Out: true,
            },
          ],
        },
      );
    });

    it('should warn when contact does not exist', async () => {
      jest.spyOn(service, 'findContactByEmail').mockResolvedValue(null);
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      await service.markOnboardingCancelled('missing@example.com');

      expect(warnSpy).toHaveBeenCalledWith(
        'No existing contact found for missing@example.com - skipping cancellation update',
      );
      expect(zohoApiService.makeApiRequest).not.toHaveBeenCalled();
    });
  });

  describe('createContactFromContactForm', () => {
    it('should create contact successfully from contact form data', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(mockSuccessResponse);

      const result =
        await service.createContactFromContactForm(mockContactUsData);

      expect(result).toBe(mockContactId);
      expect(zohoApiService.makeApiRequest).toHaveBeenCalledWith(
        '/Contacts',
        'POST',
        mockAccessToken,
        {
          data: [
            {
              First_Name: 'John',
              Last_Name: 'Doe',
              Email: 'john.doe@example.com',
              Company: 'Content Creator',
              Lead_Source: 'Website - Creator',
              Department: 'Lead',
              Phone: '+1234567890',
              Description: 'I am interested in your platform',
              Country: 'US',
            },
          ],
        },
      );
    });

    it('should create contact without optional fields', async () => {
      const minimalContactData: ContactUsDTO = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        interest: 'brand',
        message: 'Test message',
        country: 'US',
      };

      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(mockSuccessResponse);

      const result =
        await service.createContactFromContactForm(minimalContactData);

      expect(result).toBe(mockContactId);
      expect(zohoApiService.makeApiRequest).toHaveBeenCalledWith(
        '/Contacts',
        'POST',
        mockAccessToken,
        {
          data: [
            {
              First_Name: 'John',
              Last_Name: 'Doe',
              Email: 'john.doe@example.com',
              Company: 'Brand/Company',
              Lead_Source: 'Website - Brand',
              Department: 'Lead',
              Description: 'Test message',
              Country: 'US',
            },
          ],
        },
      );
    });

    it('should handle unknown interest type', async () => {
      const unknownInterestData: ContactUsDTO = {
        ...mockContactUsData,
        interest: 'unknown' as any,
      };

      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(mockSuccessResponse);

      await service.createContactFromContactForm(unknownInterestData);

      expect(zohoApiService.makeApiRequest).toHaveBeenCalledWith(
        '/Contacts',
        'POST',
        mockAccessToken,
        expect.objectContaining({
          data: [
            expect.objectContaining({
              Company: 'Unknown',
              Lead_Source: 'Website - Contact Form',
            }),
          ],
        }),
      );
    });

    it('should return empty string when not configured', async () => {
      jest.spyOn(zohoTokenService, 'isConfigured').mockReturnValue(false);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      const result =
        await service.createContactFromContactForm(mockContactUsData);

      expect(result).toBe('');
      expect(loggerSpy).toHaveBeenCalledWith(
        'Zoho CRM not configured - skipping contact creation from contact form',
      );
      expect(zohoApiService.makeApiRequest).not.toHaveBeenCalled();
    });

    it('should throw error when contact creation fails', async () => {
      const failureResponse: ZohoCreateResponse = {
        data: [
          {
            code: 'INVALID_DATA',
            details: { id: '' },
            message: 'Invalid email format',
            status: 'error',
          },
        ],
      };

      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(failureResponse);

      await expect(
        service.createContactFromContactForm(mockContactUsData),
      ).rejects.toThrow('Contact creation failed: Invalid email format');
    });

    it('should handle API request errors', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockRejectedValue(new Error('API request failed'));

      await expect(
        service.createContactFromContactForm(mockContactUsData),
      ).rejects.toThrow('API request failed');
    });
  });

  describe('createOrUpdateContactFromSignIn', () => {
    it('should create new contact when contact does not exist', async () => {
      jest.spyOn(service, 'findContactByEmail').mockResolvedValue(null);
      jest
        .spyOn(service as any, 'createNewContactFromSignIn')
        .mockResolvedValue(mockContactId);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.createOrUpdateContactFromSignIn(mockSignInData);

      expect(service['createNewContactFromSignIn']).toHaveBeenCalledWith(
        mockSignInData,
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        `Successfully created Zoho contact for ${mockSignInData.email} with ID: ${mockContactId}`,
      );
    });

    it('should update existing contact when contact exists', async () => {
      const existingContact: ContactSearchResult = {
        id: mockContactId,
        signInCount: 1,
      };

      jest
        .spyOn(service, 'findContactByEmail')
        .mockResolvedValue(existingContact);
      jest
        .spyOn(service as any, 'updateExistingContact')
        .mockResolvedValue(undefined);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.createOrUpdateContactFromSignIn(mockSignInData);

      expect(service['updateExistingContact']).toHaveBeenCalledWith(
        mockContactId,
        mockSignInData,
        2, // signInCount + 1
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        `Successfully updated Zoho contact for ${mockSignInData.email} with ID: ${mockContactId}`,
      );
    });

    it('should return early when not configured', async () => {
      jest.spyOn(zohoTokenService, 'isConfigured').mockReturnValue(false);
      const findContactSpy = jest.spyOn(service, 'findContactByEmail');
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.createOrUpdateContactFromSignIn(mockSignInData);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Zoho CRM not configured - skipping contact creation from sign-in',
      );
      expect(findContactSpy).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      jest
        .spyOn(service, 'findContactByEmail')
        .mockRejectedValue(new Error('Search failed'));
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      // Should not throw
      await service.createOrUpdateContactFromSignIn(mockSignInData);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to create/update Zoho contact for ${mockSignInData.email}`,
        expect.any(Error),
      );
    });
  });

  describe('findContactByEmail', () => {
    it('should find existing contact by email', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(mockSearchResponse);

      const result = await service.findContactByEmail('jane.smith@example.com');

      expect(result).toEqual({
        id: mockContactId,
        signInCount: 2, // Extracted from description
      });
      expect(zohoApiService.makeApiRequest).toHaveBeenCalledWith(
        `/Contacts/search?criteria=${encodeURIComponent('(Email:equals:jane.smith@example.com)')}`,
        'GET',
        mockAccessToken,
      );
    });

    it('should return null when contact not found', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue({ data: [] });

      const result = await service.findContactByEmail('notfound@example.com');

      expect(result).toBeNull();
    });

    it('should handle 204 No Content responses', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockRejectedValue(new Error('API request failed: 204 - No Content'));

      const result = await service.findContactByEmail('notfound@example.com');

      expect(result).toBeNull();
    });

    it('should handle empty response errors', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockRejectedValue(new Error('No Content'));

      const result = await service.findContactByEmail('notfound@example.com');

      expect(result).toBeNull();
    });

    it('should throw other errors', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockRejectedValue(new Error('Network error'));
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await expect(
        service.findContactByEmail('test@example.com'),
      ).rejects.toThrow('Network error');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to search for contact with email test@example.com',
        expect.any(Error),
      );
    });

    it('should extract sign-in count from description', async () => {
      const responseWithSignInCount: ContactSearchResponse = {
        data: [
          {
            id: mockContactId,
            Email: 'test@example.com',
            Description: 'Google OAuth sign-in #5. Some other text',
          },
        ],
      };

      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(responseWithSignInCount);

      const result = await service.findContactByEmail('test@example.com');

      expect(result?.signInCount).toBe(5);
    });

    it('should default to 0 when no sign-in count in description', async () => {
      const responseWithoutSignInCount: ContactSearchResponse = {
        data: [
          {
            id: mockContactId,
            Email: 'test@example.com',
            Description: 'Some description without sign-in count',
          },
        ],
      };

      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(responseWithoutSignInCount);

      const result = await service.findContactByEmail('test@example.com');

      expect(result?.signInCount).toBe(0);
    });
  });

  describe('createNewContactFromSignIn', () => {
    it('should create new contact from sign-in data', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(mockSuccessResponse);

      const result =
        await service['createNewContactFromSignIn'](mockSignInData);

      expect(result).toBe(mockContactId);
      expect(zohoApiService.makeApiRequest).toHaveBeenCalledWith(
        '/Contacts',
        'POST',
        mockAccessToken,
        {
          data: [
            expect.objectContaining({
              First_Name: 'Jane',
              Last_Name: 'Smith',
              Email: 'jane.smith@example.com',
              Company: 'User',
              Lead_Source: 'Website - Sign In',
              Department: 'Prospect',
              Description: expect.stringContaining('Google OAuth sign-in #1'),
            }),
          ],
        },
      );
    });

    it('should throw error when creation fails', async () => {
      const failureResponse: ZohoCreateResponse = {
        data: [
          {
            code: 'DUPLICATE_DATA',
            details: { id: '' },
            message: 'Duplicate email',
            status: 'error',
          },
        ],
      };

      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(failureResponse);

      await expect(
        service['createNewContactFromSignIn'](mockSignInData),
      ).rejects.toThrow('Contact creation failed: Duplicate email');
    });
  });

  describe('updateExistingContact', () => {
    it('should update existing contact successfully', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(mockSuccessResponse);

      await service['updateExistingContact'](mockContactId, mockSignInData, 3);

      expect(zohoApiService.makeApiRequest).toHaveBeenCalledWith(
        `/Contacts/${mockContactId}`,
        'PUT',
        mockAccessToken,
        {
          data: [
            expect.objectContaining({
              Description: expect.stringContaining('Google OAuth sign-in #3'),
            }),
          ],
        },
      );
    });

    it('should throw error when update fails', async () => {
      const failureResponse: ZohoCreateResponse = {
        data: [
          {
            code: 'INVALID_DATA',
            details: { id: '' },
            message: 'Invalid data',
            status: 'error',
          },
        ],
      };

      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(failureResponse);

      await expect(
        service['updateExistingContact'](mockContactId, mockSignInData, 2),
      ).rejects.toThrow('Contact update failed: Invalid data');
    });
  });

  describe('mapSignInDataToContact', () => {
    it('should map sign-in data with YouTube channels correctly', () => {
      const result = service['mapSignInDataToContact'](mockSignInData, 1);

      expect(result).toEqual({
        First_Name: 'Jane',
        Last_Name: 'Smith',
        Email: 'jane.smith@example.com',
        Company: 'User',
        Lead_Source: 'Website - Sign In',
        Department: 'Prospect',
        Description: expect.stringContaining('Google OAuth sign-in #1'),
      });
    });
  });

  describe('buildSignInDescription', () => {
    it('should build complete description with all data', () => {
      const result = service['buildSignInDescription'](mockSignInData, 2);

      expect(result).toContain('Google OAuth sign-in #2');
      expect(result).toContain('Context: revenue-estimator');
      expect(result).toContain('Locale: en-US');
      expect(result).toContain('Google ID: google-123');
      // YouTube data no longer included in sign-in
      expect(result).not.toContain('YouTube Creator');
      expect(result).not.toContain('subscribers');
    });

    it('should build description without optional fields', () => {
      const minimalSignInData: CreateProspectDto = {
        displayName: 'John Doe',
        email: 'john@example.com',
        googleUserId: 'google-456',
      };

      const result = service['buildSignInDescription'](minimalSignInData, 1);

      expect(result).toContain('Google OAuth sign-in #1');
      expect(result).toContain('Google ID: google-456');
      expect(result).not.toContain('YouTube Creator');
      expect(result).not.toContain('Context:');
      expect(result).not.toContain('Locale:');
    });

    it('should truncate description to 2000 characters', () => {
      const longSignInData: CreateProspectDto = {
        ...mockSignInData,
        signInContext: 'a'.repeat(2000), // Very long context
      };

      const result = service['buildSignInDescription'](longSignInData, 1);

      expect(result.length).toBeLessThanOrEqual(2000);
      expect(result.endsWith('...')).toBe(true);
    });
  });

  describe('extractSignInCountFromDescription', () => {
    it('should extract sign-in count from description', () => {
      const description = 'Google OAuth sign-in #5. Some other text';
      const result = service['extractSignInCountFromDescription'](description);
      expect(result).toBe(5);
    });

    it('should return 0 when no sign-in count found', () => {
      const description = 'Some description without sign-in count';
      const result = service['extractSignInCountFromDescription'](description);
      expect(result).toBe(0);
    });

    it('should handle case-insensitive matching', () => {
      const description = 'Google OAuth SIGN-IN #3. Some text';
      const result = service['extractSignInCountFromDescription'](description);
      expect(result).toBe(3);
    });
  });

  describe('company and lead source mapping', () => {
    it('should map creator interest to Content Creator company', () => {
      const result = service['determineCompany']({
        ...mockContactUsData,
        interest: 'creator',
      });
      expect(result).toBe('Content Creator');
    });

    it('should map brand interest to Brand/Company company', () => {
      const result = service['determineCompany']({
        ...mockContactUsData,
        interest: 'brand',
      });
      expect(result).toBe('Brand/Company');
    });

    it('should map other interest to Unknown company', () => {
      const result = service['determineCompany']({
        ...mockContactUsData,
        interest: 'other',
      });
      expect(result).toBe('Unknown');
    });

    it('should map creator interest to Website - Creator lead source', () => {
      const result = service['mapInterestToLeadSource']('creator');
      expect(result).toBe('Website - Creator');
    });

    it('should map brand interest to Website - Brand lead source', () => {
      const result = service['mapInterestToLeadSource']('brand');
      expect(result).toBe('Website - Brand');
    });

    it('should map other interest to Website - Other lead source', () => {
      const result = service['mapInterestToLeadSource']('other');
      expect(result).toBe('Website - Other');
    });

    it('should default to Website - Contact Form for unknown interest', () => {
      const result = service['mapInterestToLeadSource']('unknown');
      expect(result).toBe('Website - Contact Form');
    });
  });
});
