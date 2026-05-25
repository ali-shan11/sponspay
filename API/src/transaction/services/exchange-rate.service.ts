import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import {
  ExchangeRateResponseDto,
  ExchangeRateErrorResponseDto,
} from '../dto/exchange-rate-response.dto';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly CACHE_TTL = 14400; // 4 hours in seconds
  private readonly CACHE_KEY_PREFIX = 'exchange-rate:';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.baseUrl = this.normalizeBaseUrl(
      this.configService.get<string>('EXCHANGE_RATE_BASE_URL') ??
        'https://v6.exchangerate-api.com/v6',
    );
    this.apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY') ?? '';

    if (!this.apiKey) {
      this.logger.warn(
        'ExchangeRate API key is not configured. API calls will fail until configuration is provided.',
      );
    }
  }

  /**
   * Convert currency from one code to another
   * @param from Source currency code (ISO 4217)
   * @param to Target currency code (ISO 4217), defaults to USD
   * @param amount Optional amount to convert
   * @returns Exchange rate data with optional conversion result
   */
  async convertCurrency(
    from: string,
    to: string = 'USD',
    amount?: number,
  ): Promise<ExchangeRateResponseDto> {
    const fromCode = from.toUpperCase();
    const toCode = to.toUpperCase();

    this.logger.debug(
      `Converting ${amount ?? 'rate'} from ${fromCode} to ${toCode}`,
    );

    // Check cache first
    const cached = await this.getCachedRate(fromCode, toCode);
    if (cached) {
      this.logger.debug(`Cache hit for ${fromCode}/${toCode}`);
      if (amount !== undefined) {
        cached.conversion_result = cached.conversion_rate * amount;
      }
      return cached;
    }

    try {
      const url = this.buildConversionUrl(fromCode, toCode);
      const response = await lastValueFrom(
        this.httpService.get<
          ExchangeRateResponseDto | ExchangeRateErrorResponseDto
        >(url),
      );

      const data = response.data;

      // Check if response indicates an error
      if (data.result === 'error') {
        const errorData = data as ExchangeRateErrorResponseDto;
        this.handleApiError(errorData['error-type']);
      }

      const rateData = data as ExchangeRateResponseDto;

      // Cache the rate (fire-and-forget)
      this.cacheRate(fromCode, toCode, rateData);

      if (amount !== undefined) {
        rateData.conversion_result = rateData.conversion_rate * amount;
      }

      this.logger.debug(
        `Successfully converted ${fromCode} to ${toCode}. Rate: ${rateData.conversion_rate}`,
      );

      return rateData;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      return this.handleHttpError(error as AxiosError, fromCode, toCode);
    }
  }

  /**
   * Build the API URL for currency conversion (rate-only, no amount)
   */
  private buildConversionUrl(from: string, to: string): string {
    return `${this.baseUrl}/${this.apiKey}/pair/${from}/${to}`;
  }

  /**
   * Normalize base URL by removing trailing slash
   */
  private normalizeBaseUrl(url: string): string {
    if (!url) {
      return '';
    }
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  /**
   * Handle API-level errors returned in the response
   */
  private handleApiError(errorType: string): never {
    this.logger.error(`ExchangeRate API error: ${errorType}`);

    switch (errorType) {
      case 'unsupported-code':
        throw new BadRequestException(
          'One or both currency codes are not supported. Please use valid ISO 4217 currency codes.',
        );
      case 'malformed-request':
        throw new BadRequestException(
          'The request was malformed. Please check the currency codes and amount format.',
        );
      case 'invalid-key':
        throw new UnauthorizedException(
          'The ExchangeRate API key is invalid. Please check your configuration.',
        );
      case 'inactive-account':
        throw new UnauthorizedException(
          'The ExchangeRate API account is inactive. Please verify your account email.',
        );
      case 'quota-reached':
        throw new ServiceUnavailableException(
          'ExchangeRate API quota has been reached. Please try again later or upgrade your plan.',
        );
      default:
        throw new ServiceUnavailableException(
          `ExchangeRate API error: ${errorType}`,
        );
    }
  }

  /**
   * Handle HTTP-level errors (network, timeout, etc.)
   */
  private handleHttpError(error: AxiosError, from: string, to: string): never {
    this.logger.error(
      `HTTP error while converting ${from} to ${to}: ${error.message}`,
      error.stack,
    );

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new ServiceUnavailableException(
        'Unable to reach ExchangeRate API. The service may be temporarily unavailable.',
      );
    }

    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        throw new BadRequestException(
          'ExchangeRate API endpoint not found. Please check the API configuration.',
        );
      }
      if (status >= 500) {
        throw new ServiceUnavailableException(
          `ExchangeRate API server error (${status}). Please try again later.`,
        );
      }
    }

    throw new ServiceUnavailableException(
      'An unexpected error occurred while fetching exchange rates. Please try again later.',
    );
  }

  private async getCachedRate(
    from: string,
    to: string,
  ): Promise<ExchangeRateResponseDto | null> {
    try {
      const redis = this.redisService.getPubClient();
      const cacheKey = `${this.CACHE_KEY_PREFIX}${from}:${to}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached) as ExchangeRateResponseDto;
      }

      return null;
    } catch (error) {
      this.logger.warn(`Error reading exchange rate cache: ${error}`);
      return null;
    }
  }

  private async cacheRate(
    from: string,
    to: string,
    data: ExchangeRateResponseDto,
  ): Promise<void> {
    try {
      const redis = this.redisService.getPubClient();
      const cacheKey = `${this.CACHE_KEY_PREFIX}${from}:${to}`;
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(data));
      this.logger.debug(
        `Cached exchange rate ${from}/${to} (TTL: ${this.CACHE_TTL}s)`,
      );
    } catch (error) {
      this.logger.warn(`Error writing exchange rate cache: ${error}`);
    }
  }
}
