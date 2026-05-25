import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ProviderCacheService } from './provider-cache.service';
import { PawapayService } from './pawapay.service';
import { RedisService } from '../redis/redis.service';
import {
  Provider,
  ActiveConfigurationResponse,
} from './interfaces/provider.interface';

describe('ProviderCacheService', () => {
  let service: ProviderCacheService;
  let pawapayService: jest.Mocked<PawapayService>;
  let mockRedisClient: any;

  const mockProviders: Provider[] = [
    {
      name: 'MTN_MOMO_UGA',
      country: 'Uganda',
      countryCode: 'UGA',
      currency: 'UGX',
      supportsDecimals: false,
      minDepositLimit: 100,
      maxDepositLimit: 5000000,
    },
    {
      name: 'MPESA_KEN',
      country: 'Kenya',
      countryCode: 'KEN',
      currency: 'KES',
      supportsDecimals: false,
      minDepositLimit: 10,
      maxDepositLimit: 150000,
    },
  ];

  const mockActiveConfig: ActiveConfigurationResponse = {
    companyName: 'Test Merchant Inc',
    countries: [
      {
        country: 'UGA',
        providers: [
          {
            provider: 'MTN_MOMO_UGA',
            currencies: [
              {
                currency: 'UGX',
                operationTypes: {
                  DEPOSIT: {
                    minAmount: '100',
                    maxAmount: '5000000',
                  },
                },
              },
            ],
          },
        ],
      },
      {
        country: 'KEN',
        providers: [
          {
            provider: 'MPESA_KEN',
            currencies: [
              {
                currency: 'KES',
                operationTypes: {
                  DEPOSIT: {
                    minAmount: '10',
                    maxAmount: '150000',
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    // Create mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderCacheService,
        {
          provide: PawapayService,
          useValue: {
            fetchActiveConfiguration: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getPubClient: jest.fn().mockReturnValue(mockRedisClient),
          },
        },
      ],
    }).compile();

    service = module.get<ProviderCacheService>(ProviderCacheService);
    pawapayService = module.get(PawapayService);

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProviders', () => {
    it('should return cached providers without calling API (cache hit)', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockProviders));

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result).toEqual(mockProviders);
      expect(mockRedisClient.get).toHaveBeenCalledWith('pawapay:providers');
      expect(pawapayService.fetchActiveConfiguration).not.toHaveBeenCalled();
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should fetch from API and cache result when cache is empty (cache miss)', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(
        mockActiveConfig,
      );

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result).toEqual(mockProviders);
      expect(mockRedisClient.get).toHaveBeenCalledWith('pawapay:providers');
      expect(pawapayService.fetchActiveConfiguration).toHaveBeenCalled();
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'pawapay:providers',
        3600,
        JSON.stringify(mockProviders),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Cached 2 providers in Redis with 3600s TTL',
      );
    });

    it('should NOT cache when API returns empty provider list', async () => {
      // Arrange
      const emptyConfig: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [],
      };
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(emptyConfig);

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result).toEqual([]);
      expect(mockRedisClient.get).toHaveBeenCalledWith('pawapay:providers');
      expect(pawapayService.fetchActiveConfiguration).toHaveBeenCalled();
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Skipping cache: PawaPay API returned empty provider list',
      );
    });

    it('should fetch from API again on subsequent call after empty result (no stale cache)', async () => {
      // Arrange
      const emptyConfig: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [],
      };
      mockRedisClient.get.mockResolvedValue(null);

      // First call returns empty
      pawapayService.fetchActiveConfiguration.mockResolvedValueOnce(
        emptyConfig,
      );

      // Act - First call
      const firstResult = await service.getProviders();

      // Assert first call
      expect(firstResult).toEqual([]);
      expect(mockRedisClient.setex).not.toHaveBeenCalled();

      // Arrange - Second call now has providers
      pawapayService.fetchActiveConfiguration.mockResolvedValueOnce(
        mockActiveConfig,
      );

      // Act - Second call
      const secondResult = await service.getProviders();

      // Assert second call
      expect(secondResult).toEqual(mockProviders);
      expect(pawapayService.fetchActiveConfiguration).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.setex).toHaveBeenCalledTimes(1); // Only cached the second result
    });

    it('should throw error and not cache when API call fails', async () => {
      // Arrange
      const apiError = new Error('PawaPay API is down');
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockRejectedValue(apiError);

      // Act & Assert
      await expect(service.getProviders()).rejects.toThrow(
        'PawaPay API is down',
      );
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to fetch providers from PawaPay API',
        apiError,
      );
    });

    it('should normalize country codes to uppercase', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(
        mockActiveConfig,
      );

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result[0].countryCode).toBe('UGA');
      expect(result[1].countryCode).toBe('KEN');
    });

    it('should always set supportsDecimals to false', async () => {
      // Arrange
      const configWithSingleCountry: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [
          {
            country: 'ZMB', // Zambia
            providers: [
              {
                provider: 'MTN_MOMO_ZMB',
                currencies: [
                  {
                    currency: 'ZMW',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: '1',
                        maxAmount: '10000',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(
        configWithSingleCountry,
      );

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result[0].supportsDecimals).toBe(false);
      expect(result[0].country).toBe('Zambia'); // Verify country name resolution
    });

    it('should return empty array when API response has no countries array', async () => {
      // Arrange
      const invalidConfig = {} as ActiveConfigurationResponse;
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(invalidConfig);

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result).toEqual([]);
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Invalid response format from PawaPay active configuration: missing or invalid countries array',
      );
    });

    it('should extract minDepositLimit and maxDepositLimit from DEPOSIT operation type', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(
        mockActiveConfig,
      );

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result[0].minDepositLimit).toBe(100);
      expect(result[0].maxDepositLimit).toBe(5000000);
      expect(result[1].minDepositLimit).toBe(10);
      expect(result[1].maxDepositLimit).toBe(150000);
    });

    it('should skip provider when DEPOSIT operation type is missing', async () => {
      // Arrange
      const configNoDEPOSIT: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [
          {
            country: 'UGA',
            providers: [
              {
                provider: 'MTN_MOMO_UGA',
                currencies: [
                  {
                    currency: 'UGX',
                    operationTypes: {
                      PAYOUT: {
                        minAmount: '100',
                        maxAmount: '5000000',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(
        configNoDEPOSIT,
      );

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result).toEqual([]);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Skipping provider MTN_MOMO_UGA with currency UGX in UGA: no DEPOSIT operation type found',
      );
    });

    it('should skip provider when transaction limits are invalid', async () => {
      // Arrange
      const configInvalidLimits: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [
          {
            country: 'UGA',
            providers: [
              {
                provider: 'MTN_MOMO_UGA',
                currencies: [
                  {
                    currency: 'UGX',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: 'invalid',
                        maxAmount: 'also-invalid',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(
        configInvalidLimits,
      );

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result).toEqual([]);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Skipping provider MTN_MOMO_UGA with currency UGX in UGA: invalid transaction limits',
      );
    });
  });

  describe('getProvidersByCountry', () => {
    it('should filter providers by country code', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockProviders));

      // Act
      const result = await service.getProvidersByCountry('UGA');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].countryCode).toBe('UGA');
    });

    it('should normalize country code to uppercase', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockProviders));

      // Act
      const result = await service.getProvidersByCountry('uga');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].countryCode).toBe('UGA');
    });

    it('should trim whitespace from country code', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockProviders));

      // Act
      const result = await service.getProvidersByCountry('  UGA  ');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].countryCode).toBe('UGA');
    });

    it('should return empty array for unknown country code', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockProviders));

      // Act
      const result = await service.getProvidersByCountry('ZZZ');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('validateProvider', () => {
    it('should return provider when name and country match', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockProviders));

      // Act
      const result = await service.validateProvider('MTN_MOMO_UGA', 'UGA');

      // Assert
      expect(result).toEqual(mockProviders[0]);
    });

    it('should normalize country code to uppercase', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockProviders));

      // Act
      const result = await service.validateProvider('MTN_MOMO_UGA', 'uga');

      // Assert
      expect(result).toEqual(mockProviders[0]);
    });

    it('should return null when provider name does not match', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockProviders));

      // Act
      const result = await service.validateProvider('INVALID_PROVIDER', 'UGA');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when country code does not match', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockProviders));

      // Act
      const result = await service.validateProvider('MTN_MOMO_UGA', 'KEN');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should delete the cache key', async () => {
      // Act
      await service.clearCache();

      // Assert
      expect(mockRedisClient.del).toHaveBeenCalledWith('pawapay:providers');
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Provider cache cleared',
      );
    });
  });

  describe('currency filtering', () => {
    it('should process single currency without filtering', async () => {
      // Arrange
      const configSingleCurrency: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [
          {
            country: 'UGA',
            providers: [
              {
                provider: 'MTN_MOMO_UGA',
                currencies: [
                  {
                    currency: 'UGX',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: '100',
                        maxAmount: '5000000',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(
        configSingleCurrency,
      );

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe('UGX');
      // Should not log anything about multiple currencies
      expect(Logger.prototype.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Multiple currencies'),
      );
    });

    it('should select default currency (CDF) for Congo when multiple currencies present', async () => {
      // Arrange
      const configCongoMultiCurrency: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [
          {
            country: 'COD', // Congo
            providers: [
              {
                provider: 'PROVIDER_X',
                currencies: [
                  {
                    currency: 'USD',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: '1',
                        maxAmount: '1000',
                      },
                    },
                  },
                  {
                    currency: 'CDF',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: '1000',
                        maxAmount: '5000000',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(
        configCongoMultiCurrency,
      );

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe('CDF'); // Should select CDF, not USD
      expect(result[0].countryCode).toBe('COD');
      expect(result[0].minDepositLimit).toBe(1000);
      expect(result[0].maxDepositLimit).toBe(5000000);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Multiple currencies for COD/PROVIDER_X: selected default CDF',
        ),
      );
    });

    it('should fallback to first currency when default currency not found in list', async () => {
      // Arrange
      const configDefaultNotInList: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [
          {
            country: 'COD', // Congo - default is CDF
            providers: [
              {
                provider: 'PROVIDER_Y',
                currencies: [
                  {
                    currency: 'USD',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: '1',
                        maxAmount: '1000',
                      },
                    },
                  },
                  {
                    currency: 'EUR',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: '1',
                        maxAmount: '1000',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(
        configDefaultNotInList,
      );

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe('USD'); // Should use first currency
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Multiple currencies for COD/PROVIDER_Y: default CDF not found, using first USD',
        ),
      );
    });

    it('should use first currency with warning when country has no default configured', async () => {
      // Arrange
      const configNoDefault: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [
          {
            country: 'UGA', // Uganda - no default configured (only COD has default)
            providers: [
              {
                provider: 'MULTI_CURRENCY_PROVIDER',
                currencies: [
                  {
                    currency: 'UGX',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: '100',
                        maxAmount: '5000000',
                      },
                    },
                  },
                  {
                    currency: 'USD',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: '1',
                        maxAmount: '1000',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(
        configNoDefault,
      );

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe('UGX'); // Should use first currency
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Multiple currencies for UGA/MULTI_CURRENCY_PROVIDER, no default configured. Using first: UGX',
        ),
      );
    });

    it('should skip provider when currencies array is empty', async () => {
      // Arrange
      const configEmptyCurrencies: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [
          {
            country: 'UGA',
            providers: [
              {
                provider: 'EMPTY_PROVIDER',
                currencies: [],
              },
            ],
          },
        ],
      };
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(
        configEmptyCurrencies,
      );

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result).toEqual([]);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Skipping provider EMPTY_PROVIDER in UGA: empty currencies array',
      );
    });

    it('should select CDF from multiple currencies regardless of order', async () => {
      // Arrange - CDF is second in the list
      const configCDFSecond: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [
          {
            country: 'COD',
            providers: [
              {
                provider: 'PROVIDER_ORDER_TEST',
                currencies: [
                  {
                    currency: 'USD',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: '1',
                        maxAmount: '1000',
                      },
                    },
                  },
                  {
                    currency: 'CDF',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: '1000',
                        maxAmount: '5000000',
                      },
                    },
                  },
                  {
                    currency: 'EUR',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: '1',
                        maxAmount: '1000',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(
        configCDFSecond,
      );

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe('CDF'); // Should find CDF even though it's in the middle
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'selected default CDF (available: USD, CDF, EUR)',
        ),
      );
    });

    it('should skip provider when selected currency is missing DEPOSIT operation', async () => {
      // Arrange
      const configNoDeposit: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [
          {
            country: 'COD',
            providers: [
              {
                provider: 'NO_DEPOSIT_PROVIDER',
                currencies: [
                  {
                    currency: 'CDF',
                    operationTypes: {
                      PAYOUT: {
                        minAmount: '1000',
                        maxAmount: '5000000',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
      mockRedisClient.get.mockResolvedValue(null);
      pawapayService.fetchActiveConfiguration.mockResolvedValue(
        configNoDeposit,
      );

      // Act
      const result = await service.getProviders();

      // Assert
      expect(result).toEqual([]);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Skipping provider NO_DEPOSIT_PROVIDER with currency CDF in COD: no DEPOSIT operation type found',
      );
    });
  });
});
