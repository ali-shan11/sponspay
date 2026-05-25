import { Test, TestingModule } from '@nestjs/testing';
import { CreatorInsightsService } from './creator-insights.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Transaction } from '../transaction/entities/transaction.entity';
import { UserChannel } from '../creator/entities/user-channel.entity';
import { User } from '../creator/entities/user.entity';
import { UserRole } from '../creator/enums/user.enum';
import { TelegramChannel } from '../creator/entities/telegram-channel.entity';
import { LinkClick } from '../link-click/entities/link-click.entity';
import { Account } from '../accounts/entities/account.entity';
import { Payout } from '../transaction/entities/payout.entity';
import { Country } from '../transaction/entities/country.entity';
import { TelegramService } from '../telegram/telegram.service';
import { ExchangeRateService } from '../transaction/services/exchange-rate.service';
import { addDays, addMinutes, formatISO, startOfDay, subDays } from 'date-fns';

type Qb = {
  innerJoin: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  groupBy: jest.Mock;
  addGroupBy: jest.Mock;
  orderBy: jest.Mock;
  setParameters: jest.Mock;
  getRawMany: jest.Mock;
  getRawOne: jest.Mock;
};

function makeQb(
  rows: Array<{ day: string; revenue: string; currencyCode: string }>,
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
    setParameters: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
    getRawOne: jest.fn(),
  };
  return qb;
}

function makePrevQb(
  rows: Array<{ revenue: string; currencyCode: string }>,
): Qb {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
    getRawOne: jest.fn(),
  };
}

describe('CreatorInsightsService', () => {
  let service: CreatorInsightsService;
  let txRepo: { createQueryBuilder: jest.Mock };
  let userRepo: { findOne: jest.Mock };
  let exchangeRateService: { convertCurrency: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers();
    // Freeze time for deterministic tests
    jest.setSystemTime(new Date('2025-08-30T12:34:56.000Z').getTime()); // Sat, Aug 30, 2025 12:34 UTC

    txRepo = {
      createQueryBuilder: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn().mockResolvedValue({ role: UserRole.Creator }),
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
          useValue: userRepo,
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
          useValue: { convertCurrency: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(CreatorInsightsService);
    exchangeRateService = module.get(ExchangeRateService);
    // Default: USD→USD at rate 1.0 (tests override for multi-currency scenarios)
    exchangeRateService.convertCurrency.mockResolvedValue({
      conversion_rate: 1.0,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  function expectedWindow(days: number, tzOffsetMinutes: number) {
    const nowUtc = new Date();
    const nowLocal = addMinutes(nowUtc, tzOffsetMinutes);
    const endLocalExclusive = startOfDay(addDays(nowLocal, 1));
    const startLocalInclusive = startOfDay(subDays(endLocalExclusive, days));
    const startDate = formatISO(startLocalInclusive, {
      representation: 'date',
    });
    const endDate = formatISO(subDays(endLocalExclusive, 1), {
      representation: 'date',
    });
    return { startLocalInclusive, endLocalExclusive, startDate, endDate };
  }

  it('returns zero-filled series when no rows (defaults: 30 days, tz=0)', async () => {
    const qb = makeQb([]);
    const prevQb = makePrevQb([]);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qb as any)
      .mockReturnValueOnce(prevQb as any);

    const result = await service.getRevenuePerDay(
      'firebase-uid',
      'test-channel-uuid',
    );

    expect(result.days).toBe(30);
    expect(result.timezoneOffsetMinutes).toBe(0);
    // series length and all zeros
    expect(result.series).toHaveLength(30);
    expect(result.series.every((p) => p.revenueUsd === 0)).toBe(true);

    const { startDate, endDate } = expectedWindow(30, 0);
    expect(result.startDate).toBe(startDate);
    expect(result.endDate).toBe(endDate);

    expect(result.totalRevenueUsd).toBe(0);
    expect(result.trendPercentage).toBeNull(); // no previous data
    // Ensure QB chain built and parameters set
    expect(txRepo.createQueryBuilder).toHaveBeenCalledWith('t');
    expect(qb.innerJoin).toHaveBeenCalledTimes(2); // status + currency
    expect(qb.getRawMany).toHaveBeenCalled();
  });

  it('maps a single day row into the correct local date bucket with rounding', async () => {
    const days = 7;
    const tz = -240; // New York (EDT)
    const { startLocalInclusive } = expectedWindow(days, tz);

    // Put revenue on the 3rd day of the window
    const targetLocalDay = addDays(startLocalInclusive, 2); // index 2
    const localDateStr = formatISO(targetLocalDay, { representation: 'date' });

    // The DB returns a timestamp (UTC string). Service does new Date(row.day) then formatISO(date,'date')
    // We'll craft day at local midnight in UTC form (00:00:00Z).
    const rowDayIso = `${localDateStr}T00:00:00.000Z`;

    const qb = makeQb([
      { day: rowDayIso, revenue: '12.3456', currencyCode: 'USD' },
    ]);
    const prevQb = makePrevQb([]);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qb as any)
      .mockReturnValueOnce(prevQb as any);

    const result = await service.getRevenuePerDay(
      'uid',
      'test-channel-uuid',
      days,
      tz,
    );

    expect(result.series).toHaveLength(days);
    // index 2 should hold 12.35 after rounding
    const idx2 = result.series.findIndex((p) => p.date === localDateStr);
    expect(idx2).toBeGreaterThanOrEqual(0);
    expect(result.series[idx2].revenueUsd).toBe(12.35);
    // all other entries are zero
    result.series.forEach((p, i) => {
      if (i !== idx2) expect(p.revenueUsd).toBe(0);
    });
    expect(result.totalRevenueUsd).toBe(12.35);
    expect(result.trendPercentage).toBeNull(); // no previous data
  });

  it('merges multiple rows regardless of returned order', async () => {
    const days = 5;
    const tz = 0;
    const { startLocalInclusive } = expectedWindow(days, tz);

    const d0 = formatISO(startLocalInclusive, { representation: 'date' });
    const d1 = formatISO(addDays(startLocalInclusive, 1), {
      representation: 'date',
    });

    const qb = makeQb([
      { day: `${d1}T00:00:00.000Z`, revenue: '100.00', currencyCode: 'USD' },
      { day: `${d0}T00:00:00.000Z`, revenue: '50.5', currencyCode: 'USD' },
    ]);
    const prevQb = makePrevQb([{ revenue: '100', currencyCode: 'USD' }]);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qb as any)
      .mockReturnValueOnce(prevQb as any);

    const result = await service.getRevenuePerDay(
      'uid',
      'test-channel-uuid',
      days,
      tz,
    );

    const m0 = result.series.find((p) => p.date === d0)!;
    const m1 = result.series.find((p) => p.date === d1)!;
    expect(m0.revenueUsd).toBe(50.5);
    expect(m1.revenueUsd).toBe(100);
    // total equals sum
    expect(result.totalRevenueUsd).toBe(150.5);
    expect(result.trendPercentage).toBe(50.5);
  });

  it('respects tzOffset when computing start/end local dates', async () => {
    const days = 10;
    const tz = 330; // India
    const qb = makeQb([]); // we only check window boundaries here
    const prevQb = makePrevQb([]);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qb as any)
      .mockReturnValueOnce(prevQb as any);

    const result = await service.getRevenuePerDay(
      'uid',
      'test-channel-uuid',
      days,
      tz,
    );
    const { startDate, endDate } = expectedWindow(days, tz);

    expect(result.startDate).toBe(startDate);
    expect(result.endDate).toBe(endDate);
    expect(result.trendPercentage).toBeNull(); // no previous data
  });

  it('treats null/undefined revenue as 0 and rounds to 2 decimals', async () => {
    const days = 3;
    const tz = 0;
    const { startLocalInclusive } = expectedWindow(days, tz);

    const targetLocalDay = startLocalInclusive;
    const localDateStr = formatISO(targetLocalDay, { representation: 'date' });
    const qb = makeQb([
      {
        day: `${localDateStr}T00:00:00.000Z`,
        revenue: null as any,
        currencyCode: 'USD',
      },
      {
        day: `${localDateStr}T00:00:00.000Z`,
        revenue: '0.004',
        currencyCode: 'USD',
      },
      {
        day: `${localDateStr}T00:00:00.000Z`,
        revenue: '0.005',
        currencyCode: 'USD',
      },
    ]);
    // Note: our service SUMs already in SQL; here we simulate the final summed string.
    // To emulate SUM result ~ 0.009 => rounds to 0.01
    qb.getRawMany.mockResolvedValueOnce([
      {
        day: `${localDateStr}T00:00:00.000Z`,
        revenue: '0.009',
        currencyCode: 'USD',
      },
    ]);

    txRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getRevenuePerDay(
      'uid',
      'test-channel-uuid',
      days,
      tz,
    );
    const entry = result.series.find((p) => p.date === localDateStr)!;
    expect(entry.revenueUsd).toBe(0.01);
    expect(result.totalRevenueUsd).toBe(0.01);
  });

  it('builds series of exact length and sequential dates', async () => {
    const days = 14;
    const tz = -120;
    const qb = makeQb([]);
    txRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getRevenuePerDay(
      'uid',
      'test-channel-uuid',
      days,
      tz,
    );
    expect(result.series).toHaveLength(days);

    // Check first and last entries match start/endDate
    expect(result.series[0].date).toBe(result.startDate);
    expect(result.series[result.series.length - 1].date).toBe(result.endDate);
  });

  it('builds the expected SQL query with correct filters and params', async () => {
    const days = 3;
    const tz = 180; // UTC+3
    const qb = makeQb([]);
    txRepo.createQueryBuilder.mockReturnValue(qb);

    const res = await service.getRevenuePerDay(
      'firebase-123',
      'test-channel-uuid',
      days,
      tz,
    );
    expect(res.series).toHaveLength(days);

    // createQueryBuilder called for alias "t"
    expect(txRepo.createQueryBuilder).toHaveBeenCalledWith('t');

    // Select clause contains date_trunc with interval minutes and alias 'day'
    expect(qb.select).toHaveBeenCalled();
    const selectArgs = qb.select.mock.calls[0];
    expect(selectArgs[1]).toBe('day');
    expect(String(selectArgs[0])).toContain(
      `date_trunc('day', t."createdAt" + (:tzOffsetMinutes) * interval '1 minute')`,
    );

    // SUM selection alias 'revenue' (local currency amount)
    expect(qb.addSelect).toHaveBeenCalledWith(
      'SUM(t."amount"::numeric)',
      'revenue',
    );

    // Currency code selection
    expect(qb.addSelect).toHaveBeenCalledWith('cur.shortCode', 'currencyCode');

    // Filter by channel ID
    expect(qb.where).toHaveBeenCalledWith('t.youtubeChannelId = :channelId', {
      channelId: 'test-channel-uuid',
    });

    // Filter by status code succeeded
    const andWhereCalls = qb.andWhere.mock.calls;
    expect(
      andWhereCalls.some(
        ([cond, params]) =>
          cond.includes('s.code = :succ') && params.succ === 'succeeded',
      ),
    ).toBe(true);

    // Filter by createdAt window and params include startUtc/endUtc
    const windowCall = andWhereCalls.find(
      ([cond]) =>
        cond.includes('t."createdAt" >= :startUtc') &&
        cond.includes('t."createdAt" < :endUtc'),
    );
    expect(windowCall).toBeDefined();
    expect(windowCall?.[1]).toHaveProperty('startUtc');
    expect(windowCall?.[1]).toHaveProperty('endUtc');

    // tz offset parameter is set
    expect(qb.setParameters).toHaveBeenCalledWith({ tzOffsetMinutes: tz });

    // Group/order by day + currency
    expect(qb.groupBy).toHaveBeenCalledWith('day');
    expect(qb.addGroupBy).toHaveBeenCalledWith('cur.shortCode');
    expect(qb.orderBy).toHaveBeenCalledWith('day', 'ASC');
  });

  describe('getMessageUnitStatistics', () => {
    let countryRepo: { findOne: jest.Mock; find: jest.Mock };

    beforeEach(() => {
      countryRepo = {
        findOne: jest.fn(),
        find: jest.fn().mockResolvedValue([]),
      };
    });

    // Helper: build a mock query builder that returns rows via getRawMany
    function makeMsgQb(rows: any[]) {
      return {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(rows),
      };
    }

    it('should return USD-converted statistics with all metrics', async () => {
      const currentRows = [
        { totalLocal: '1000', currencyCode: 'KES', transactionCount: '123' },
      ];
      const previousRows = [
        { totalLocal: '800', currencyCode: 'KES', transactionCount: '98' },
      ];
      const monthRows = [
        { totalLocal: '900', currencyCode: 'KES', transactionCount: '100' },
      ];
      const countryRows = [
        {
          countryCode: 'KEN',
          currencyCode: 'KES',
          totalLocal: '1000',
        },
      ];

      // 9 query builder calls: current, previous, 6 months, top country
      txRepo.createQueryBuilder
        .mockReturnValueOnce(makeMsgQb(currentRows) as any)
        .mockReturnValueOnce(makeMsgQb(previousRows) as any)
        .mockReturnValueOnce(makeMsgQb(monthRows) as any)
        .mockReturnValueOnce(makeMsgQb(monthRows) as any)
        .mockReturnValueOnce(makeMsgQb(monthRows) as any)
        .mockReturnValueOnce(makeMsgQb(monthRows) as any)
        .mockReturnValueOnce(makeMsgQb(monthRows) as any)
        .mockReturnValueOnce(makeMsgQb(monthRows) as any)
        .mockReturnValueOnce(makeMsgQb(countryRows) as any);

      const moduleRef = await Test.createTestingModule({
        providers: [
          CreatorInsightsService,
          { provide: getRepositoryToken(Transaction), useValue: txRepo },
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
          { provide: getRepositoryToken(TelegramChannel), useValue: {} },
          { provide: getRepositoryToken(LinkClick), useValue: {} },
          { provide: getRepositoryToken(Account), useValue: {} },
          { provide: getRepositoryToken(Payout), useValue: {} },
          { provide: getRepositoryToken(Country), useValue: countryRepo },
          { provide: TelegramService, useValue: {} },
          {
            provide: ExchangeRateService,
            useValue: {
              convertCurrency: jest
                .fn()
                .mockResolvedValue({ conversion_rate: 0.0077 }),
            },
          },
        ],
      }).compile();

      const testService = moduleRef.get(CreatorInsightsService);

      countryRepo.find.mockResolvedValue([{ iso3Code: 'KEN', name: 'Kenya' }]);

      const result = await testService.getMessageUnitStatistics(
        'test-uid',
        'test-channel-uuid',
      );

      // 1000 KES * 0.0077 = 7.70 USD
      expect(result.current30Days.totalUsd).toBe(7.7);
      expect(result.current30Days.averageUsd).toBe(
        Number((7.7 / 30).toFixed(2)),
      );
      expect(result.current30Days.transactionCount).toBe(123);

      // 800 KES * 0.0077 = 6.16 USD
      expect(result.previous30Days.totalUsd).toBe(6.16);
      expect(result.previous30Days.averageUsd).toBe(
        Number((6.16 / 30).toFixed(2)),
      );
      expect(result.previous30Days.transactionCount).toBe(98);

      // (7.70 - 6.16) / 6.16 * 100 = 25.0
      expect(result.changePercentage).toBe(25);
      expect(result.monthlyAverages).toHaveLength(6);

      // 900 * 0.0077 = 6.93 / 30 = 0.23
      expect(result.monthlyAverages[0].averagePerDayUsd).toBe(
        Number((6.93 / 30).toFixed(2)),
      );

      expect(result.topCountries).toHaveLength(1);
      expect(result.topCountries[0].countryCode).toBe('KEN');
      expect(result.topCountries[0].countryName).toBe('Kenya');
      expect(result.topCountries[0].totalUsd).toBe(7.7);
    });

    it('should return null changePercentage when no previous period data', async () => {
      const currentRows = [
        { totalLocal: '500', currencyCode: 'KES', transactionCount: '50' },
      ];

      // current, previous (empty = no data), 6 months (empty), top country (empty)
      txRepo.createQueryBuilder
        .mockReturnValueOnce(makeMsgQb(currentRows) as any)
        .mockReturnValueOnce(makeMsgQb([]) as any)
        .mockReturnValueOnce(makeMsgQb([]) as any)
        .mockReturnValueOnce(makeMsgQb([]) as any)
        .mockReturnValueOnce(makeMsgQb([]) as any)
        .mockReturnValueOnce(makeMsgQb([]) as any)
        .mockReturnValueOnce(makeMsgQb([]) as any)
        .mockReturnValueOnce(makeMsgQb([]) as any)
        .mockReturnValueOnce(makeMsgQb([]) as any);

      // Default exchange rate is 1.0 from beforeEach
      const result = await service.getMessageUnitStatistics(
        'test-uid',
        'test-channel-uuid',
      );

      // No previous data → null trend
      expect(result.changePercentage).toBeNull();
      // 500 * 1.0 = 500
      expect(result.current30Days.totalUsd).toBe(500);
      expect(result.previous30Days.totalUsd).toBe(0);
    });

    it('should return empty topCountries array when no data', async () => {
      // All queries return empty arrays
      for (let i = 0; i < 9; i++) {
        txRepo.createQueryBuilder.mockReturnValueOnce(makeMsgQb([]) as any);
      }

      const result = await service.getMessageUnitStatistics(
        'test-uid',
        'test-channel-uuid',
      );

      expect(result.topCountries).toEqual([]);
    });

    it('should handle empty rows gracefully', async () => {
      // All queries return empty arrays
      for (let i = 0; i < 9; i++) {
        txRepo.createQueryBuilder.mockReturnValueOnce(makeMsgQb([]) as any);
      }

      const result = await service.getMessageUnitStatistics(
        'test-uid',
        'test-channel-uuid',
      );

      expect(result.current30Days.totalUsd).toBe(0);
      expect(result.current30Days.averageUsd).toBe(0);
      expect(result.current30Days.transactionCount).toBe(0);
      expect(result.previous30Days.totalUsd).toBe(0);
      expect(result.changePercentage).toBeNull();
    });
  });

  describe('validateChannelAccess', () => {
    it('should allow access when user has a UserChannel record', async () => {
      await expect(
        service.validateChannelAccess('creator-uid', 'channel-123'),
      ).resolves.toBeUndefined();
    });

    it('should bypass check for Admin users even without UserChannel record', async () => {
      userRepo.findOne.mockResolvedValue({ role: UserRole.Admin });

      await expect(
        service.validateChannelAccess('admin-uid', 'any-channel'),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException for non-admin without UserChannel record', async () => {
      // Re-create module with UserChannel findOne returning null
      const module = await Test.createTestingModule({
        providers: [
          CreatorInsightsService,
          { provide: getRepositoryToken(Transaction), useValue: txRepo },
          {
            provide: getRepositoryToken(UserChannel),
            useValue: { findOne: jest.fn().mockResolvedValue(null) },
          },
          {
            provide: getRepositoryToken(User),
            useValue: {
              findOne: jest.fn().mockResolvedValue({ role: UserRole.Creator }),
            },
          },
          { provide: getRepositoryToken(TelegramChannel), useValue: {} },
          { provide: getRepositoryToken(LinkClick), useValue: {} },
          { provide: getRepositoryToken(Account), useValue: {} },
          { provide: getRepositoryToken(Payout), useValue: {} },
          { provide: getRepositoryToken(Country), useValue: {} },
          { provide: TelegramService, useValue: {} },
          {
            provide: ExchangeRateService,
            useValue: { convertCurrency: jest.fn() },
          },
        ],
      }).compile();

      const svc = module.get(CreatorInsightsService);
      await expect(
        svc.validateChannelAccess('creator-uid', 'channel-123'),
      ).rejects.toThrow('You do not have access to this channel');
    });
  });
});
