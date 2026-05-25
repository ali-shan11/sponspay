import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { CountryPriceSeeder, DEFAULT_PRICES } from './country-price.seeder';
import { CountryPrice } from '../entities/country-price.entity';
import { Country } from '../entities/country.entity';
import { Currency } from '../entities/currency.entity';
import { ProviderCacheService } from '../../pawapay/provider-cache.service';

const makeCountry = (iso3Code: string, name: string) => ({
  id: `country-${iso3Code}`,
  iso3Code,
  name,
});

const makeCurrency = (shortCode: string) => ({
  id: `currency-${shortCode}`,
  shortCode,
  name: `${shortCode} currency`,
});

const makeProvider = (countryCode: string, currency: string) => ({
  countryCode,
  currency,
  country: countryCode,
});

describe('CountryPriceSeeder', () => {
  let seeder: CountryPriceSeeder;
  let countryPriceRepo: any;
  let countryRepo: any;
  let currencyRepo: any;
  let providerCacheService: any;

  beforeEach(async () => {
    countryPriceRepo = {
      findOne: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    };
    countryRepo = { find: jest.fn() };
    currencyRepo = { find: jest.fn() };
    providerCacheService = { getProviders: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountryPriceSeeder,
        {
          provide: getRepositoryToken(CountryPrice),
          useValue: countryPriceRepo,
        },
        {
          provide: getRepositoryToken(Country),
          useValue: countryRepo,
        },
        {
          provide: getRepositoryToken(Currency),
          useValue: currencyRepo,
        },
        {
          provide: ProviderCacheService,
          useValue: providerCacheService,
        },
      ],
    }).compile();

    seeder = module.get<CountryPriceSeeder>(CountryPriceSeeder);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(seeder).toBeDefined();
  });

  it('should create new entries with prices from DEFAULT_PRICES', async () => {
    const country = makeCountry('KEN', 'Kenya');
    const currency = makeCurrency('KES');

    countryRepo.find.mockResolvedValue([country]);
    providerCacheService.getProviders.mockResolvedValue([
      makeProvider('KEN', 'KES'),
    ]);
    currencyRepo.find.mockResolvedValue([currency]);
    countryPriceRepo.findOne.mockResolvedValue(null);

    await seeder.seed();

    expect(countryPriceRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        countryId: 'country-KEN',
        currencyId: 'currency-KES',
        price: DEFAULT_PRICES['KEN'],
      }),
      expect.objectContaining({
        conflictPaths: ['countryId', 'currencyId'],
      }),
    );
  });

  it('should update entries that have price = 0 to the spreadsheet price', async () => {
    const country = makeCountry('ZMB', 'Zambia');
    const currency = makeCurrency('ZMW');

    countryRepo.find.mockResolvedValue([country]);
    providerCacheService.getProviders.mockResolvedValue([
      makeProvider('ZMB', 'ZMW'),
    ]);
    currencyRepo.find.mockResolvedValue([currency]);
    // PostgreSQL returns decimal as string
    countryPriceRepo.findOne.mockResolvedValue({
      id: 'price-1',
      countryId: 'country-ZMB',
      currencyId: 'currency-ZMW',
      price: '0.00',
    });

    await seeder.seed();

    expect(countryPriceRepo.update).toHaveBeenCalledWith('price-1', {
      price: DEFAULT_PRICES['ZMB'],
    });
    expect(countryPriceRepo.upsert).not.toHaveBeenCalled();
  });

  it('should NOT update entries that have a non-zero price', async () => {
    const country = makeCountry('GHA', 'Ghana');
    const currency = makeCurrency('GHS');

    countryRepo.find.mockResolvedValue([country]);
    providerCacheService.getProviders.mockResolvedValue([
      makeProvider('GHA', 'GHS'),
    ]);
    currencyRepo.find.mockResolvedValue([currency]);
    countryPriceRepo.findOne.mockResolvedValue({
      id: 'price-2',
      countryId: 'country-GHA',
      currencyId: 'currency-GHS',
      price: '99.00',
    });

    await seeder.seed();

    expect(countryPriceRepo.update).not.toHaveBeenCalled();
    expect(countryPriceRepo.upsert).not.toHaveBeenCalled();
  });

  it('should fall back to price = 0 for countries not in DEFAULT_PRICES', async () => {
    const country = makeCountry('MZN', 'Mozambique');
    const currency = makeCurrency('MZN');

    countryRepo.find.mockResolvedValue([country]);
    providerCacheService.getProviders.mockResolvedValue([
      makeProvider('MZN', 'MZN'),
    ]);
    currencyRepo.find.mockResolvedValue([currency]);
    countryPriceRepo.findOne.mockResolvedValue(null);

    await seeder.seed();

    expect(countryPriceRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ price: 0 }),
      expect.anything(),
    );
  });

  it('should skip countries without provider currency mapping', async () => {
    const country = makeCountry('KEN', 'Kenya');

    countryRepo.find.mockResolvedValue([country]);
    providerCacheService.getProviders.mockResolvedValue([
      makeProvider('GHA', 'GHS'), // different country
    ]);
    currencyRepo.find.mockResolvedValue([makeCurrency('GHS')]);

    await seeder.seed();

    expect(countryPriceRepo.findOne).not.toHaveBeenCalled();
    expect(countryPriceRepo.upsert).not.toHaveBeenCalled();
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining('no currency mapping'),
    );
  });

  it('should skip when no countries exist', async () => {
    countryRepo.find.mockResolvedValue([]);

    await seeder.seed();

    expect(providerCacheService.getProviders).not.toHaveBeenCalled();
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining('No countries found'),
    );
  });

  it('should skip when no providers available', async () => {
    countryRepo.find.mockResolvedValue([makeCountry('KEN', 'Kenya')]);
    providerCacheService.getProviders.mockResolvedValue([]);

    await seeder.seed();

    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining('No providers available'),
    );
  });

  it('should handle database errors gracefully', async () => {
    countryRepo.find.mockRejectedValue(new Error('DB connection failed'));

    await seeder.seed();

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Country price seeding failed',
      expect.any(Error),
    );
  });

  it('should seed multiple countries in one run', async () => {
    const countries = [
      makeCountry('KEN', 'Kenya'),
      makeCountry('GHA', 'Ghana'),
      makeCountry('ZMB', 'Zambia'),
    ];
    const currencies = [
      makeCurrency('KES'),
      makeCurrency('GHS'),
      makeCurrency('ZMW'),
    ];
    const providers = [
      makeProvider('KEN', 'KES'),
      makeProvider('GHA', 'GHS'),
      makeProvider('ZMB', 'ZMW'),
    ];

    countryRepo.find.mockResolvedValue(countries);
    providerCacheService.getProviders.mockResolvedValue(providers);
    currencyRepo.find.mockResolvedValue(currencies);
    countryPriceRepo.findOne.mockResolvedValue(null);

    await seeder.seed();

    expect(countryPriceRepo.upsert).toHaveBeenCalledTimes(3);
    expect(countryPriceRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ price: 300 }),
      expect.anything(),
    );
    expect(countryPriceRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ price: 30 }),
      expect.anything(),
    );
    expect(countryPriceRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ price: 50 }),
      expect.anything(),
    );
  });
});
