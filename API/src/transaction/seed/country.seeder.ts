import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Country } from '../entities/country.entity';
import { ProviderCacheService } from '../../pawapay/provider-cache.service';
import { CountryMarketDataSeeder } from './country-market-data.seeder';
import { CountryPriceSeeder } from './country-price.seeder';

@Injectable()
export class CountrySeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(CountrySeeder.name);

  constructor(
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
    private readonly providerCacheService: ProviderCacheService,
    private readonly countryMarketDataSeeder: CountryMarketDataSeeder,
    private readonly countryPriceSeeder: CountryPriceSeeder,
  ) {}

  async onApplicationBootstrap() {
    try {
      const providers = await this.providerCacheService.getProviders();

      if (!providers.length) {
        this.logger.warn('No providers available - skipping country seeding');
        return;
      }

      // Extract unique countries from providers
      const countryMap = new Map<string, string>();
      for (const provider of providers) {
        if (!countryMap.has(provider.countryCode)) {
          countryMap.set(provider.countryCode, provider.country);
        }
      }

      const desiredCountries = Array.from(countryMap.entries()).map(
        ([iso3Code, name]) => ({ iso3Code, name }),
      );

      // Check existing countries
      const existing = await this.countryRepo.find({
        where: { iso3Code: In(desiredCountries.map((c) => c.iso3Code)) },
        select: ['iso3Code'],
      });

      const existingCodes = new Set(existing.map((e) => e.iso3Code));
      const missing = desiredCountries.filter(
        (c) => !existingCodes.has(c.iso3Code),
      );

      if (missing.length === 0) {
        this.logger.log('Countries already seeded.');
      } else {
        // Use upsert to handle race conditions
        for (const country of missing) {
          await this.countryRepo.upsert(
            { iso3Code: country.iso3Code, name: country.name },
            { conflictPaths: ['iso3Code'], skipUpdateIfNoValuesChanged: true },
          );
        }

        this.logger.log(
          `Seeded ${missing.length} countries: ${missing
            .map((c) => `${c.name} (${c.iso3Code})`)
            .join(', ')}`,
        );
      }

      // Run dependent seeders after countries exist
      await this.countryMarketDataSeeder.seed();
      await this.countryPriceSeeder.seed();
    } catch (error) {
      this.logger.error('Country seeding failed', error as Error);
    }
  }
}
