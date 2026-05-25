import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Country } from '../entities/country.entity';

interface MarketDataEntry {
  iso3: string;
  iso2: string;
  creditCard: number;
  mobile: number;
}

const MARKET_DATA: MarketDataEntry[] = [
  { iso3: 'BEN', iso2: 'BJ', creditCard: 3.0, mobile: 77.03 },
  { iso3: 'BFA', iso2: 'BF', creditCard: 2.3, mobile: 87.82 },
  { iso3: 'CMR', iso2: 'CM', creditCard: 2.6, mobile: 77.8 },
  { iso3: 'COG', iso2: 'CG', creditCard: 0.9, mobile: 73.2 },
  { iso3: 'COD', iso2: 'CD', creditCard: 2.0, mobile: 54.4 },
  { iso3: 'ETH', iso2: 'ET', creditCard: 0.4, mobile: 58.0 },
  { iso3: 'GAB', iso2: 'GA', creditCard: 3.0, mobile: 87.2 },
  { iso3: 'GHA', iso2: 'GH', creditCard: 4.4, mobile: 87.7 },
  { iso3: 'GIN', iso2: 'GN', creditCard: 2.4, mobile: 82.2 },
  { iso3: 'CIV', iso2: 'CI', creditCard: 2.9, mobile: 89.2 },
  { iso3: 'KEN', iso2: 'KE', creditCard: 4.4, mobile: 92.7 },
  { iso3: 'LSO', iso2: 'LS', creditCard: 4.4, mobile: 79.0 },
  { iso3: 'MLI', iso2: 'ML', creditCard: 4.3, mobile: 84.2 },
  { iso3: 'NGA', iso2: 'NG', creditCard: 3.2, mobile: 83.8 },
  { iso3: 'SEN', iso2: 'SN', creditCard: 9.1, mobile: 87.3 },
  { iso3: 'SLE', iso2: 'SL', creditCard: 1.1, mobile: 59.1 },
  { iso3: 'TZA', iso2: 'TZ', creditCard: 0.9, mobile: 77.8 },
  { iso3: 'TGO', iso2: 'TG', creditCard: 4.9, mobile: 82.6 },
  { iso3: 'UGA', iso2: 'UG', creditCard: 2.0, mobile: 78.6 },
  { iso3: 'ZMB', iso2: 'ZM', creditCard: 2.3, mobile: 78.8 },
];

/**
 * Seeds market penetration data (credit card, mobile) for countries.
 * Called by CountrySeeder after countries are created — not a standalone bootstrap hook.
 */
@Injectable()
export class CountryMarketDataSeeder {
  private readonly logger = new Logger(CountryMarketDataSeeder.name);

  constructor(
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
  ) {}

  async seed() {
    try {
      // Find countries that don't have market data yet
      const countriesWithoutData = await this.countryRepo.find({
        where: { creditCardPenetration: IsNull() },
        select: ['id', 'iso3Code'],
      });

      const needsUpdateMap = new Map(
        countriesWithoutData.map((c) => [c.iso3Code, c.id]),
      );

      let updatedCount = 0;

      for (const data of MARKET_DATA) {
        const countryId = needsUpdateMap.get(data.iso3);

        if (!countryId) {
          // Either country doesn't exist or already has market data
          continue;
        }

        await this.countryRepo.update(countryId, {
          iso2Code: data.iso2,
          creditCardPenetration: data.creditCard,
          mobilePenetration: data.mobile,
        });
        updatedCount++;
      }

      if (updatedCount > 0) {
        this.logger.log(`Seeded market data for ${updatedCount} countries`);
      } else {
        this.logger.log('Country market data already seeded.');
      }
    } catch (error) {
      this.logger.error('Country market data seeding failed', error as Error);
    }
  }
}
