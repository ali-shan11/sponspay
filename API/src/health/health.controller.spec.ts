import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  DiskHealthIndicator,
  HttpHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockTypeOrmHealthIndicator = {
      pingCheck: jest.fn(),
    };

    const mockDiskHealthIndicator = {
      checkStorage: jest.fn(),
    };

    const mockHttpHealthIndicator = {
      pingCheck: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('http://telegram-service'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockTypeOrmHealthIndicator,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealthIndicator,
        },
        {
          provide: HttpHealthIndicator,
          useValue: mockHttpHealthIndicator,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('live', () => {
    it('should return ok status', () => {
      expect(controller.live()).toEqual({ status: 'ok' });
    });
  });

  describe('check', () => {
    it('should perform health checks and return results', async () => {
      const mockHealthResult: HealthCheckResult = {
        status: 'ok',
        info: {
          database: {
            status: 'up',
          },
          storage: {
            status: 'up',
          },
          'telegram-service': {
            status: 'up',
          },
        },
        error: {},
        details: {
          database: {
            status: 'up',
          },
          storage: {
            status: 'up',
          },
          'telegram-service': {
            status: 'up',
          },
        },
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should handle health check failures', async () => {
      const mockHealthResult: HealthCheckResult = {
        status: 'error',
        info: {
          storage: {
            status: 'up',
          },
          'telegram-service': {
            status: 'up',
          },
        },
        error: {
          database: {
            status: 'down',
            message: 'Connection failed',
          },
        },
        details: {
          storage: {
            status: 'up',
          },
          'telegram-service': {
            status: 'up',
          },
          database: {
            status: 'down',
            message: 'Connection failed',
          },
        },
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
      expect(result.status).toBe('error');
    });
  });
});
