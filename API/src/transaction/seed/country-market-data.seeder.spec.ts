import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { CountryMarketDataSeeder } from './country-market-data.seeder';
import { Country } from '../entities/country.entity';

describe('CountryMarketDataSeeder', () => {
  let seeder: CountryMarketDataSeeder;
  let countryRepo: any;

  beforeEach(async () => {
    countryRepo = {
      find: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountryMarketDataSeeder,
        {
          provide: getRepositoryToken(Country),
          useValue: countryRepo,
        },
      ],
    }).compile();

    seeder = module.get<CountryMarketDataSeeder>(CountryMarketDataSeeder);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(seeder).toBeDefined();
  });

  it('should seed market data for countries that have null creditCardPenetration', async () => {
    countryRepo.find.mockResolvedValue([
      { id: 'uuid-ken', iso3Code: 'KEN' },
      { id: 'uuid-uga', iso3Code: 'UGA' },
    ]);
    countryRepo.update.mockResolvedValue({ affected: 1 });

    await seeder.seed();

    expect(countryRepo.update).toHaveBeenCalledWith('uuid-ken', {
      iso2Code: 'KE',
      creditCardPenetration: 4.4,
      mobilePenetration: 92.7,
    });
    expect(countryRepo.update).toHaveBeenCalledWith('uuid-uga', {
      iso2Code: 'UG',
      creditCardPenetration: 2.0,
      mobilePenetration: 78.6,
    });
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      'Seeded market data for 2 countries',
    );
  });

  it('should skip countries that already have market data', async () => {
    // Return empty — all countries already have data (none with null creditCardPenetration)
    countryRepo.find.mockResolvedValue([]);

    await seeder.seed();

    expect(countryRepo.update).not.toHaveBeenCalled();
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      'Country market data already seeded.',
    );
  });

  it('should skip market data entries for countries not in the database', async () => {
    // Only KEN exists and needs update; other market data countries are not in DB
    countryRepo.find.mockResolvedValue([{ id: 'uuid-ken', iso3Code: 'KEN' }]);
    countryRepo.update.mockResolvedValue({ affected: 1 });

    await seeder.seed();

    expect(countryRepo.update).toHaveBeenCalledTimes(1);
    expect(countryRepo.update).toHaveBeenCalledWith('uuid-ken', {
      iso2Code: 'KE',
      creditCardPenetration: 4.4,
      mobilePenetration: 92.7,
    });
  });

  it('should handle database errors gracefully', async () => {
    countryRepo.find.mockRejectedValue(new Error('DB connection failed'));

    await seeder.seed();

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Country market data seeding failed',
      expect.any(Error),
    );
  });
});
