import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TelegramConfig } from './telegram.config';

describe('TelegramConfig', () => {
  let config: TelegramConfig;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramConfig,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    config = module.get<TelegramConfig>(TelegramConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('retryDelays', () => {
    it('should return default retry delays when env variable not set', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(config.retryDelays).toEqual([1000, 5000, 15000]);
    });

    it('should parse comma-separated retry delays from env variable', () => {
      mockConfigService.get.mockReturnValue('2000, 10000, 30000');

      expect(config.retryDelays).toEqual([2000, 10000, 30000]);
    });

    it('should handle retry delays without spaces', () => {
      mockConfigService.get.mockReturnValue('1500,7500,20000');

      expect(config.retryDelays).toEqual([1500, 7500, 20000]);
    });
  });

  describe('maxRetryAttempts', () => {
    it('should return default max retry attempts when env variable not set', () => {
      mockConfigService.get.mockImplementation(
        (_key, defaultValue) => defaultValue,
      );

      expect(config.maxRetryAttempts).toBe(3);
    });

    it('should return configured max retry attempts', () => {
      mockConfigService.get.mockReturnValue(5);

      expect(config.maxRetryAttempts).toBe(5);
    });
  });

  describe('pollingInterval', () => {
    it('should return default polling interval when env variable not set', () => {
      mockConfigService.get.mockImplementation(
        (_key, defaultValue) => defaultValue,
      );

      expect(config.pollingInterval).toBe(15000);
    });

    it('should return configured polling interval', () => {
      mockConfigService.get.mockReturnValue(10000);

      expect(config.pollingInterval).toBe(10000);
    });
  });

  describe('pollingMaxDuration', () => {
    it('should return default polling max duration when env variable not set', () => {
      mockConfigService.get.mockImplementation(
        (_key, defaultValue) => defaultValue,
      );

      expect(config.pollingMaxDuration).toBe(30 * 60 * 1000);
    });

    it('should return configured polling max duration', () => {
      mockConfigService.get.mockReturnValue(60 * 60 * 1000);

      expect(config.pollingMaxDuration).toBe(60 * 60 * 1000);
    });
  });

  describe('managementEmail', () => {
    it('should return undefined when env variable not set', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(config.managementEmail).toBeUndefined();
    });

    it('should return configured management email', () => {
      mockConfigService.get.mockReturnValue('admin@example.com');

      expect(config.managementEmail).toBe('admin@example.com');
    });
  });

  describe('fromEmail', () => {
    it('should return undefined when env variable not set', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(config.fromEmail).toBeUndefined();
    });

    it('should return configured from email', () => {
      mockConfigService.get.mockReturnValue('noreply@example.com');

      expect(config.fromEmail).toBe('noreply@example.com');
    });
  });

  describe('replyCacheTTL', () => {
    it('should return default reply cache TTL when env variable not set', () => {
      mockConfigService.get.mockImplementation(
        (_key, defaultValue) => defaultValue,
      );

      expect(config.replyCacheTTL).toBe(300);
    });

    it('should return configured reply cache TTL', () => {
      mockConfigService.get.mockReturnValue(600);

      expect(config.replyCacheTTL).toBe(600);
    });
  });

  describe('maxHistoryFetchLimit', () => {
    it('should return default max history fetch limit when env variable not set', () => {
      mockConfigService.get.mockImplementation(
        (_key, defaultValue) => defaultValue,
      );

      expect(config.maxHistoryFetchLimit).toBe(500);
    });

    it('should return configured max history fetch limit', () => {
      mockConfigService.get.mockReturnValue(1000);

      expect(config.maxHistoryFetchLimit).toBe(1000);
    });
  });
});
