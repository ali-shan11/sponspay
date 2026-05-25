import { Test, TestingModule } from '@nestjs/testing';
import { PaymentCountryService } from './payment-country.service';
import { PawapayService } from './pawapay.service';
import { ProviderCacheService } from './provider-cache.service';
import { RedisService } from '../redis/redis.service';
import { CountryPriceService } from '../transaction/services/country-price.service';
import { Currency } from '../transaction/entities/currency.entity';
import { Provider } from './interfaces/provider.interface';
import { CountryAvailability } from './interfaces/availability.interface';

describe('PaymentCountryService', () => {
  let service: PaymentCountryService;
  let pawapayService: jest.Mocked<PawapayService>;
  let providerCacheService: jest.Mocked<ProviderCacheService>;
  let countryPriceService: jest.Mocked<CountryPriceService>;
  let redisClient: {
    get: jest.Mock;
    setex: jest.Mock;
    del: jest.Mock;
  };

  const mockProviders: Provider[] = [
    {
      name: 'MTN_MOMO_ZMB',
      country: 'Zambia',
      countryCode: 'ZMB',
      currency: 'ZMW',
      supportsDecimals: true,
      minDepositLimit: 10,
      maxDepositLimit: 5000,
    },
    {
      name: 'AIRTEL_MONEY_ZMB',
      country: 'Zambia',
      countryCode: 'ZMB',
      currency: 'ZMW',
      supportsDecimals: true,
      minDepositLimit: 50,
      maxDepositLimit: 10000,
    },
    {
      name: 'MTN_MOMO_GHA',
      country: 'Ghana',
      countryCode: 'GHA',
      currency: 'GHS',
      supportsDecimals: true,
      minDepositLimit: 5,
      maxDepositLimit: 2000,
    },
    {
      name: 'SAFARICOM_KEN',
      country: 'Kenya',
      countryCode: 'KEN',
      currency: 'KES',
      supportsDecimals: false,
      minDepositLimit: 100,
      maxDepositLimit: 150000,
    },
  ];

  const mockAvailability: CountryAvailability[] = [
    {
      country: 'ZMB',
      providers: [
        {
          provider: 'MTN_MOMO_ZMB',
          operationTypes: {
            DEPOSIT: 'OPERATIONAL',
            PAYOUT: 'OPERATIONAL',
          },
        },
        {
          provider: 'AIRTEL_MONEY_ZMB',
          operationTypes: {
            DEPOSIT: 'DELAYED',
            PAYOUT: 'OPERATIONAL',
          },
        },
      ],
    },
    {
      country: 'GHA',
      providers: [
        {
          provider: 'MTN_MOMO_GHA',
          operationTypes: {
            DEPOSIT: 'CLOSED',
            PAYOUT: 'OPERATIONAL',
          },
        },
      ],
    },
    {
      country: 'KEN',
      providers: [
        {
          provider: 'SAFARICOM_KEN',
          operationTypes: {
            DEPOSIT: 'OPERATIONAL',
            PAYOUT: 'OPERATIONAL',
          },
        },
      ],
    },
  ];

  // Country prices map: "countryCode:currencyCode" -> price
  const mockCountryPrices = new Map<string, number>([
    ['ZMB:ZMW', 50],
    ['GHA:GHS', 10],
    // KEN:KES not included to simulate no price configured
  ]);

  beforeEach(async () => {
    redisClient = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentCountryService,
        {
          provide: PawapayService,
          useValue: {
            fetchAvailability: jest.fn().mockResolvedValue(mockAvailability),
          },
        },
        {
          provide: ProviderCacheService,
          useValue: {
            getProviders: jest.fn().mockResolvedValue(mockProviders),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getPubClient: jest.fn().mockReturnValue(redisClient),
          },
        },
        {
          provide: CountryPriceService,
          useValue: {
            getAllPricesAsMap: jest.fn().mockResolvedValue(mockCountryPrices),
            getPrice: jest
              .fn()
              .mockImplementation((countryCode, currencyCode) => {
                const key = `${countryCode}:${currencyCode}`;
                return Promise.resolve(mockCountryPrices.get(key) ?? null);
              }),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentCountryService>(PaymentCountryService);
    pawapayService = module.get(PawapayService);
    providerCacheService = module.get(ProviderCacheService);
    countryPriceService = module.get(CountryPriceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPaymentCountries', () => {
    it('returns cached data when cache hit', async () => {
      const cachedData = [
        {
          countryCode: 'ZMB',
          countryName: 'Zambia',
          currency: 'ZMW',
          price: 50,
          operators: [
            {
              name: 'MTN_MOMO_ZMB',
              displayName: 'MTN MOMO ZMB',
              status: 'OPERATIONAL',
            },
          ],
        },
      ];
      redisClient.get.mockResolvedValueOnce(JSON.stringify(cachedData));

      const result = await service.getPaymentCountries();

      expect(result).toEqual(cachedData);
      expect(providerCacheService.getProviders).not.toHaveBeenCalled();
      expect(pawapayService.fetchAvailability).not.toHaveBeenCalled();
    });

    it('fetches and caches data on cache miss', async () => {
      const result = await service.getPaymentCountries();

      expect(providerCacheService.getProviders).toHaveBeenCalled();
      expect(pawapayService.fetchAvailability).toHaveBeenCalled();
      expect(countryPriceService.getAllPricesAsMap).toHaveBeenCalled();
      expect(redisClient.setex).toHaveBeenCalledWith(
        'pawapay:payment-countries',
        300,
        expect.any(String),
      );
      expect(result.length).toBeGreaterThan(0);
    });

    it('filters out countries with no configured price', async () => {
      const result = await service.getPaymentCountries();

      // Kenya (KEN) should be filtered out because no price configured in country_prices
      const kenyaCountry = result.find((c) => c.countryCode === 'KEN');
      expect(kenyaCountry).toBeUndefined();
    });

    it('filters out operators with CLOSED deposit status', async () => {
      const result = await service.getPaymentCountries();

      // Ghana should be filtered out because MTN_MOMO_GHA has CLOSED deposit status
      // and it's the only operator in Ghana
      const ghanaCountry = result.find((c) => c.countryCode === 'GHA');
      expect(ghanaCountry).toBeUndefined();
    });

    it('includes operators with OPERATIONAL status', async () => {
      const result = await service.getPaymentCountries();

      const zambiaCountry = result.find((c) => c.countryCode === 'ZMB');
      expect(zambiaCountry).toBeDefined();

      const mtnOperator = zambiaCountry?.operators.find(
        (o) => o.name === 'MTN_MOMO_ZMB',
      );
      expect(mtnOperator).toBeDefined();
      expect(mtnOperator?.status).toBe('OPERATIONAL');
    });

    it('includes operators with DELAYED status', async () => {
      const result = await service.getPaymentCountries();

      const zambiaCountry = result.find((c) => c.countryCode === 'ZMB');
      expect(zambiaCountry).toBeDefined();

      const airtelOperator = zambiaCountry?.operators.find(
        (o) => o.name === 'AIRTEL_MONEY_ZMB',
      );
      expect(airtelOperator).toBeDefined();
      expect(airtelOperator?.status).toBe('DELAYED');
    });

    it('groups operators by country correctly', async () => {
      const result = await service.getPaymentCountries();

      const zambiaCountry = result.find((c) => c.countryCode === 'ZMB');
      expect(zambiaCountry).toBeDefined();
      expect(zambiaCountry?.operators.length).toBe(2);
      expect(zambiaCountry?.currency).toBe('ZMW');
    });

    it('formats display name correctly', async () => {
      const result = await service.getPaymentCountries();

      const zambiaCountry = result.find((c) => c.countryCode === 'ZMB');
      const mtnOperator = zambiaCountry?.operators.find(
        (o) => o.name === 'MTN_MOMO_ZMB',
      );
      expect(mtnOperator?.displayName).toBe('MTN MOMO ZMB');
    });

    it('sorts countries by name', async () => {
      const result = await service.getPaymentCountries();

      // With current mock data, only Zambia should be included
      // (Ghana filtered by CLOSED, Kenya filtered by null price)
      expect(result.length).toBe(1);
      expect(result[0].countryName).toBe('Zambia');
    });

    it('returns empty array when no providers exist', async () => {
      (providerCacheService.getProviders as jest.Mock).mockResolvedValueOnce(
        [],
      );

      const result = await service.getPaymentCountries();

      expect(result).toEqual([]);
    });

    it('returns empty array on PawaPay API error (graceful degradation)', async () => {
      (pawapayService.fetchAvailability as jest.Mock).mockRejectedValueOnce(
        new Error('API Error'),
      );

      const result = await service.getPaymentCountries();

      // Should return empty because all operators will be skipped due to missing availability
      expect(result).toEqual([]);
    });

    it('handles missing availability data for a provider', async () => {
      // Add a provider that is not in the availability response
      const providersWithExtra: Provider[] = [
        ...mockProviders,
        {
          name: 'NEW_PROVIDER_TZA',
          country: 'Tanzania',
          countryCode: 'TZA',
          currency: 'TZS',
          supportsDecimals: true,
          minDepositLimit: 500,
          maxDepositLimit: 50000,
        },
      ];
      (providerCacheService.getProviders as jest.Mock).mockResolvedValueOnce(
        providersWithExtra,
      );

      // Add TZA:TZS to country prices
      const pricesWithTza = new Map(mockCountryPrices);
      pricesWithTza.set('TZA:TZS', 1000);
      (
        countryPriceService.getAllPricesAsMap as jest.Mock
      ).mockResolvedValueOnce(pricesWithTza);

      const result = await service.getPaymentCountries();

      // Tanzania should be filtered out because NEW_PROVIDER_TZA has no availability data
      const tanzaniaCountry = result.find((c) => c.countryCode === 'TZA');
      expect(tanzaniaCountry).toBeUndefined();
    });

    it('calculates price as max of currency price and provider minimum (currency price higher)', async () => {
      const result = await service.getPaymentCountries();

      const zambiaCountry = result.find((c) => c.countryCode === 'ZMB');
      const mtnOperator = zambiaCountry?.operators.find(
        (o) => o.name === 'MTN_MOMO_ZMB',
      );

      // Currency price is 50, provider min is 10 -> effective min should be 50
      expect(mtnOperator?.price).toBe(50);
    });

    it('calculates price as max of currency price and provider minimum (provider minimum higher)', async () => {
      const result = await service.getPaymentCountries();

      const zambiaCountry = result.find((c) => c.countryCode === 'ZMB');
      const airtelOperator = zambiaCountry?.operators.find(
        (o) => o.name === 'AIRTEL_MONEY_ZMB',
      );

      // Currency price is 50, provider min is 50 -> effective min should be 50
      expect(airtelOperator?.price).toBe(50);
    });

    it('rounds up price when country price is higher', async () => {
      // Test with a decimal price
      const customPrices = new Map<string, number>([['ZMB:ZMW', 45.7]]);
      (
        countryPriceService.getAllPricesAsMap as jest.Mock
      ).mockResolvedValueOnce(customPrices);

      const result = await service.getPaymentCountries();

      const zambiaCountry = result.find((c) => c.countryCode === 'ZMB');
      const mtnOperator = zambiaCountry?.operators.find(
        (o) => o.name === 'MTN_MOMO_ZMB',
      );

      // Country price is 45.7, provider min is 10 -> should round up to 46
      expect(mtnOperator?.price).toBe(46);
    });

    it('calculates maxMultiple correctly (capped at 100)', async () => {
      const result = await service.getPaymentCountries();

      const zambiaCountry = result.find((c) => c.countryCode === 'ZMB');
      const mtnOperator = zambiaCountry?.operators.find(
        (o) => o.name === 'MTN_MOMO_ZMB',
      );

      // maxPrice=5000, price=50 -> floor(5000/50) = 100, capped at 100
      expect(mtnOperator?.maxMultiple).toBe(100);
    });

    it('calculates maxMultiple correctly (below cap)', async () => {
      const result = await service.getPaymentCountries();

      const zambiaCountry = result.find((c) => c.countryCode === 'ZMB');
      const airtelOperator = zambiaCountry?.operators.find(
        (o) => o.name === 'AIRTEL_MONEY_ZMB',
      );

      // maxPrice=10000, price=50 -> floor(10000/50) = 200, capped at 100
      expect(airtelOperator?.maxMultiple).toBe(100);
    });
  });

  describe('clearCache', () => {
    it('clears the cache', async () => {
      await service.clearCache();

      expect(redisClient.del).toHaveBeenCalledWith('pawapay:payment-countries');
    });
  });

  describe('validatePaymentOperator', () => {
    const mockCurrency: Partial<Currency> = {
      id: '1',
      shortCode: 'ZMW',
      name: 'Zambian Kwacha',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('Operator Not Found', () => {
      it('should return error when operator does not exist', async () => {
        (providerCacheService.getProviders as jest.Mock).mockResolvedValueOnce(
          [],
        );

        const result = await service.validatePaymentOperator(
          'NON_EXISTENT_OPERATOR',
          mockCurrency as Currency,
          100,
          'ZMB',
        );

        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('OPERATOR_NOT_FOUND');
        expect(result.error?.message).toContain('NON_EXISTENT_OPERATOR');
      });
    });

    describe('Currency Mismatch', () => {
      it('should return error when operator currency differs from requested currency', async () => {
        const kesProvider = {
          ...mockProviders[3], // SAFARICOM_KEN
          name: 'MTN_MOMO_ZMB',
          currency: 'KES',
        };
        (providerCacheService.getProviders as jest.Mock).mockResolvedValueOnce([
          kesProvider,
        ]);

        const result = await service.validatePaymentOperator(
          'MTN_MOMO_ZMB',
          mockCurrency as Currency,
          100,
          'ZMB',
        );

        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('CURRENCY_MISMATCH');
        expect(result.error?.details?.providerCurrency).toBe('KES');
        expect(result.error?.details?.requestedCurrency).toBe('ZMW');
      });
    });

    describe('Availability Status', () => {
      it('should return error when operator status is CLOSED', async () => {
        const ghanaAvailability: CountryAvailability[] = [
          {
            country: 'GHA',
            providers: [
              {
                provider: 'MTN_MOMO_GHA',
                operationTypes: {
                  DEPOSIT: 'CLOSED',
                },
              },
            ],
          },
        ];
        (pawapayService.fetchAvailability as jest.Mock).mockResolvedValueOnce(
          ghanaAvailability,
        );

        const ghanaCurrency: Partial<Currency> = {
          ...mockCurrency,
          shortCode: 'GHS',
        };

        const result = await service.validatePaymentOperator(
          'MTN_MOMO_GHA',
          ghanaCurrency as Currency,
          50,
          'GHA',
        );

        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('OPERATOR_UNAVAILABLE');
        expect(result.error?.details?.status).toBe('CLOSED');
      });

      it('should allow OPERATIONAL operators', async () => {
        const result = await service.validatePaymentOperator(
          'MTN_MOMO_ZMB',
          mockCurrency as Currency,
          100,
          'ZMB',
        );

        expect(result.isValid).toBe(true);
        expect(result.operator?.status).toBe('OPERATIONAL');
      });

      it('should allow DELAYED operators', async () => {
        const result = await service.validatePaymentOperator(
          'AIRTEL_MONEY_ZMB',
          mockCurrency as Currency,
          100,
          'ZMB',
        );

        expect(result.isValid).toBe(true);
        expect(result.operator?.status).toBe('DELAYED');
      });

      it('should return error when availability status is unknown', async () => {
        (pawapayService.fetchAvailability as jest.Mock).mockResolvedValueOnce([
          {
            country: 'ZMB',
            providers: [], // No providers = unknown availability
          },
        ]);

        const result = await service.validatePaymentOperator(
          'MTN_MOMO_ZMB',
          mockCurrency as Currency,
          100,
          'ZMB',
        );

        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('AVAILABILITY_UNKNOWN');
      });
    });

    describe('Country Price Not Configured', () => {
      it('should return error when country price is null', async () => {
        // Mock countryPriceService to return null for this specific call
        (countryPriceService.getPrice as jest.Mock).mockResolvedValueOnce(null);

        const result = await service.validatePaymentOperator(
          'MTN_MOMO_ZMB',
          mockCurrency as Currency,
          100,
          'ZMB',
        );

        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('PRICE_NOT_CONFIGURED');
        expect(result.error?.message).toContain('ZMW');
      });

      it('should return error when no country price exists', async () => {
        // Mock countryPriceService to return null
        (countryPriceService.getPrice as jest.Mock).mockResolvedValueOnce(null);

        const result = await service.validatePaymentOperator(
          'MTN_MOMO_ZMB',
          mockCurrency as Currency,
          100,
          'ZMB',
        );

        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('PRICE_NOT_CONFIGURED');
      });
    });

    describe('Amount Limits', () => {
      it('should return error when amount is below minimum price', async () => {
        // countryPrice = 50, provider.minDepositLimit = 10
        // price = 50, amount = 30 → BELOW_MINIMUM
        const result = await service.validatePaymentOperator(
          'MTN_MOMO_ZMB',
          mockCurrency as Currency,
          30,
          'ZMB',
        );

        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('AMOUNT_BELOW_MINIMUM');
        expect(result.error?.details?.price).toBe(50);
        expect(result.error?.details?.requestedAmount).toBe(30);
      });

      it('should return error when amount is above maximum price', async () => {
        // provider.maxDepositLimit = 5000, amount = 6000 → ABOVE_MAXIMUM
        const result = await service.validatePaymentOperator(
          'MTN_MOMO_ZMB',
          mockCurrency as Currency,
          6000,
          'ZMB',
        );

        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('AMOUNT_ABOVE_MAXIMUM');
        expect(result.error?.details?.requestedAmount).toBe(6000);
      });

      it('should accept amount within limits', async () => {
        const result = await service.validatePaymentOperator(
          'MTN_MOMO_ZMB',
          mockCurrency as Currency,
          250,
          'ZMB',
        );

        expect(result.isValid).toBe(true);
        expect(result.operator?.price).toBe(50);
      });

      it('should use countryPrice as minimum when higher than provider minimum', async () => {
        // countryPrice = 50, provider.minDepositLimit = 10
        // price should be 50
        const result = await service.validatePaymentOperator(
          'MTN_MOMO_ZMB',
          mockCurrency as Currency,
          100,
          'ZMB',
        );

        expect(result.isValid).toBe(true);
        expect(result.operator?.price).toBe(50);
      });

      it('should use provider.minDepositLimit as minimum when higher than countryPrice', async () => {
        // Use SAFARICOM_KEN which has minDepositLimit = 100
        // Mock KEN:KES price = 50 (lower than provider min)
        (countryPriceService.getPrice as jest.Mock).mockResolvedValueOnce(50);

        const kesCurrency: Partial<Currency> = {
          ...mockCurrency,
          shortCode: 'KES',
        };

        const result = await service.validatePaymentOperator(
          'SAFARICOM_KEN',
          kesCurrency as Currency,
          150,
          'KEN',
        );

        expect(result.isValid).toBe(true);
        expect(result.operator?.price).toBe(100); // Provider min is higher
      });
    });

    describe('Price Multiple Validation', () => {
      it('should return error when multiple exceeds calculated maxMultiple', async () => {
        // Use provider with lower max to test maxMultiple enforcement
        // SAFARICOM_KEN: minLimit=100, maxLimit=150000, countryPrice=50
        // effectiveMin = 100, effectiveMax = 150000
        // maxMultiple = floor(150000/100) = 1500, capped at 100
        // amount = 15000 → actualMultiple = 300 → EXCEEDS_LIMIT
        // Mock KEN:KES price = 50
        (countryPriceService.getPrice as jest.Mock).mockResolvedValueOnce(50);

        const kesCurrency: Partial<Currency> = {
          ...mockCurrency,
          shortCode: 'KES',
        };

        const result = await service.validatePaymentOperator(
          'SAFARICOM_KEN',
          kesCurrency as Currency,
          15000, // 300x the country price
          'KEN',
        );

        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('MULTIPLE_EXCEEDS_LIMIT');
        expect(result.error?.details?.maxMultiple).toBe(100);
      });

      it('should accept multiple within calculated maxMultiple', async () => {
        // countryPrice = 50, amount = 250 → actualMultiple = 5
        // price = 50, maxPrice = 5000 → maxMultiple = 100
        // 5 <= 100 → valid
        const result = await service.validatePaymentOperator(
          'MTN_MOMO_ZMB',
          mockCurrency as Currency,
          250,
          'ZMB',
        );

        expect(result.isValid).toBe(true);
        expect(result.operator?.maxMultiple).toBe(100);
      });

      it('should cap maxMultiple at 100 even if calculation exceeds', async () => {
        // SAFARICOM_KEN: price = 100, maxPrice = 150000
        // floor(150000/100) = 1500, but should cap at 100
        // Mock KEN:KES price = 50
        (countryPriceService.getPrice as jest.Mock).mockResolvedValueOnce(50);

        const kesCurrency: Partial<Currency> = {
          ...mockCurrency,
          shortCode: 'KES',
        };

        const result = await service.validatePaymentOperator(
          'SAFARICOM_KEN',
          kesCurrency as Currency,
          1000,
          'KEN',
        );

        expect(result.isValid).toBe(true);
        expect(result.operator?.maxMultiple).toBe(100);
      });
    });

    describe('Success Cases', () => {
      it('should return valid operator data on successful validation', async () => {
        const result = await service.validatePaymentOperator(
          'MTN_MOMO_ZMB',
          mockCurrency as Currency,
          250,
          'ZMB',
        );

        expect(result.isValid).toBe(true);
        expect(result.operator).toBeDefined();
        expect(result.operator?.name).toBe('MTN_MOMO_ZMB');
        expect(result.operator?.displayName).toBe('MTN MOMO ZMB');
        expect(result.operator?.status).toBe('OPERATIONAL');
        expect(result.operator?.price).toBe(50);
        expect(result.operator?.maxMultiple).toBe(100);
        expect(result.error).toBeUndefined();
      });
    });

    describe('Error Handling', () => {
      it('should handle PawaPay API errors gracefully', async () => {
        (pawapayService.fetchAvailability as jest.Mock).mockRejectedValueOnce(
          new Error('PawaPay API error'),
        );

        const result = await service.validatePaymentOperator(
          'MTN_MOMO_ZMB',
          mockCurrency as Currency,
          100,
          'ZMB',
        );

        // buildAvailabilityMap returns empty map on error
        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('AVAILABILITY_UNKNOWN');
      });

      it('should handle unexpected errors gracefully', async () => {
        (providerCacheService.getProviders as jest.Mock).mockRejectedValueOnce(
          new Error('Unexpected error'),
        );

        const result = await service.validatePaymentOperator(
          'MTN_MOMO_ZMB',
          mockCurrency as Currency,
          100,
          'ZMB',
        );

        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('VALIDATION_ERROR');
      });
    });
  });
});
