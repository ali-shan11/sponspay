import { Test, TestingModule } from '@nestjs/testing';
import { ZohoLeadService } from './zoho-lead.service';
import { ZohoApiService } from './zoho-api.service';
import { ZohoTokenService } from './zoho-token.service';
import { ContactUsDTO } from '../../marketing/dto/contact-us.dto';
import { ZohoLead } from '../interfaces/zoho-lead.interface';
import { ZohoCreateResponse } from '../interfaces/zoho-response.interface';

describe('ZohoLeadService', () => {
  let service: ZohoLeadService;
  let zohoApiService: ZohoApiService;
  let zohoTokenService: ZohoTokenService;

  const mockAccessToken = 'test-access-token';
  const mockLeadId = 'lead-123';

  const mockContactUsData: ContactUsDTO = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    interest: 'creator',
    message: 'I am interested in your platform',
    country: 'US',
    phoneNumber: '+1234567890',
  };

  const mockLeadData: ZohoLead = {
    First_Name: 'Jane',
    Last_Name: 'Smith',
    Email: 'jane.smith@example.com',
    Company: 'Content Creator',
    Lead_Source: 'Website - Creator',
    Lead_Status: 'Not Contacted',
    Phone: '+1987654321',
    Description: 'Test lead description',
    Country: 'CA',
  };

  const mockSuccessResponse: ZohoCreateResponse = {
    data: [
      {
        code: 'SUCCESS',
        details: {
          id: mockLeadId,
          Created_Time: '2024-01-01T00:00:00Z',
          Modified_Time: '2024-01-01T00:00:00Z',
        },
        message: 'record added',
        status: 'success',
      },
    ],
  };

  const mockLeadResponse = {
    data: [
      {
        id: mockLeadId,
        First_Name: 'Jane',
        Last_Name: 'Smith',
        Email: 'jane.smith@example.com',
        Lead_Status: 'Not Contacted',
      },
    ],
  };

  const mockSearchResponse = {
    data: [
      {
        id: 'lead-1',
        First_Name: 'John',
        Last_Name: 'Doe',
        Email: 'john@example.com',
      },
      {
        id: 'lead-2',
        First_Name: 'Jane',
        Last_Name: 'Smith',
        Email: 'jane@example.com',
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZohoLeadService,
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

    service = module.get<ZohoLeadService>(ZohoLeadService);
    zohoApiService = module.get<ZohoApiService>(ZohoApiService);
    zohoTokenService = module.get<ZohoTokenService>(ZohoTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('promoteContactToLead', () => {
    it('should create lead successfully from contact form data', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(mockSuccessResponse);

      await service.promoteContactToLead(mockContactUsData);

      expect(zohoApiService.makeApiRequest).toHaveBeenCalledWith(
        '/Leads',
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
              Lead_Status: 'Not Contacted',
              Phone: '+1234567890',
              Description: 'I am interested in your platform',
              Country: 'US',
            },
          ],
        },
      );
    });

    it('should create lead without optional fields', async () => {
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

      await service.promoteContactToLead(minimalContactData);

      expect(zohoApiService.makeApiRequest).toHaveBeenCalledWith(
        '/Leads',
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
              Lead_Status: 'Not Contacted',
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

      await service.promoteContactToLead(unknownInterestData);

      expect(zohoApiService.makeApiRequest).toHaveBeenCalledWith(
        '/Leads',
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

    it('should return early when not configured', async () => {
      jest.spyOn(zohoTokenService, 'isConfigured').mockReturnValue(false);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.promoteContactToLead(mockContactUsData);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Zoho CRM not configured - skipping lead creation',
      );
      expect(zohoApiService.makeApiRequest).not.toHaveBeenCalled();
    });

    it('should throw error when lead creation fails', async () => {
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
        service.promoteContactToLead(mockContactUsData),
      ).rejects.toThrow('Lead creation failed: Invalid email format');
    });

    it('should handle missing response data', async () => {
      const emptyResponse = { data: [] };

      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(emptyResponse);

      await expect(
        service.promoteContactToLead(mockContactUsData),
      ).rejects.toThrow('Lead creation failed: Unknown error');
    });

    it('should handle API request errors', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockRejectedValue(new Error('API request failed'));

      await expect(
        service.promoteContactToLead(mockContactUsData),
      ).rejects.toThrow('API request failed');
    });
  });

  describe('getLeadById', () => {
    it('should retrieve lead by ID successfully', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(mockLeadResponse);

      const result = await service.getLeadById(mockLeadId);

      expect(result).toEqual(mockLeadResponse);
      expect(zohoApiService.makeApiRequest).toHaveBeenCalledWith(
        `/Leads/${mockLeadId}`,
        'GET',
        mockAccessToken,
      );
    });

    it('should throw error when not configured', async () => {
      jest.spyOn(zohoTokenService, 'isConfigured').mockReturnValue(false);

      await expect(service.getLeadById(mockLeadId)).rejects.toThrow(
        'Zoho CRM not configured',
      );

      expect(zohoApiService.makeApiRequest).not.toHaveBeenCalled();
    });

    it('should handle API request errors', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockRejectedValue(new Error('Lead not found'));

      await expect(service.getLeadById(mockLeadId)).rejects.toThrow(
        'Lead not found',
      );
    });
  });

  describe('createLead', () => {
    it('should create lead successfully with custom data', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(mockSuccessResponse);

      const result = await service.createLead(mockLeadData);

      expect(result).toBe(mockLeadId);
      expect(zohoApiService.makeApiRequest).toHaveBeenCalledWith(
        '/Leads',
        'POST',
        mockAccessToken,
        { data: [mockLeadData] },
      );
    });

    it('should throw error when not configured', async () => {
      jest.spyOn(zohoTokenService, 'isConfigured').mockReturnValue(false);

      await expect(service.createLead(mockLeadData)).rejects.toThrow(
        'Zoho CRM not configured',
      );

      expect(zohoApiService.makeApiRequest).not.toHaveBeenCalled();
    });

    it('should throw error when lead creation fails', async () => {
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

      await expect(service.createLead(mockLeadData)).rejects.toThrow(
        'Lead creation failed: Duplicate email',
      );
    });

    it('should handle missing response data', async () => {
      const emptyResponse = { data: [] };

      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(emptyResponse);

      await expect(service.createLead(mockLeadData)).rejects.toThrow(
        'Lead creation failed: Unknown error',
      );
    });

    it('should handle API request errors', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockRejectedValue(new Error('Network error'));

      await expect(service.createLead(mockLeadData)).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('updateLead', () => {
    const updateData: Partial<ZohoLead> = {
      Lead_Status: 'Contacted',
      Description: 'Updated description',
    };

    it('should update lead successfully', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(mockSuccessResponse);

      await service.updateLead(mockLeadId, updateData);

      expect(zohoApiService.makeApiRequest).toHaveBeenCalledWith(
        `/Leads/${mockLeadId}`,
        'PUT',
        mockAccessToken,
        { data: [updateData] },
      );
    });

    it('should throw error when not configured', async () => {
      jest.spyOn(zohoTokenService, 'isConfigured').mockReturnValue(false);

      await expect(service.updateLead(mockLeadId, updateData)).rejects.toThrow(
        'Zoho CRM not configured',
      );

      expect(zohoApiService.makeApiRequest).not.toHaveBeenCalled();
    });

    it('should throw error when lead update fails', async () => {
      const failureResponse: ZohoCreateResponse = {
        data: [
          {
            code: 'INVALID_DATA',
            details: { id: '' },
            message: 'Invalid lead status',
            status: 'error',
          },
        ],
      };

      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(failureResponse);

      await expect(service.updateLead(mockLeadId, updateData)).rejects.toThrow(
        'Lead update failed: Invalid lead status',
      );
    });

    it('should handle missing response data', async () => {
      const emptyResponse = { data: [] };

      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(emptyResponse);

      await expect(service.updateLead(mockLeadId, updateData)).rejects.toThrow(
        'Lead update failed: Unknown error',
      );
    });

    it('should handle API request errors', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockRejectedValue(new Error('Lead not found'));

      await expect(service.updateLead(mockLeadId, updateData)).rejects.toThrow(
        'Lead not found',
      );
    });
  });

  describe('searchLeads', () => {
    const searchCriteria = '(Email:equals:john@example.com)';

    it('should search leads successfully', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(mockSearchResponse);

      const result = await service.searchLeads(searchCriteria);

      expect(result).toEqual(mockSearchResponse.data);
      expect(zohoApiService.makeApiRequest).toHaveBeenCalledWith(
        `/Leads/search?criteria=${encodeURIComponent(searchCriteria)}`,
        'GET',
        mockAccessToken,
      );
    });

    it('should return empty array when no leads found', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue({ data: [] });

      const result = await service.searchLeads(searchCriteria);

      expect(result).toEqual([]);
    });

    it('should handle 204 No Content responses', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockRejectedValue(new Error('API request failed: 204 - No Content'));

      const result = await service.searchLeads(searchCriteria);

      expect(result).toEqual([]);
    });

    it('should handle empty response errors', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockRejectedValue(new Error('No Content'));

      const result = await service.searchLeads(searchCriteria);

      expect(result).toEqual([]);
    });

    it('should throw error when not configured', async () => {
      jest.spyOn(zohoTokenService, 'isConfigured').mockReturnValue(false);

      await expect(service.searchLeads(searchCriteria)).rejects.toThrow(
        'Zoho CRM not configured',
      );

      expect(zohoApiService.makeApiRequest).not.toHaveBeenCalled();
    });

    it('should throw other errors', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockRejectedValue(new Error('Network error'));

      await expect(service.searchLeads(searchCriteria)).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle missing data property in response', async () => {
      jest.spyOn(zohoApiService, 'makeApiRequest').mockResolvedValue({});

      const result = await service.searchLeads(searchCriteria);

      expect(result).toEqual([]);
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

  describe('edge cases and error scenarios', () => {
    it('should handle null response from API', async () => {
      jest.spyOn(zohoApiService, 'makeApiRequest').mockResolvedValue(null);

      await expect(
        service.promoteContactToLead(mockContactUsData),
      ).rejects.toThrow('Cannot read properties of null');
    });

    it('should handle undefined response data', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue({ data: undefined });

      await expect(service.createLead(mockLeadData)).rejects.toThrow(
        'Lead creation failed: Unknown error',
      );
    });

    it('should handle response with null data array', async () => {
      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue({ data: null });

      await expect(
        service.updateLead(mockLeadId, { Lead_Status: 'Contacted' }),
      ).rejects.toThrow('Lead update failed: Unknown error');
    });

    it('should handle response with missing code in data', async () => {
      const responseWithoutCode = {
        data: [
          {
            details: { id: mockLeadId },
            message: 'record added',
            status: 'success',
          },
        ],
      };

      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(responseWithoutCode);

      await expect(service.createLead(mockLeadData)).rejects.toThrow(
        'Lead creation failed: record added',
      );
    });

    it('should handle response with missing details in data', async () => {
      const responseWithoutDetails = {
        data: [
          {
            code: 'SUCCESS',
            message: 'record added',
            status: 'success',
          },
        ],
      };

      jest
        .spyOn(zohoApiService, 'makeApiRequest')
        .mockResolvedValue(responseWithoutDetails);

      await expect(service.createLead(mockLeadData)).rejects.toThrow(
        'Cannot read properties of undefined',
      );
    });
  });
});
