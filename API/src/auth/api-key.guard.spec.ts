import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from '../api-key/api-key.service';

function createMockContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: Object.fromEntries(
          Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
        ),
      }),
    }),
  } as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  let apiKeyService: jest.Mocked<Pick<ApiKeyService, 'isApiKeyValid'>>;

  beforeEach(() => {
    apiKeyService = { isApiKeyValid: jest.fn() };
  });

  function createGuard(allowedDomains: string): ApiKeyGuard {
    const configService = {
      get: jest.fn().mockReturnValue(allowedDomains),
    } as unknown as ConfigService;
    return new ApiKeyGuard(configService, apiKeyService as any);
  }

  describe('origin-based approval', () => {
    it('should allow requests from an approved origin', async () => {
      const guard = createGuard(
        '["https://dev.sponspay.com","http://localhost:4200"]',
      );
      const context = createMockContext({ Origin: 'http://localhost:4200' });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(apiKeyService.isApiKeyValid).not.toHaveBeenCalled();
    });

    it('should reject requests from an unapproved origin without API key', async () => {
      const guard = createGuard('["https://dev.sponspay.com"]');
      const context = createMockContext({ Origin: 'https://evil.com' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should allow unapproved origin with a valid API key', async () => {
      const guard = createGuard('["https://dev.sponspay.com"]');
      apiKeyService.isApiKeyValid.mockResolvedValue(true);
      const context = createMockContext({
        Origin: 'https://evil.com',
        'Api-Key': 'valid-key',
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(apiKeyService.isApiKeyValid).toHaveBeenCalledWith('valid-key');
    });
  });

  describe('API key fallback', () => {
    it('should allow requests with a valid API key and no origin', async () => {
      const guard = createGuard('[]');
      apiKeyService.isApiKeyValid.mockResolvedValue(true);
      const context = createMockContext({ 'Api-Key': 'valid-key' });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should reject requests with an invalid API key and no origin', async () => {
      const guard = createGuard('[]');
      apiKeyService.isApiKeyValid.mockResolvedValue(false);
      const context = createMockContext({ 'Api-Key': 'bad-key' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject requests with no origin and no API key', async () => {
      const guard = createGuard('[]');
      const context = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('config parsing', () => {
    it('should parse JSON array format', async () => {
      const guard = createGuard('["https://a.com","https://b.com"]');
      const context = createMockContext({ Origin: 'https://b.com' });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should parse comma-separated format', async () => {
      const guard = createGuard('https://a.com,https://b.com');
      const context = createMockContext({ Origin: 'https://a.com' });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should handle a single non-JSON string value', async () => {
      const guard = createGuard('https://only.com');
      const context = createMockContext({ Origin: 'https://only.com' });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  describe('error propagation', () => {
    it('should propagate ApiKeyService errors', async () => {
      const guard = createGuard('[]');
      const error = new Error('Database connection failed');
      apiKeyService.isApiKeyValid.mockRejectedValue(error);
      const context = createMockContext({ 'Api-Key': 'some-key' });

      await expect(guard.canActivate(context)).rejects.toThrow(error);
    });
  });
});
