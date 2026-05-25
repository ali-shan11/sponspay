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
import * as fc from 'fast-check';
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

const TEST_CURRENCY = 'KES';
const TEST_RATE = 1.0; // Use 1:1 rate so local amounts equal USD amounts — keeps invariant math identical

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

function makePreviousQb(
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

describe('CreatorInsightsService (property-based)', () => {
  let service: CreatorInsightsService;
  let txRepo: { createQueryBuilder: jest.Mock };
  let exchangeRateService: { convertCurrency: jest.Mock };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-30T12:34:56.000Z').getTime()); // deterministic "now"
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    txRepo = {
      createQueryBuilder: jest.fn(),
    };

    exchangeRateService = {
      convertCurrency: jest
        .fn()
        .mockResolvedValue({ conversion_rate: TEST_RATE }),
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
          useValue: exchangeRateService,
        },
      ],
    }).compile();

    service = module.get(CreatorInsightsService);
  });

  // Helper to compute local window and contiguous date strings
  function computeLocalWindow(days: number, tzOffsetMinutes: number) {
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
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(startLocalInclusive, i);
      dates.push(formatISO(d, { representation: 'date' }));
    }
    return { startDate, endDate, dates };
  }

  it('series invariants hold across random days/offsets/data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 60 }), // days
        fc.integer({ min: -720, max: 840 }), // tz offset minutes
        fc.uniqueArray(fc.integer({ min: 0, max: 59 }), { maxLength: 60 }), // unique candidate day indexes
        fc.array(
          fc.double({
            min: 0,
            max: 20000,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          { maxLength: 60 },
        ),
        fc.double({
          min: 0,
          max: 20000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        async (
          days: number,
          tz: number,
          rawIdxs: number[],
          rawValues: number[],
          prevTotalRaw: number,
        ) => {
          // Clamp selected indexes to within [0..days-1]
          const idxs = rawIdxs
            .map((i: number) => ((i % days) + days) % days)
            .filter((i: number) => i >= 0 && i < days);
          // Build window and dates
          const { startDate, endDate, dates } = computeLocalWindow(days, tz);

          // Build a per-day revenue map (aggregate once per date)
          const perDayTotals = new Map<string, number>();
          for (let k = 0; k < idxs.length; k++) {
            const dateStr = dates[idxs[k]];
            const val =
              k < rawValues.length
                ? Math.max(0, rawValues[k]) // ensure non-negative
                : 0;
            perDayTotals.set(dateStr, (perDayTotals.get(dateStr) ?? 0) + val);
          }

          // Build QB rows with currencyCode (service now groups by currency)
          const rows = Array.from(perDayTotals.entries()).map(
            ([dateStr, total]) => ({
              day: `${dateStr}T00:00:00.000Z`, // service slices first 10 chars
              revenue: String(total),
              currencyCode: TEST_CURRENCY,
            }),
          );

          const qb = makeQb(rows);
          const previousWindowTotal = Math.max(0, prevTotalRaw);
          const prevQb = makePreviousQb(
            previousWindowTotal > 0
              ? [
                  {
                    revenue: String(previousWindowTotal),
                    currencyCode: TEST_CURRENCY,
                  },
                ]
              : [],
          );
          txRepo.createQueryBuilder.mockReset();
          txRepo.createQueryBuilder
            .mockReturnValueOnce(qb as any)
            .mockReturnValueOnce(prevQb as any);

          const result = await service.getRevenuePerDay(
            'uid',
            'test-channel-uuid',
            days,
            tz,
          );

          // Invariants
          // 1) length == days
          expect(result.series).toHaveLength(days);

          // 2) continuous dates, matching start/end
          expect(result.startDate).toBe(startDate);
          expect(result.endDate).toBe(endDate);
          expect(result.series[0].date).toBe(startDate);
          expect(result.series[days - 1].date).toBe(endDate);
          for (let i = 0; i < days; i++) {
            expect(result.series[i].date).toBe(dates[i]);
          }

          // 3) all non-negative and rounded to 2 decimals
          result.series.forEach((p) => {
            expect(p.revenueUsd).toBeGreaterThanOrEqual(0);
            const rounded = Number(p.revenueUsd.toFixed(2));
            expect(p.revenueUsd).toBe(rounded);
          });

          // 4) totals per provided rows match (rate is 1:1 so local == USD, rounded to 2 decimals)
          for (const [d, total] of perDayTotals.entries()) {
            const entry = result.series.find((p) => p.date === d)!;
            expect(entry).toBeDefined();
            expect(entry.revenueUsd).toBe(
              Number((total * TEST_RATE).toFixed(2)),
            );
          }

          // 5) grand total equals sum(series)
          const sumFromSeries = Number(
            result.series.reduce((acc, p) => acc + p.revenueUsd, 0).toFixed(2),
          );
          expect(result.totalRevenueUsd).toBe(sumFromSeries);

          const expectedPreviousTotal =
            previousWindowTotal > 0
              ? Number((previousWindowTotal * TEST_RATE).toFixed(2))
              : 0;
          const hasPreviousData = previousWindowTotal > 0;
          const expectedTrend = hasPreviousData
            ? expectedPreviousTotal > 0
              ? Number(
                  (
                    ((sumFromSeries - expectedPreviousTotal) /
                      expectedPreviousTotal) *
                    100
                  ).toFixed(2),
                )
              : 0
            : null;
          expect(result.trendPercentage).toBe(expectedTrend);
        },
      ),
      { numRuns: 50 }, // explores many combinations quickly
    );
  });
});
