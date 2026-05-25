import { Test, TestingModule } from '@nestjs/testing';
import { CreatorInsightsService } from './creator-insights.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Transaction } from '../transaction/entities/transaction.entity';
import { UserChannel } from '../creator/entities/user-channel.entity';
import { TelegramChannel } from '../creator/entities/telegram-channel.entity';
import { LinkClick } from '../link-click/entities/link-click.entity';
import { Account } from '../accounts/entities/account.entity';
import { Payout } from '../transaction/entities/payout.entity';
import { Country } from '../transaction/entities/country.entity';
import { TelegramService } from '../telegram/telegram.service';
import { ExchangeRateService } from '../transaction/services/exchange-rate.service';
import { User } from '../creator/entities/user.entity';
import { UserRole } from '../creator/enums/user.enum';

type Qb = {
  innerJoin: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  groupBy: jest.Mock;
  addGroupBy: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  limit: jest.Mock;
  getRawMany: jest.Mock;
};

function makeQb(
  rows: Array<{
    countryCode: string;
    currencyCode: string;
    iso4217Numeric: number | null;
    localAmountTotal: string;
  }>,
): Qb {
  const qb: Qb = {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
  return qb;
}

describe('CreatorInsightsService.getTopEarningCountries (unit)', () => {
  let service: CreatorInsightsService;
  let txRepo: { createQueryBuilder: jest.Mock };
  let mockExchangeRateService: { convertCurrency: jest.Mock };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-30T12:34:56.000Z').getTime());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    txRepo = {
      createQueryBuilder: jest.fn(),
    };

    mockExchangeRateService = {
      convertCurrency: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorInsightsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: txRepo,
        },
        {
          provide: getRepositoryToken(UserChannel),
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 'uc1' }) },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue({ role: UserRole.Creator }),
          },
        },
        {
          provide: getRepositoryToken(TelegramChannel),
          useValue: {},
        },
        {
          provide: getRepositoryToken(LinkClick),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Account),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Payout),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Country),
          useValue: {},
        },
        {
          provide: TelegramService,
          useValue: {},
        },
        {
          provide: ExchangeRateService,
          useValue: mockExchangeRateService,
        },
      ],
    }).compile();

    service = module.get(CreatorInsightsService);
  });

  it('converts local amounts to USD using exchange rates, sorts by usdTotal, respects limit', async () => {
    const rows = [
      {
        countryCode: 'KEN',
        currencyCode: 'KES',
        iso4217Numeric: 404,
        localAmountTotal: '11800.00',
      },
      {
        countryCode: 'TZA',
        currencyCode: 'TZS',
        iso4217Numeric: 834,
        localAmountTotal: '62000.00',
      },
      {
        countryCode: 'ZAF',
        currencyCode: 'ZAR',
        iso4217Numeric: 710,
        localAmountTotal: '289.29',
      },
      {
        countryCode: 'UGA',
        currencyCode: 'UGX',
        iso4217Numeric: 800,
        localAmountTotal: '17000.00',
      },
    ];

    // KES: 11800 * 0.0077 = 90.86
    // TZS: 62000 * 0.00038 = 23.56
    // ZAR: 289.29 * 0.056 = 16.20
    // UGX: 17000 * 0.00027 = 4.59
    mockExchangeRateService.convertCurrency.mockImplementation(
      (from: string) => {
        const rates: Record<string, number> = {
          KES: 0.0077,
          TZS: 0.00038,
          ZAR: 0.056,
          UGX: 0.00027,
        };
        return Promise.resolve({ conversion_rate: rates[from] ?? 1 });
      },
    );

    const qb = makeQb(rows);
    txRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getTopEarningCountries(
      'uid',
      'test-channel-uuid',
      30,
      0,
      3,
    );

    // Header fields
    expect(result.days).toBe(30);
    expect(result.timezoneOffsetMinutes).toBe(0);
    expect(typeof result.startDate).toBe('string');
    expect(typeof result.endDate).toBe('string');
    expect(result.limit).toBe(3);
    expect(result.exchangeRatesApplied).toBe(true);

    // Limited to 3 items
    expect(result.items).toHaveLength(3);

    // Sorted by usdTotal desc: KEN (90.86), TZA (23.56), ZAF (16.20)
    expect(result.items[0].countryCode).toBe('KEN');
    expect(result.items[0].usdTotal).toBe(90.86);
    expect(result.items[1].countryCode).toBe('TZA');
    expect(result.items[1].usdTotal).toBe(23.56);
    expect(result.items[2].countryCode).toBe('ZAF');
    expect(result.items[2].usdTotal).toBe(16.2);

    // Structure and rounding
    for (const item of result.items) {
      expect(item.countryCode).toMatch(/^[A-Z]{3}$/);
      expect(item.currency).toBeDefined();
      expect(typeof item.currency.code).toBe('string');
      expect(item.localAmountTotal).toBe(
        Number(item.localAmountTotal.toFixed(2)),
      );
      expect(item.usdTotal).toBe(Number(item.usdTotal.toFixed(2)));
    }

    // totalUsd equals sum of items
    const sum = Number(
      result.items.reduce((a, x) => a + x.usdTotal, 0).toFixed(2),
    );
    expect(result.totalUsd).toBe(sum);

    // Exchange rate called once per unique currency (4 currencies)
    expect(mockExchangeRateService.convertCurrency).toHaveBeenCalledTimes(4);
  });

  it('handles partial exchange rate failure gracefully', async () => {
    const rows = [
      {
        countryCode: 'KEN',
        currencyCode: 'KES',
        iso4217Numeric: 404,
        localAmountTotal: '5000.00',
      },
      {
        countryCode: 'TZA',
        currencyCode: 'TZS',
        iso4217Numeric: 834,
        localAmountTotal: '30000.00',
      },
    ];

    mockExchangeRateService.convertCurrency.mockImplementation(
      (from: string) => {
        if (from === 'KES') {
          return Promise.resolve({ conversion_rate: 0.0077 });
        }
        return Promise.reject(new Error('API quota reached'));
      },
    );

    const qb = makeQb(rows);
    txRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getTopEarningCountries(
      'uid',
      'test-channel-uuid',
      30,
      0,
      5,
    );

    expect(result.exchangeRatesApplied).toBe(false);

    // KEN has USD conversion, TZA falls back to 0
    const ken = result.items.find((i) => i.countryCode === 'KEN');
    const tza = result.items.find((i) => i.countryCode === 'TZA');
    expect(ken!.usdTotal).toBe(38.5); // 5000 * 0.0077
    expect(tza!.usdTotal).toBe(0);

    // KEN sorted first (has USD value)
    expect(result.items[0].countryCode).toBe('KEN');
  });

  it('deduplicates exchange rate calls for same currency', async () => {
    // Two countries using the same currency shouldn't cause duplicate API calls
    const rows = [
      {
        countryCode: 'KEN',
        currencyCode: 'KES',
        iso4217Numeric: 404,
        localAmountTotal: '5000.00',
      },
      {
        countryCode: 'UGA',
        currencyCode: 'KES',
        iso4217Numeric: 404,
        localAmountTotal: '3000.00',
      },
    ];

    mockExchangeRateService.convertCurrency.mockResolvedValue({
      conversion_rate: 0.0077,
    });

    const qb = makeQb(rows);
    txRepo.createQueryBuilder.mockReturnValue(qb);

    await service.getTopEarningCountries('uid', 'test-channel-uuid');

    // Only one call for KES
    expect(mockExchangeRateService.convertCurrency).toHaveBeenCalledTimes(1);
    expect(mockExchangeRateService.convertCurrency).toHaveBeenCalledWith(
      'KES',
      'USD',
    );
  });
});
