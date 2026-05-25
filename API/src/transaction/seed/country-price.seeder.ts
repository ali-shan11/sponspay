import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CountryPrice } from '../entities/country-price.entity';
import { Country } from '../entities/country.entity';
import { Currency } from '../entities/currency.entity';
import { ProviderCacheService } from '../../pawapay/provider-cache.service';

/**
 * Base message prices per country (iso3Code → price in local currency).
 * Source: SponsPay Min Price Max Multiple spreadsheet.
 * These are only applied when no price has been manually set (price is 0 or missing).
 */
export const DEFAULT_PRICES: Record<string, number> = {
  BEN: 1500,
  BFA: 1500,
  CMR: 1500,
  COG: 1500,
  COD: 5000,
  ETH: 300,
  GHA: 30,
  GNB: 1500,
  GIN: 20000,
  CIV: 1500,
  KEN: 300,
  LSO: 40,
  MWI: 4000,
  MLI: 1500,
  NGA: 1000,
  RWA: 3000,
  SEN: 1500,
  SLE: 50000,
  ZAF: 40,
  TZA: 6000,
  UGA: 9000,
  ZMB: 50,
};

/**
 * Seeds country prices for each country.
 * Called by CountrySeeder after countries and currencies are created — not a standalone bootstrap hook.
 *
 * Behavior:
 * - New entries: created with the price from DEFAULT_PRICES (or 0 if not listed)
 * - Existing entries with price = 0: updated to the DEFAULT_PRICES value
 * - Existing entries with price ≠ 0: left untouched (respects manually-set prices)
 */
@Injectable()
export class CountryPriceSeeder {
  private readonly logger = new Logger(CountryPriceSeeder.name);

  constructor(
    @InjectRepository(CountryPrice)
    private readonly countryPriceRepo: Repository<CountryPrice>,
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
    @InjectRepository(Currency)
    private readonly currencyRepo: Repository<Currency>,
    private readonly providerCacheService: ProviderCacheService,
  ) {}

  async seed() {
    try {
      const countries = await this.countryRepo.find();

      if (!countries.length) {
        this.logger.warn(
          'No countries found - skipping country price seeding. Run CountrySeeder first.',
        );
        return;
      }

      const providers = await this.providerCacheService.getProviders();

      if (!providers.length) {
        this.logger.warn(
          'No providers available - skipping country price seeding',
        );
        return;
      }

      // Build a map of countryCode -> currencyCode from providers
      const countryCurrencyMap = new Map<string, string>();
      for (const provider of providers) {
        if (
          !countryCurrencyMap.has(provider.countryCode) &&
          provider.currency
        ) {
          countryCurrencyMap.set(provider.countryCode, provider.currency);
        }
      }

      // Get all currencies for lookup
      const currencies = await this.currencyRepo.find();
      const currencyByCode = new Map<string, Currency>(
        currencies.map((c) => [c.shortCode, c]),
      );

      let createdCount = 0;
      let updatedCount = 0;
      let skipCount = 0;

      for (const country of countries) {
        const currencyCode = countryCurrencyMap.get(country.iso3Code);

        if (!currencyCode) {
          this.logger.warn(
            `Skipping country ${country.name} (${country.iso3Code}): no currency mapping found in providers`,
          );
          skipCount++;
          continue;
        }

        const currency = currencyByCode.get(currencyCode);

        if (!currency) {
          this.logger.warn(
            `Skipping country ${country.name} (${country.iso3Code}): currency ${currencyCode} not found in database`,
          );
          skipCount++;
          continue;
        }

        const defaultPrice = DEFAULT_PRICES[country.iso3Code] ?? 0;

        const existing = await this.countryPriceRepo.findOne({
          where: {
            countryId: country.id,
            currencyId: currency.id,
          },
        });

        if (existing) {
          // TypeORM returns decimal columns as strings from PostgreSQL
          if (Number(existing.price) !== 0) {
            this.logger.debug(
              `Keeping existing price for ${country.name} (${currencyCode}): ${existing.price}`,
            );
            continue;
          }

          if (defaultPrice === 0) {
            continue;
          }

          // Update zero-price entry with the spreadsheet price
          await this.countryPriceRepo.update(existing.id, {
            price: defaultPrice,
          });
          this.logger.debug(
            `Updated price for ${country.name} (${country.iso3Code}) -> ${currencyCode}: 0 → ${defaultPrice}`,
          );
          updatedCount++;
          continue;
        }

        // Create new entry with the spreadsheet price
        await this.countryPriceRepo.upsert(
          {
            countryId: country.id,
            currencyId: currency.id,
            price: defaultPrice,
            country,
            currency,
          },
          {
            conflictPaths: ['countryId', 'currencyId'],
            skipUpdateIfNoValuesChanged: true,
          },
        );

        this.logger.debug(
          `Seeded country price: ${country.name} (${country.iso3Code}) -> ${currencyCode} at ${defaultPrice}`,
        );
        createdCount++;
      }

      if (createdCount > 0 || updatedCount > 0) {
        this.logger.log(
          `Country prices: ${createdCount} created, ${updatedCount} updated, ${skipCount} skipped.`,
        );
      } else {
        this.logger.log('Country prices already seeded.');
      }
    } catch (error) {
      this.logger.error('Country price seeding failed', error as Error);
    }
  }
}
