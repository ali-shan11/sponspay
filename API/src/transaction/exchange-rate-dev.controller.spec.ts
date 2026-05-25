import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ExchangeRateDevController } from './exchange-rate-dev.controller';
import { ExchangeRateService } from './services/exchange-rate.service';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import { ExchangeRateResponseDto } from './dto/exchange-rate-response.dto';
import { NonProdGuard } from '../admin/guards/non-prod.guard';
import { ApiKeyGuard } from '../auth/api-key.guard';

describe('ExchangeRateDevController', () => {
  let controller: ExchangeRateDevController;
  let exchangeRateService: jest.Mocked<ExchangeRateService>;

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
    conversion_result: 109.25,
  };

  beforeEach(async () => {
    const mockExchangeRateService = {
      convertCurrency: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExchangeRateDevController],
      providers: [
        {
          provide: ExchangeRateService,
          useValue: mockExchangeRateService,
        },
      ],
    })
      .overrideGuard(NonProdGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ExchangeRateDevController>(
      ExchangeRateDevController,
    );
    exchangeRateService = module.get(ExchangeRateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('convertCurrency', () => {
    it('should successfully convert currency with target specified', async () => {
      const dto: ConvertCurrencyDto = {
        from: 'EUR',
        to: 'USD',
        amount: 100,
      };

      exchangeRateService.convertCurrency.mockResolvedValue(
        mockSuccessResponse,
      );

      const result = await controller.convertCurrency(dto);

      expect(result).toEqual(mockSuccessResponse);
      expect(exchangeRateService.convertCurrency).toHaveBeenCalledWith(
        'EUR',
        'USD',
        100,
      );
      expect(exchangeRateService.convertCurrency).toHaveBeenCalledTimes(1);
    });

    it('should default to USD when target currency is not provided', async () => {
      const dto: ConvertCurrencyDto = {
        from: 'EUR',
        amount: 100,
      };

      exchangeRateService.convertCurrency.mockResolvedValue(
        mockSuccessResponse,
      );

      const result = await controller.convertCurrency(dto);

      expect(result).toEqual(mockSuccessResponse);
      expect(exchangeRateService.convertCurrency).toHaveBeenCalledWith(
        'EUR',
        'USD',
        100,
      );
    });

    it('should handle different currency pairs', async () => {
      const dto: ConvertCurrencyDto = {
        from: 'GBP',
        to: 'JPY',
        amount: 50,
      };

      const customResponse: ExchangeRateResponseDto = {
        ...mockSuccessResponse,
        base_code: 'GBP',
        target_code: 'JPY',
        conversion_rate: 188.5,
        conversion_result: 9425,
      };

      exchangeRateService.convertCurrency.mockResolvedValue(customResponse);

      const result = await controller.convertCurrency(dto);

      expect(result).toEqual(customResponse);
      expect(exchangeRateService.convertCurrency).toHaveBeenCalledWith(
        'GBP',
        'JPY',
        50,
      );
    });

    it('should handle small amounts', async () => {
      const dto: ConvertCurrencyDto = {
        from: 'USD',
        to: 'EUR',
        amount: 0.01,
      };

      const customResponse: ExchangeRateResponseDto = {
        ...mockSuccessResponse,
        base_code: 'USD',
        target_code: 'EUR',
        conversion_rate: 0.92,
        conversion_result: 0.0092,
      };

      exchangeRateService.convertCurrency.mockResolvedValue(customResponse);

      const result = await controller.convertCurrency(dto);

      expect(result).toEqual(customResponse);
      expect(exchangeRateService.convertCurrency).toHaveBeenCalledWith(
        'USD',
        'EUR',
        0.01,
      );
    });

    it('should handle large amounts', async () => {
      const dto: ConvertCurrencyDto = {
        from: 'EUR',
        to: 'USD',
        amount: 1000000,
      };

      const customResponse: ExchangeRateResponseDto = {
        ...mockSuccessResponse,
        conversion_result: 1092500,
      };

      exchangeRateService.convertCurrency.mockResolvedValue(customResponse);

      const result = await controller.convertCurrency(dto);

      expect(result).toEqual(customResponse);
      expect(exchangeRateService.convertCurrency).toHaveBeenCalledWith(
        'EUR',
        'USD',
        1000000,
      );
    });

    it('should propagate BadRequestException from service', async () => {
      const dto: ConvertCurrencyDto = {
        from: 'XXX',
        to: 'USD',
        amount: 100,
      };

      exchangeRateService.convertCurrency.mockRejectedValue(
        new BadRequestException('Invalid currency code'),
      );

      await expect(controller.convertCurrency(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.convertCurrency(dto)).rejects.toThrow(
        'Invalid currency code',
      );
    });

    it('should propagate UnauthorizedException from service', async () => {
      const dto: ConvertCurrencyDto = {
        from: 'EUR',
        to: 'USD',
        amount: 100,
      };

      exchangeRateService.convertCurrency.mockRejectedValue(
        new UnauthorizedException('Invalid API key'),
      );

      await expect(controller.convertCurrency(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.convertCurrency(dto)).rejects.toThrow(
        'Invalid API key',
      );
    });

    it('should propagate ServiceUnavailableException from service', async () => {
      const dto: ConvertCurrencyDto = {
        from: 'EUR',
        to: 'USD',
        amount: 100,
      };

      exchangeRateService.convertCurrency.mockRejectedValue(
        new ServiceUnavailableException('Service unavailable'),
      );

      await expect(controller.convertCurrency(dto)).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(controller.convertCurrency(dto)).rejects.toThrow(
        'Service unavailable',
      );
    });
  });

  describe('guards', () => {
    it('should be protected by NonProdGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        ExchangeRateDevController,
      );
      expect(guards).toContain(NonProdGuard);
    });

    it('should be protected by ApiKeyGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        ExchangeRateDevController,
      );
      expect(guards).toContain(ApiKeyGuard);
    });
  });
});
