import { Test, TestingModule } from '@nestjs/testing';
import { ZohoTokenService } from './zoho-token.service';
import { ZohoApiService } from './zoho-api.service';
import {
  ZohoTokenResponse,
  ZohoTokenStatus,
} from '../interfaces/zoho-token.interface';
import { ZohoConfig } from '../interfaces/zoho-config.interface';

// Mock fetch globally
global.fetch = jest.fn();

describe('ZohoTokenService', () => {
  let service: ZohoTokenService;
  let zohoApiService: ZohoApiService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  const mockConfig: ZohoConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/oauth/callback',
    refreshToken: 'test-refresh-token',
    environment: 'production',
  };

  const mockTokenResponse: ZohoTokenResponse = {
    access_token: 'new-access-token',
    expires_in: 3600,
    token_type: 'Bearer',
    api_domain: 'https://www.zohoapis.com',
  };

  beforeEach(async () => {
    // Complete reset of all mocks
    jest.resetAllMocks();
    jest.clearAllMocks();

    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    mockFetch.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZohoTokenService,
        {
          provide: ZohoApiService,
          useValue: {
            getZohoConfig: jest.fn().mockReturnValue(mockConfig),
            isConfigured: jest.fn().mockReturnValue(true),
            getAccountsUrl: jest
              .fn()
              .mockReturnValue('https://accounts.zoho.com'),
          },
        },
      ],
    }).compile();

    service = module.get<ZohoTokenService>(ZohoTokenService);
    zohoApiService = module.get<ZohoApiService>(ZohoApiService);

    // Ensure clean state for each test
    service['accessToken'] = null;
    service['tokenExpiresAt'] = 0;
  });

  afterEach(() => {
    // Only clear mocks, don't reset them to preserve service mocks
    jest.clearAllMocks();

    // Reset internal state
    if (service) {
      service['accessToken'] = null;
      service['tokenExpiresAt'] = 0;
    }

    // Reset fetch mock completely
    if (mockFetch) {
      mockFetch.mockClear();
    }
  });

  describe('onModuleInit', () => {
    it('should initialize successfully when configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      } as any);

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Zoho token service initialized successfully',
      );
      expect(service.getTokenStatus().hasToken).toBe(true);
    });

    it('should warn when not configured', async () => {
      jest.spyOn(zohoApiService, 'isConfigured').mockReturnValue(false);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Zoho token service not initialized - ZOHO_REFRESH_TOKEN not found. Run setup scripts to configure.',
      );
    });

    it('should handle initialization errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to initialize Zoho token service',
        expect.any(Error),
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh access token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      } as any);

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.refreshAccessToken();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://accounts.zoho.com/oauth/v2/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: mockConfig.clientId,
            client_secret: mockConfig.clientSecret,
            refresh_token: mockConfig.refreshToken,
          }),
        },
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        'Access token refreshed successfully',
      );
      expect(service.getTokenStatus().hasToken).toBe(true);
    });

    it('should throw error when refresh token is missing', async () => {
      jest.spyOn(zohoApiService, 'getZohoConfig').mockReturnValue({
        ...mockConfig,
        refreshToken: '',
      });

      await expect(service.refreshAccessToken()).rejects.toThrow(
        'Refresh token not configured. Please run the setup scripts to obtain a refresh token.',
      );
    });

    it('should handle HTTP errors during token refresh', async () => {
      const errorResponse = 'Invalid refresh token';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue(errorResponse),
      } as any);

      await expect(service.refreshAccessToken()).rejects.toThrow(
        `Token refresh HTTP error: 400 - ${errorResponse}`,
      );
    });

    it('should handle API error responses', async () => {
      const errorTokenResponse = {
        error: 'invalid_grant',
        error_description: 'Invalid refresh token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(errorTokenResponse),
      } as any);

      await expect(service.refreshAccessToken()).rejects.toThrow(
        'Token refresh failed: invalid_grant - Invalid refresh token',
      );
    });

    it('should handle API error responses without description', async () => {
      const errorTokenResponse = {
        error: 'invalid_grant',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(errorTokenResponse),
      } as any);

      await expect(service.refreshAccessToken()).rejects.toThrow(
        'Token refresh failed: invalid_grant - No description provided',
      );
    });

    it('should handle invalid token response format', async () => {
      const invalidTokenResponse = {
        // Missing access_token and expires_in
        token_type: 'Bearer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(invalidTokenResponse),
      } as any);

      await expect(service.refreshAccessToken()).rejects.toThrow(
        'Invalid token response: missing access_token or expires_in',
      );
    });

    it('should set token expiration 1 minute early', async () => {
      const currentTime = 1000000000000; // Fixed timestamp
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(currentTime);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      } as any);

      await service.refreshAccessToken();

      const tokenStatus = service.getTokenStatus();
      const expectedExpiresAt =
        currentTime + mockTokenResponse.expires_in * 1000 - 60000;

      expect(tokenStatus.expiresAt).toBe(expectedExpiresAt);

      dateNowSpy.mockRestore();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await expect(service.refreshAccessToken()).rejects.toThrow(
        'Network error',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to refresh access token',
        networkError,
      );
    });
  });

  describe('ensureValidToken', () => {
    it('should return existing valid token', async () => {
      // Set up a valid token
      service['accessToken'] = 'existing-token';
      service['tokenExpiresAt'] = Date.now() + 300000; // 5 minutes from now

      const token = await service.ensureValidToken();

      expect(token).toBe('existing-token');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should refresh token when no token exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      } as any);

      const token = await service.ensureValidToken();

      expect(token).toBe(mockTokenResponse.access_token);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should refresh token when current token is expired', async () => {
      // Reset fetch mock
      mockFetch.mockReset();

      // Set up an expired token
      service['accessToken'] = 'expired-token';
      service['tokenExpiresAt'] = Date.now() - 1000; // 1 second ago

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      } as any);

      const token = await service.ensureValidToken();

      expect(token).toBe(mockTokenResponse.access_token);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should refresh token when current token is about to expire', async () => {
      // Reset fetch mock only
      mockFetch.mockReset();

      // Set up a token that expires now (exactly at the threshold)
      // Since the service uses >= comparison, we need the token to be expired
      const currentTime = Date.now();
      service['accessToken'] = 'about-to-expire-token';
      service['tokenExpiresAt'] = currentTime; // Expires exactly now

      // Set up fresh mock for this test only
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      } as any);

      const token = await service.ensureValidToken();

      expect(token).toBe(mockTokenResponse.access_token);
      expect(mockFetch).toHaveBeenCalled();
      // Verify the old token was replaced
      expect(service['accessToken']).toBe(mockTokenResponse.access_token);
    });

    it('should throw error when token refresh fails', async () => {
      // Reset fetch mock only
      mockFetch.mockReset();

      // Clear any previous state
      service['accessToken'] = null;
      service['tokenExpiresAt'] = 0;

      // Set up fresh mock for this test only
      mockFetch.mockRejectedValueOnce(new Error('Refresh failed'));

      await expect(service.ensureValidToken()).rejects.toThrow(
        'Refresh failed',
      );
    });

    it('should throw error when no token is available after refresh', async () => {
      // Mock a successful refresh that somehow doesn't set the token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      } as any);

      // Simulate token not being set (edge case)
      const originalRefresh = service.refreshAccessToken;
      service.refreshAccessToken = jest.fn().mockImplementation(async () => {
        // Don't set the token
      });

      await expect(service.ensureValidToken()).rejects.toThrow(
        'Failed to obtain valid access token',
      );

      service.refreshAccessToken = originalRefresh;
    });
  });

  describe('getTokenStatus', () => {
    it('should return correct status when no token exists', () => {
      const currentTime = 1000000000000; // Fixed timestamp
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(currentTime);

      const status: ZohoTokenStatus = service.getTokenStatus();

      expect(status).toEqual({
        hasToken: false,
        expiresAt: 0,
        timeUntilExpiry: -currentTime,
      });

      dateNowSpy.mockRestore();
    });

    it('should return correct status when token exists', () => {
      const currentTime = 1000000000000; // Fixed timestamp
      const expiresAt = currentTime + 300000; // 5 minutes from now

      service['accessToken'] = 'test-token';
      service['tokenExpiresAt'] = expiresAt;

      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(currentTime);

      const status: ZohoTokenStatus = service.getTokenStatus();

      expect(status).toEqual({
        hasToken: true,
        expiresAt: expiresAt,
        timeUntilExpiry: 300000,
      });

      dateNowSpy.mockRestore();
    });

    it('should return negative time until expiry for expired tokens', () => {
      const currentTime = 1000000000000; // Fixed timestamp
      const expiresAt = currentTime - 60000; // 1 minute ago

      service['accessToken'] = 'expired-token';
      service['tokenExpiresAt'] = expiresAt;

      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(currentTime);

      const status: ZohoTokenStatus = service.getTokenStatus();

      expect(status.hasToken).toBe(true);
      expect(status.timeUntilExpiry).toBe(-60000);

      dateNowSpy.mockRestore();
    });
  });

  describe('forceTokenRefresh', () => {
    it('should clear existing token and refresh', async () => {
      // Reset fetch mock only
      mockFetch.mockReset();

      // Set up existing token
      service['accessToken'] = 'existing-token';
      service['tokenExpiresAt'] = Date.now() + 300000;

      // Set up fresh mock for this test only
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      } as any);

      await service.forceTokenRefresh();

      expect(service.getTokenStatus().hasToken).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle refresh errors during force refresh', async () => {
      // Reset fetch mock only
      mockFetch.mockReset();

      // Set up fresh mock for this test only
      mockFetch.mockRejectedValueOnce(new Error('Force refresh failed'));

      await expect(service.forceTokenRefresh()).rejects.toThrow(
        'Force refresh failed',
      );
    });
  });

  describe('isConfigured', () => {
    it('should return true when ZohoApiService is configured', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when ZohoApiService is not configured', () => {
      jest.spyOn(zohoApiService, 'isConfigured').mockReturnValue(false);

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle malformed JSON in token response', async () => {
      // Reset fetch mock only
      mockFetch.mockReset();

      // Set up fresh mock for this test only
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any);

      await expect(service.refreshAccessToken()).rejects.toThrow(
        'Invalid JSON',
      );
    });

    it('should handle missing expires_in in token response', async () => {
      // Reset fetch mock only
      mockFetch.mockReset();

      const incompleteTokenResponse = {
        access_token: 'test-token',
        // Missing expires_in
        token_type: 'Bearer',
      };

      // Set up fresh mock for this test only
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(incompleteTokenResponse),
      } as any);

      await expect(service.refreshAccessToken()).rejects.toThrow(
        'Invalid token response: missing access_token or expires_in',
      );
    });

    it('should handle zero expires_in in token response', async () => {
      // Reset fetch mock only
      mockFetch.mockReset();

      const zeroExpiryTokenResponse = {
        access_token: 'test-token',
        expires_in: 0,
        token_type: 'Bearer',
      };

      // Set up fresh mock for this test only
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(zeroExpiryTokenResponse),
      } as any);

      await expect(service.refreshAccessToken()).rejects.toThrow(
        'Invalid token response: missing access_token or expires_in',
      );
    });
  });
});
