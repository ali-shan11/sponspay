import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ZohoApiService } from './zoho-api.service';
import { ZohoConfig } from '../interfaces/zoho-config.interface';
import { ZohoModulesResponse } from '../interfaces/zoho-response.interface';

// Mock fetch globally
global.fetch = jest.fn();

describe('ZohoApiService', () => {
  let service: ZohoApiService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  const mockConfig: ZohoConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/oauth/callback',
    refreshToken: 'test-refresh-token',
    environment: 'production',
  };

  beforeEach(async () => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZohoApiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                ZOHO_CLIENT_ID: mockConfig.clientId,
                ZOHO_CLIENT_SECRET: mockConfig.clientSecret,
                ZOHO_REDIRECT_URI: mockConfig.redirectUri,
                ZOHO_REFRESH_TOKEN: mockConfig.refreshToken,
                ZOHO_ENVIRONMENT: mockConfig.environment,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ZohoApiService>(ZohoApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should set production URLs by default', () => {
      expect(service.getBaseUrl()).toBe('https://www.zohoapis.com/crm/v2');
      expect(service.getAccountsUrl()).toBe('https://accounts.zoho.com');
    });

    it('should set sandbox URLs when environment is sandbox', async () => {
      const sandboxModule: TestingModule = await Test.createTestingModule({
        providers: [
          ZohoApiService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: any) => {
                if (key === 'ZOHO_ENVIRONMENT') return 'sandbox';
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const sandboxService = sandboxModule.get<ZohoApiService>(ZohoApiService);
      expect(sandboxService.getBaseUrl()).toBe(
        'https://sandbox.zohoapis.com/crm/v2',
      );
    });
  });

  describe('getZohoConfig', () => {
    it('should return valid configuration when all required env vars are set', () => {
      const config = service.getZohoConfig();

      expect(config).toEqual(mockConfig);
    });

    it('should throw error when client ID is missing', async () => {
      const moduleWithMissingClientId: TestingModule =
        await Test.createTestingModule({
          providers: [
            ZohoApiService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string, defaultValue?: any) => {
                  if (key === 'ZOHO_CLIENT_ID') return undefined;
                  const configKey = key
                    .replace('ZOHO_', '')
                    .toLowerCase() as keyof ZohoConfig;
                  return mockConfig[configKey] || defaultValue;
                }),
              },
            },
          ],
        }).compile();

      const serviceWithMissingClientId =
        moduleWithMissingClientId.get<ZohoApiService>(ZohoApiService);

      expect(() => serviceWithMissingClientId.getZohoConfig()).toThrow(
        'Zoho client credentials not configured. Please set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET environment variables.',
      );
    });

    it('should throw error when client secret is missing', async () => {
      const moduleWithMissingSecret: TestingModule =
        await Test.createTestingModule({
          providers: [
            ZohoApiService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string, defaultValue?: any) => {
                  if (key === 'ZOHO_CLIENT_SECRET') return undefined;
                  const configKey = key
                    .replace('ZOHO_', '')
                    .toLowerCase() as keyof ZohoConfig;
                  return mockConfig[configKey] || defaultValue;
                }),
              },
            },
          ],
        }).compile();

      const serviceWithMissingSecret =
        moduleWithMissingSecret.get<ZohoApiService>(ZohoApiService);

      expect(() => serviceWithMissingSecret.getZohoConfig()).toThrow(
        'Zoho client credentials not configured. Please set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET environment variables.',
      );
    });

    it('should handle missing optional fields with defaults', async () => {
      const moduleWithMinimalConfig: TestingModule =
        await Test.createTestingModule({
          providers: [
            ZohoApiService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string, defaultValue?: any) => {
                  const minimalConfig: Record<string, any> = {
                    ZOHO_CLIENT_ID: 'test-id',
                    ZOHO_CLIENT_SECRET: 'test-secret',
                  };
                  return minimalConfig[key] || defaultValue;
                }),
              },
            },
          ],
        }).compile();

      const serviceWithMinimalConfig =
        moduleWithMinimalConfig.get<ZohoApiService>(ZohoApiService);
      const config = serviceWithMinimalConfig.getZohoConfig();

      expect(config.redirectUri).toBe('');
      expect(config.refreshToken).toBe('');
      expect(config.environment).toBe('production');
    });
  });

  describe('isConfigured', () => {
    it('should return true when refresh token is present', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when refresh token is missing', async () => {
      const moduleWithoutRefreshToken: TestingModule =
        await Test.createTestingModule({
          providers: [
            ZohoApiService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string, defaultValue?: any) => {
                  if (key === 'ZOHO_REFRESH_TOKEN') return undefined;
                  return defaultValue;
                }),
              },
            },
          ],
        }).compile();

      const serviceWithoutRefreshToken =
        moduleWithoutRefreshToken.get<ZohoApiService>(ZohoApiService);
      expect(serviceWithoutRefreshToken.isConfigured()).toBe(false);
    });
  });

  describe('makeApiRequest', () => {
    const mockAccessToken = 'test-access-token';
    const mockEndpoint = '/test-endpoint';
    const mockResponseData = { data: [{ id: '123', name: 'Test' }] };

    it('should make successful GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
      } as any);

      const result = await service.makeApiRequest(
        mockEndpoint,
        'GET',
        mockAccessToken,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${service.getBaseUrl()}${mockEndpoint}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Zoho-oauthtoken ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      expect(result).toEqual(mockResponseData);
    });

    it('should make successful POST request with body', async () => {
      const requestBody = { name: 'Test Contact' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
      } as any);

      const result = await service.makeApiRequest(
        mockEndpoint,
        'POST',
        mockAccessToken,
        requestBody,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${service.getBaseUrl()}${mockEndpoint}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Zoho-oauthtoken ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
      );
      expect(result).toEqual(mockResponseData);
    });

    it('should handle full URLs without prepending base URL', async () => {
      const fullUrl = 'https://custom.api.com/endpoint';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
      } as any);

      await service.makeApiRequest(fullUrl, 'GET', mockAccessToken);

      expect(mockFetch).toHaveBeenCalledWith(fullUrl, expect.any(Object));
    });

    it('should handle empty responses (204 No Content)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      } as any);

      const result = await service.makeApiRequest(
        mockEndpoint,
        'DELETE',
        mockAccessToken,
      );

      expect(result).toBeNull();
    });

    it('should handle whitespace-only responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('   \n\t   '),
      } as any);

      const result = await service.makeApiRequest(
        mockEndpoint,
        'DELETE',
        mockAccessToken,
      );

      expect(result).toBeNull();
    });

    it('should throw error for HTTP error responses', async () => {
      const errorMessage = 'Unauthorized';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue(errorMessage),
      } as any);

      await expect(
        service.makeApiRequest(mockEndpoint, 'GET', mockAccessToken),
      ).rejects.toThrow(`API request failed: 401 - ${errorMessage}`);
    });

    it('should throw error for invalid JSON responses', async () => {
      const invalidJson = 'invalid json response';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(invalidJson),
      } as any);

      await expect(
        service.makeApiRequest(mockEndpoint, 'GET', mockAccessToken),
      ).rejects.toThrow(`Invalid JSON response from Zoho API: ${invalidJson}`);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(
        service.makeApiRequest(mockEndpoint, 'GET', mockAccessToken),
      ).rejects.toThrow('Network error');
    });
  });

  describe('testConnection', () => {
    const mockAccessToken = 'test-access-token';

    it('should return true for successful connection test', async () => {
      const mockModulesResponse: ZohoModulesResponse = {
        modules: [
          { id: '1', module_name: 'Contacts', api_name: 'Contacts' },
          { id: '2', module_name: 'Leads', api_name: 'Leads' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockModulesResponse)),
      } as any);

      const result = await service.testConnection(mockAccessToken);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${service.getBaseUrl()}/settings/modules`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Zoho-oauthtoken ${mockAccessToken}`,
          }),
        }),
      );
    });

    it('should return false for failed connection test', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
      } as any);

      const result = await service.testConnection(mockAccessToken);

      expect(result).toBe(false);
    });

    it('should return false for network errors during connection test', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.testConnection(mockAccessToken);

      expect(result).toBe(false);
    });
  });

  describe('URL getters', () => {
    it('should return correct base URL', () => {
      expect(service.getBaseUrl()).toBe('https://www.zohoapis.com/crm/v2');
    });

    it('should return correct accounts URL', () => {
      expect(service.getAccountsUrl()).toBe('https://accounts.zoho.com');
    });
  });
});
