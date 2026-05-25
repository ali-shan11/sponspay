import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PawapayService } from './pawapay.service';
import { ProviderCacheService } from './provider-cache.service';
import { RedisService } from '../redis/redis.service';
import { Currency } from '../transaction/entities/currency.entity';
import { Provider } from './interfaces/provider.interface';
import { AvailabilityStatus } from './interfaces/availability.interface';
import {
  PaymentCountryDto,
  PaymentOperatorDto,
} from '../fan/dto/payment-country.dto';
import {
  isOperationalStatus,
  calculateEffectiveLimits,
} from './utils/pawapay.utils';
import { CountryPriceService } from '../transaction/services/country-price.service';

@Injectable()
export class PaymentCountryService {
  private readonly logger = new Logger(PaymentCountryService.name);
  private readonly CACHE_KEY = 'pawapay:payment-countries';
  private readonly CACHE_TTL = 300; // 5 minutes in seconds

  constructor(
    private readonly pawapayService: PawapayService,
    private readonly providerCacheService: ProviderCacheService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => CountryPriceService))
    private readonly countryPriceService: CountryPriceService,
  ) {}

  /**
   * Get all payment countries with available operators and prices.
   * Filters out:
   * - Operators with CLOSED deposit status
   * - Countries with no price configured in country_prices table
   *
   * @returns Array of PaymentCountryDto sorted by country name
   */
  async getPaymentCountries(): Promise<PaymentCountryDto[]> {
    try {
      // Check cache first
      const cached = await this.redisService.getPubClient().get(this.CACHE_KEY);

      if (cached) {
        this.logger.debug('Returning payment countries from Redis cache');
        return JSON.parse(cached);
      }

      // Build the data
      this.logger.log('Building payment countries data');
      const result = await this.buildPaymentCountries();

      // Only cache if we have payment countries
      if (result.length > 0) {
        await this.redisService
          .getPubClient()
          .setex(this.CACHE_KEY, this.CACHE_TTL, JSON.stringify(result));

        this.logger.log(
          `Cached ${result.length} payment countries in Redis with ${this.CACHE_TTL}s TTL`,
        );
      } else {
        this.logger.warn(
          'Skipping cache: buildPaymentCountries returned empty list',
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to get payment countries', error as Error);
      // Graceful degradation: return empty array instead of throwing
      return [];
    }
  }

  /**
   * Clear the payment countries cache
   */
  async clearCache(): Promise<void> {
    await this.redisService.getPubClient().del(this.CACHE_KEY);
    this.logger.log('Payment countries cache cleared');
  }

  /**
   * Validate a payment operator for a specific payment request.
   * Checks operator availability, currency match, and amount limits.
   *
   * @param operatorName - The payment operator name (e.g., "MTN_MOMO_ZMB")
   * @param currency - The currency entity
   * @param amount - The calculated payment amount
   * @param countryCode - The country code (ISO 3166-1 alpha-3)
   * @returns Validation result with operator details or error information
   */
  async validatePaymentOperator(
    operatorName: string,
    currency: Currency,
    amount: number,
    countryCode: string,
  ): Promise<{
    isValid: boolean;
    operator?: PaymentOperatorDto;
    error?: {
      code: string;
      message: string;
      details?: Record<string, any>;
    };
  }> {
    try {
      // 1. Fetch provider from cache
      const providers = await this.providerCacheService.getProviders();
      const provider = providers.find((p) => p.name === operatorName);

      if (!provider) {
        return {
          isValid: false,
          error: {
            code: 'OPERATOR_NOT_FOUND',
            message: `Payment operator "${operatorName}" not found`,
          },
        };
      }

      // 2. Verify currency match
      if (provider.currency !== currency.shortCode) {
        return {
          isValid: false,
          error: {
            code: 'CURRENCY_MISMATCH',
            message: `Payment provider ${operatorName} does not support currency ${currency.shortCode}`,
            details: {
              providerCurrency: provider.currency,
              requestedCurrency: currency.shortCode,
            },
          },
        };
      }

      // 3. Check availability status
      const availabilityMap = await this.buildAvailabilityMap();
      const depositStatus = availabilityMap.get(operatorName);

      if (!depositStatus) {
        return {
          isValid: false,
          error: {
            code: 'AVAILABILITY_UNKNOWN',
            message: `Cannot determine availability for operator ${operatorName}`,
          },
        };
      }

      if (depositStatus === 'CLOSED') {
        return {
          isValid: false,
          error: {
            code: 'OPERATOR_UNAVAILABLE',
            message: `Operator ${operatorName} is currently unavailable`,
            details: { status: depositStatus },
          },
        };
      }

      // 4. Get country-based price
      const price = await this.countryPriceService.getPrice(
        countryCode,
        currency.shortCode,
      );

      if (price === null) {
        return {
          isValid: false,
          error: {
            code: 'PRICE_NOT_CONFIGURED',
            message: `No price configured for ${currency.shortCode} in ${countryCode}`,
          },
        };
      }

      // 5. Calculate effective limits (same logic as buildPaymentCountries)
      const { effectiveMin, effectiveMax, maxMultiple } =
        calculateEffectiveLimits(
          price,
          provider.minDepositLimit,
          provider.maxDepositLimit,
        );

      // 6. Validate amount against limits
      if (amount < effectiveMin) {
        return {
          isValid: false,
          error: {
            code: 'AMOUNT_BELOW_MINIMUM',
            message: `Amount ${amount} is below minimum ${effectiveMin}`,
            details: {
              price: effectiveMin,
              requestedAmount: amount,
              currency: currency.shortCode,
            },
          },
        };
      }

      if (amount > effectiveMax) {
        return {
          isValid: false,
          error: {
            code: 'AMOUNT_ABOVE_MAXIMUM',
            message: `Amount ${amount} exceeds maximum ${effectiveMax}`,
            details: {
              requestedAmount: amount,
              currency: currency.shortCode,
            },
          },
        };
      }

      // 7. Validate price multiple
      const actualMultiple = Math.round(amount / price);
      if (actualMultiple > maxMultiple) {
        return {
          isValid: false,
          error: {
            code: 'MULTIPLE_EXCEEDS_LIMIT',
            message: `Price multiple ${actualMultiple} exceeds limit ${maxMultiple}`,
            details: {
              maxMultiple,
              requestedMultiple: actualMultiple,
              currency: currency.shortCode,
            },
          },
        };
      }

      // 8. Return success with operator details
      return {
        isValid: true,
        operator: {
          name: provider.name,
          displayName: provider.name.replace(/_/g, ' '),
          status: depositStatus as 'OPERATIONAL' | 'DELAYED',
          price: effectiveMin,
          maxMultiple,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error validating payment operator ${operatorName}`,
        error as Error,
      );
      return {
        isValid: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Internal error during validation',
        },
      };
    }
  }

  /**
   * Build payment countries data from providers, availability, and country prices
   */
  private async buildPaymentCountries(): Promise<PaymentCountryDto[]> {
    // 1. Get all providers (already cached for 1 hour)
    const providers = await this.providerCacheService.getProviders();

    if (!providers.length) {
      this.logger.warn('No providers found');
      return [];
    }

    // 2. Fetch availability for all providers
    const availabilityMap = await this.buildAvailabilityMap();

    // 3. Get country-based prices as a map
    const countryPriceMap = await this.countryPriceService.getAllPricesAsMap();

    // 4. Group providers by country
    const countryMap = new Map<string, Provider[]>();
    for (const provider of providers) {
      const existing = countryMap.get(provider.countryCode) || [];
      existing.push(provider);
      countryMap.set(provider.countryCode, existing);
    }

    // 5. Build payment countries
    const paymentCountries: PaymentCountryDto[] = [];

    for (const [countryCode, countryProviders] of countryMap) {
      // Get currency for this country (all providers in a country use the same currency)
      const currency = countryProviders[0].currency;
      const priceKey = `${countryCode}:${currency}`;
      const price = countryPriceMap.get(priceKey);

      // Skip if price is not configured for this country/currency
      if (price === undefined) {
        this.logger.debug(
          `Skipping country ${countryCode}: no price configured for ${currency}`,
        );
        continue;
      }

      // Filter operators by deposit availability (OPERATIONAL or DELAYED only)
      const availableOperators: PaymentOperatorDto[] = [];

      for (const provider of countryProviders) {
        const depositStatus = availabilityMap.get(provider.name);

        // Skip if no availability data or CLOSED
        if (!isOperationalStatus(depositStatus)) {
          this.logger.debug(
            `Skipping operator ${provider.name}: deposit status is ${depositStatus || 'unknown'}`,
          );
          continue;
        }

        // Calculate effective limits using utility
        const { effectiveMin, maxMultiple } = calculateEffectiveLimits(
          price,
          provider.minDepositLimit,
          provider.maxDepositLimit,
        );

        availableOperators.push({
          name: provider.name,
          displayName: provider.name.replace(/_/g, ' '),
          status: depositStatus as 'OPERATIONAL' | 'DELAYED',
          price: effectiveMin,
          maxMultiple,
        });
      }

      // Skip country if no available operators
      if (availableOperators.length === 0) {
        this.logger.debug(
          `Skipping country ${countryCode}: no available operators`,
        );
        continue;
      }

      paymentCountries.push({
        countryCode,
        countryName: countryProviders[0].country,
        currency,
        operators: availableOperators,
      });
    }

    // 6. Sort by country name
    paymentCountries.sort((a, b) => a.countryName.localeCompare(b.countryName));

    this.logger.log(
      `Built ${paymentCountries.length} payment countries with ${paymentCountries.reduce((sum, c) => sum + c.operators.length, 0)} operators`,
    );

    return paymentCountries;
  }

  /**
   * Build a map of provider name to deposit availability status
   */
  protected async buildAvailabilityMap(): Promise<
    Map<string, AvailabilityStatus>
  > {
    const map = new Map<string, AvailabilityStatus>();

    try {
      const availability = await this.pawapayService.fetchAvailability();

      for (const country of availability) {
        for (const provider of country.providers) {
          // Get DEPOSIT status directly from operationTypes object
          const depositStatus = provider.operationTypes.DEPOSIT;

          if (depositStatus) {
            map.set(provider.provider, depositStatus);
          }
        }
      }

      this.logger.debug(`Built availability map with ${map.size} providers`);
    } catch (error) {
      this.logger.error(
        'Failed to fetch availability from PawaPay API',
        error as Error,
      );
      // Return empty map - all operators will be skipped due to missing availability
    }

    return map;
  }
}
