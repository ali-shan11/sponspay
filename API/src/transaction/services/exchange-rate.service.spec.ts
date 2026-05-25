import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { ExchangeRateService } from './exchange-rate.service';
import { RedisService } from '../../redis/redis.service';
import {
  ExchangeRateResponseDto,
  ExchangeRateErrorResponseDto,
} from '../dto/exchange-rate-response.dto';

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let httpService: jest.Mocked<HttpService>;
  let redisClient: { get: jest.Mock; setex: jest.Mock };

  const mockApiKey = 'test-api-key-12345';
  const mockBaseUrl = 'https://v6.exchangerate-api.com/v6';

  const mockSuccessResponse: ExchangeRateResponseDto = {
    result: 'success',
    documentation: 'https://www.exchangerate-api.com/docs',
    terms_of_use: 'https://www.exchangerate-api.com/terms',
    time_last_update_unix: 1585267200,
    time_last_update_utc: 'Fri, 27 Mar 2020 00:00:00 +0000',
    time_next_update_unix: 1585270800,
    time_next_update_utc: 'Sat, 28 Mar 2020 01:00:00 +0000',
    base_code: 'EUR',
    target_code: 'USD',
    conversion_rate: 1.0925,
  };

  beforeEach(async () => {
    redisClient = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
    };

    const mockHttpService = {
      get: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'EXCHANGE_RATE_API_KEY') return mockApiKey;
        if (key === 'EXCHANGE_RATE_BASE_URL') return mockBaseUrl;
        return undefined;
      }),
    };

    const mockRedisService = {
      getPubClient: jest.fn().mockReturnValue(redisClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('convertCurrency', () => {
    it('should successfully convert currency without amount', async () => {
      const axiosResponse: AxiosResponse<ExchangeRateResponseDto> = {
        data: mockSuccessResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(axiosResponse));

      const result = await service.convertCurrency('EUR', 'USD');

      expect(result).toEqual(mockSuccessResponse);
      expect(httpService.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/${mockApiKey}/pair/EUR/USD`,
      );
    });

    it('should successfully convert currency with amount (computed locally)', async () => {
      const axiosResponse: AxiosResponse<ExchangeRateResponseDto> = {
        data: { ...mockSuccessResponse },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(axiosResponse));

      const result = await service.convertCurrency('EUR', 'USD', 100);

      expect(result.conversion_rate).toBe(1.0925);
      expect(result.conversion_result).toBe(1.0925 * 100);
      expect(httpService.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/${mockApiKey}/pair/EUR/USD`,
      );
    });

    it('should default to USD when target currency is not provided', async () => {
      const axiosResponse: AxiosResponse<ExchangeRateResponseDto> = {
        data: mockSuccessResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(axiosResponse));

      await service.convertCurrency('EUR');

      expect(httpService.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/${mockApiKey}/pair/EUR/USD`,
      );
    });

    it('should convert currency codes to uppercase', async () => {
      const axiosResponse: AxiosResponse<ExchangeRateResponseDto> = {
        data: mockSuccessResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(axiosResponse));

      await service.convertCurrency('eur', 'usd');

      expect(httpService.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/${mockApiKey}/pair/EUR/USD`,
      );
    });

    it('should throw BadRequestException for unsupported currency code', async () => {
      const errorResponse: ExchangeRateErrorResponseDto = {
        result: 'error',
        'error-type': 'unsupported-code',
      };

      const axiosResponse: AxiosResponse<ExchangeRateErrorResponseDto> = {
        data: errorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(axiosResponse));

      await expect(service.convertCurrency('XXX', 'USD')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.convertCurrency('XXX', 'USD')).rejects.toThrow(
        'One or both currency codes are not supported',
      );
    });

    it('should throw BadRequestException for malformed request', async () => {
      const errorResponse: ExchangeRateErrorResponseDto = {
        result: 'error',
        'error-type': 'malformed-request',
      };

      const axiosResponse: AxiosResponse<ExchangeRateErrorResponseDto> = {
        data: errorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(axiosResponse));

      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        'The request was malformed',
      );
    });

    it('should throw UnauthorizedException for invalid API key', async () => {
      const errorResponse: ExchangeRateErrorResponseDto = {
        result: 'error',
        'error-type': 'invalid-key',
      };

      const axiosResponse: AxiosResponse<ExchangeRateErrorResponseDto> = {
        data: errorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(axiosResponse));

      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        'The ExchangeRate API key is invalid',
      );
    });

    it('should throw UnauthorizedException for inactive account', async () => {
      const errorResponse: ExchangeRateErrorResponseDto = {
        result: 'error',
        'error-type': 'inactive-account',
      };

      const axiosResponse: AxiosResponse<ExchangeRateErrorResponseDto> = {
        data: errorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(axiosResponse));

      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        'The ExchangeRate API account is inactive',
      );
    });

    it('should throw ServiceUnavailableException for quota reached', async () => {
      const errorResponse: ExchangeRateErrorResponseDto = {
        result: 'error',
        'error-type': 'quota-reached',
      };

      const axiosResponse: AxiosResponse<ExchangeRateErrorResponseDto> = {
        data: errorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(axiosResponse));

      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        'ExchangeRate API quota has been reached',
      );
    });

    it('should throw ServiceUnavailableException for connection refused', async () => {
      const axiosError = {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
        isAxiosError: true,
      } as AxiosError;

      httpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        'Unable to reach ExchangeRate API',
      );
    });

    it('should throw ServiceUnavailableException for timeout', async () => {
      const axiosError = {
        code: 'ETIMEDOUT',
        message: 'Request timeout',
        isAxiosError: true,
      } as AxiosError;

      httpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        'Unable to reach ExchangeRate API',
      );
    });

    it('should throw BadRequestException for 404 error', async () => {
      const axiosError = {
        response: {
          status: 404,
          data: {},
        },
        message: 'Not found',
        isAxiosError: true,
      } as AxiosError;

      httpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        'ExchangeRate API endpoint not found',
      );
    });

    it('should throw ServiceUnavailableException for 500 error', async () => {
      const axiosError = {
        response: {
          status: 500,
          data: {},
        },
        message: 'Internal server error',
        isAxiosError: true,
      } as AxiosError;

      httpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        'ExchangeRate API server error (500)',
      );
    });

    it('should throw ServiceUnavailableException for unknown errors', async () => {
      const axiosError = {
        message: 'Unknown error',
        isAxiosError: true,
      } as AxiosError;

      httpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.convertCurrency('EUR', 'USD')).rejects.toThrow(
        'An unexpected error occurred',
      );
    });
  });

  describe('constructor', () => {
    const mockRedisService = {
      getPubClient: jest
        .fn()
        .mockReturnValue({ get: jest.fn(), setex: jest.fn() }),
    } as any as RedisService;

    it('should initialize without API key and warn', () => {
      const mockConfigServiceNoKey = {
        get: jest.fn((key: string) => {
          if (key === 'EXCHANGE_RATE_BASE_URL') return mockBaseUrl;
          return undefined;
        }),
      };

      const testService = new ExchangeRateService(
        httpService,
        mockConfigServiceNoKey as any as ConfigService,
        mockRedisService,
      );

      // Service should still be created
      expect(mockConfigServiceNoKey.get).toHaveBeenCalledWith(
        'EXCHANGE_RATE_API_KEY',
      );
      expect(testService['apiKey']).toBe('');
    });

    it('should normalize base URL by removing trailing slash', () => {
      const mockConfigServiceWithSlash = {
        get: jest.fn((key: string) => {
          if (key === 'EXCHANGE_RATE_API_KEY') return mockApiKey;
          if (key === 'EXCHANGE_RATE_BASE_URL')
            return 'https://v6.exchangerate-api.com/v6/';
          return undefined;
        }),
      };

      const testService = new ExchangeRateService(
        httpService,
        mockConfigServiceWithSlash as any as ConfigService,
        mockRedisService,
      );

      expect(testService['baseUrl']).toBe('https://v6.exchangerate-api.com/v6');
    });
  });

  describe('caching', () => {
    it('should return cached rate without calling the API', async () => {
      redisClient.get.mockResolvedValue(JSON.stringify(mockSuccessResponse));

      const result = await service.convertCurrency('EUR', 'USD');

      expect(result).toEqual(mockSuccessResponse);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('should compute conversion_result locally on cache hit when amount is provided', async () => {
      redisClient.get.mockResolvedValue(JSON.stringify(mockSuccessResponse));

      const result = await service.convertCurrency('EUR', 'USD', 100);

      expect(result.conversion_rate).toBe(1.0925);
      expect(result.conversion_result).toBe(1.0925 * 100);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('should call API and cache on cache miss', async () => {
      redisClient.get.mockResolvedValue(null);

      const axiosResponse: AxiosResponse<ExchangeRateResponseDto> = {
        data: { ...mockSuccessResponse },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(axiosResponse));

      const result = await service.convertCurrency('EUR', 'USD');

      expect(result).toEqual(mockSuccessResponse);
      expect(httpService.get).toHaveBeenCalled();
      expect(redisClient.setex).toHaveBeenCalledWith(
        'exchange-rate:EUR:USD',
        14400,
        expect.any(String),
      );
    });

    it('should fall through to API when Redis read fails', async () => {
      redisClient.get.mockRejectedValue(new Error('Redis connection error'));

      const axiosResponse: AxiosResponse<ExchangeRateResponseDto> = {
        data: { ...mockSuccessResponse },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(axiosResponse));

      const result = await service.convertCurrency('EUR', 'USD');

      expect(result).toEqual(mockSuccessResponse);
      expect(httpService.get).toHaveBeenCalled();
    });

    it('should still return result when Redis write fails', async () => {
      redisClient.get.mockResolvedValue(null);
      redisClient.setex.mockRejectedValue(new Error('Redis write error'));

      const axiosResponse: AxiosResponse<ExchangeRateResponseDto> = {
        data: { ...mockSuccessResponse },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(axiosResponse));

      const result = await service.convertCurrency('EUR', 'USD');

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should not cache API error responses', async () => {
      redisClient.get.mockResolvedValue(null);

      const errorResponse: ExchangeRateErrorResponseDto = {
        result: 'error',
        'error-type': 'unsupported-code',
      };

      const axiosResponse: AxiosResponse<ExchangeRateErrorResponseDto> = {
        data: errorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(axiosResponse));

      await expect(service.convertCurrency('XXX', 'USD')).rejects.toThrow(
        BadRequestException,
      );
      expect(redisClient.setex).not.toHaveBeenCalled();
    });
  });
});
