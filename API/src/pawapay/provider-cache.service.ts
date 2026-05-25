import { Injectable, Logger } from '@nestjs/common';
import { PawapayService } from './pawapay.service';
import { RedisService } from '../redis/redis.service';
import {
  Provider,
  ActiveConfigurationResponse,
} from './interfaces/provider.interface';
import {
  normalizeCountryCode,
  findDepositFromActiveConfig,
} from './utils/pawapay.utils';
import { COUNTRY_DEFAULT_CURRENCIES } from './constants/default-currencies';
import * as countries from 'i18n-iso-countries';
// Import language data - eslint-disable-next-line is required for JSON import
// eslint-disable-next-line @typescript-eslint/no-require-imports
const en = require('i18n-iso-countries/langs/en.json');

@Injectable()
export class ProviderCacheService {
  private readonly logger = new Logger(ProviderCacheService.name);
  private readonly CACHE_KEY = 'pawapay:providers';
  private readonly CACHE_TTL = 3600; // 1 hour in seconds

  constructor(
    private readonly pawapayService: PawapayService,
    private readonly redisService: RedisService,
  ) {
    // Initialize i18n-iso-countries with English locale
    countries.registerLocale(en);
  }

  /**
   * Get all providers from cache or API
   */
  async getProviders(): Promise<Provider[]> {
    try {
      // Check Redis cache
      const cached = await this.redisService.getPubClient().get(this.CACHE_KEY);

      if (cached) {
        this.logger.debug('Returning providers from Redis cache');
        return JSON.parse(cached);
      }

      // Fetch from API
      this.logger.log('Fetching providers from PawaPay API');
      const config = await this.pawapayService.fetchActiveConfiguration();
      const providers = this.mapToProviders(config);

      // Only cache if we have providers
      if (providers.length > 0) {
        await this.redisService
          .getPubClient()
          .setex(this.CACHE_KEY, this.CACHE_TTL, JSON.stringify(providers));

        this.logger.log(
          `Cached ${providers.length} providers in Redis with ${this.CACHE_TTL}s TTL`,
        );
      } else {
        this.logger.warn(
          'Skipping cache: PawaPay API returned empty provider list',
        );
      }

      return providers;
    } catch (error) {
      this.logger.error(
        'Failed to fetch providers from PawaPay API',
        error as Error,
      );
      throw error;
    }
  }

  /**
   * Get providers filtered by country code
   */
  async getProvidersByCountry(countryCode: string): Promise<Provider[]> {
    const allProviders = await this.getProviders();
    const normalized = countryCode.trim().toUpperCase();
    return allProviders.filter((p) => p.countryCode === normalized);
  }

  /**
   * Validate that a provider exists
   */
  async validateProvider(
    name: string,
    countryCode: string,
  ): Promise<Provider | null> {
    const allProviders = await this.getProviders();
    const normalized = countryCode.trim().toUpperCase();
    return (
      allProviders.find(
        (p) => p.name === name && p.countryCode === normalized,
      ) || null
    );
  }

  /**
   * Clear the provider cache
   * Useful for forcing a refresh
   */
  async clearCache(): Promise<void> {
    await this.redisService.getPubClient().del(this.CACHE_KEY);
    this.logger.log('Provider cache cleared');
  }

  /**
   * Map PawaPay API response to our Provider interface
   * Flattens the hierarchical countries -> providers structure
   * and converts ISO 3166-1 alpha-3 codes to country names
   */
  private mapToProviders(config: ActiveConfigurationResponse): Provider[] {
    // Validate response structure
    if (!config.countries || !Array.isArray(config.countries)) {
      this.logger.warn(
        'Invalid response format from PawaPay active configuration: missing or invalid countries array',
      );
      return [];
    }

    const providers: Provider[] = [];

    // Flatten hierarchical structure
    for (const countryEntry of config.countries) {
      const countryCodeAlpha3 = normalizeCountryCode(
        countryEntry.country ?? '',
      );

      if (!countryCodeAlpha3) {
        this.logger.warn('Skipping country entry with missing country code');
        continue;
      }

      // Validate providers array
      if (!countryEntry.providers || !Array.isArray(countryEntry.providers)) {
        this.logger.warn(
          `Skipping country ${countryCodeAlpha3}: missing or invalid providers array`,
        );
        continue;
      }

      // Convert ISO 3166-1 alpha-3 code to country name
      const countryName = countries.getName(countryCodeAlpha3, 'en', {
        select: 'official',
      });

      if (!countryName) {
        this.logger.warn(
          `Skipping country ${countryCodeAlpha3}: unable to resolve country name from ISO code`,
        );
        continue;
      }

      // Flatten providers into Provider objects
      for (const provider of countryEntry.providers) {
        if (!provider.provider) {
          this.logger.warn(
            `Skipping provider in ${countryCodeAlpha3}: missing provider name`,
          );
          continue;
        }

        // v2: currencies is an array, need to iterate
        if (!provider.currencies || !Array.isArray(provider.currencies)) {
          this.logger.warn(
            `Skipping provider ${provider.provider} in ${countryCodeAlpha3}: missing or invalid currencies array`,
          );
          continue;
        }

        // Skip providers with no currencies
        if (provider.currencies.length === 0) {
          this.logger.warn(
            `Skipping provider ${provider.provider} in ${countryCodeAlpha3}: empty currencies array`,
          );
          continue;
        }

        // Select single currency to use (filter multi-currency providers)
        let selectedCurrency = provider.currencies[0];

        if (provider.currencies.length > 1) {
          // Multiple currencies detected - apply filtering logic
          const defaultCurrency = COUNTRY_DEFAULT_CURRENCIES[countryCodeAlpha3];

          if (defaultCurrency) {
            // Try to find the configured default currency
            const found = provider.currencies.find(
              (c) => c.currency === defaultCurrency,
            );

            if (found) {
              selectedCurrency = found;
              this.logger.log(
                `Multiple currencies for ${countryCodeAlpha3}/${provider.provider}: ` +
                  `selected default ${selectedCurrency.currency} ` +
                  `(available: ${provider.currencies.map((c) => c.currency).join(', ')})`,
              );
            } else {
              // Default not found - fallback to first
              selectedCurrency = provider.currencies[0];
              this.logger.warn(
                `Multiple currencies for ${countryCodeAlpha3}/${provider.provider}: ` +
                  `default ${defaultCurrency} not found, using first ${selectedCurrency.currency} ` +
                  `(available: ${provider.currencies.map((c) => c.currency).join(', ')})`,
              );
            }
          } else {
            // No default configured - use first currency with warning
            selectedCurrency = provider.currencies[0];
            this.logger.warn(
              `Multiple currencies for ${countryCodeAlpha3}/${provider.provider}, ` +
                `no default configured. Using first: ${selectedCurrency.currency} ` +
                `(available: ${provider.currencies.map((c) => c.currency).join(', ')})`,
            );
          }
        }

        // Validate selected currency
        if (!selectedCurrency.currency) {
          this.logger.warn(
            `Skipping provider ${provider.provider} in ${countryCodeAlpha3}: selected currency missing currency code`,
          );
          continue;
        }

        // Extract DEPOSIT operation limits from currency's operation types
        const depositOp = findDepositFromActiveConfig(
          selectedCurrency.operationTypes,
        );

        if (!depositOp) {
          this.logger.warn(
            `Skipping provider ${provider.provider} with currency ${selectedCurrency.currency} in ${countryCodeAlpha3}: no DEPOSIT operation type found`,
          );
          continue;
        }

        // Parse limits (they come as strings from API)
        const minDepositLimit = parseFloat(depositOp.minAmount);
        const maxDepositLimit = parseFloat(depositOp.maxAmount);

        if (isNaN(minDepositLimit) || isNaN(maxDepositLimit)) {
          this.logger.warn(
            `Skipping provider ${provider.provider} with currency ${selectedCurrency.currency} in ${countryCodeAlpha3}: invalid transaction limits`,
          );
          continue;
        }

        // Check decimalsInAmount - can be "NONE" or a number as string
        const supportsDecimals =
          depositOp.decimalsInAmount && depositOp.decimalsInAmount !== 'NONE'
            ? parseInt(depositOp.decimalsInAmount, 10) > 0
            : false;

        providers.push({
          name: provider.provider,
          country: countryName,
          countryCode: countryCodeAlpha3,
          currency: selectedCurrency.currency,
          supportsDecimals,
          minDepositLimit,
          maxDepositLimit,
        });
      }
    }

    this.logger.log(
      `Mapped ${providers.length} providers from ${config.countries.length} countries`,
    );

    return providers;
  }
}
