import {
  INestApplication,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { FirebaseAdminService } from '../src/firebase/firebase-admin.service';
import { FirebaseAuthGuard } from '../src/auth/firebase-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/creator/entities/user.entity';
import { UserRole } from '../src/creator/enums/user.enum';
import { Transaction } from '../src/transaction/entities/transaction.entity';
import { Currency } from '../src/transaction/entities/currency.entity';
import { TransactionStatus } from '../src/transaction/entities/transaction-status.entity';
import { PaymentProvider } from '../src/transaction/entities/payment-provider.entity';
import { TelegramClient } from 'telegram';

const BASE_NOW_UTC = new Date('2025-01-05T12:00:00.000Z'); // fixed clock for deterministic windows
// Increase Jest timeout since Nest app bootstrap + DB I/O can exceed default 5s
jest.setTimeout(30000);

let currentUid = 'e2e-creator-math-suite';
class AllowAllAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { user_id: currentUid, role: UserRole.Creator };
    return true;
  }
}

describe('CreatorInsights revenue-per-day (deterministic math e2e)', () => {
  let app: INestApplication;

  let userRepo: Repository<User>;
  let txRepo: Repository<Transaction>;
  let currencyRepo: Repository<Currency>;
  let statusRepo: Repository<TransactionStatus>;
  let providerRepo: Repository<PaymentProvider>;

  let statusSucceeded: TransactionStatus;
  let usd: Currency;
  let provider: PaymentProvider;

  let nowSpy: jest.SpyInstance<number, []>;

  beforeAll(async () => {
    // Freeze the global clock for deterministic window computation in service without faking timers
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(BASE_NOW_UTC.getTime());

    const TEST_UID = 'e2e-creator-math-suite';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FirebaseAdminService)
      .useValue({
        verifyIdToken: jest.fn().mockResolvedValue(false),
        addCustomClaim: jest.fn(),
      })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(new AllowAllAuthGuard())
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(TelegramClient)
      .useValue({ connect: jest.fn(), disconnect: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    txRepo = app.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    currencyRepo = app.get<Repository<Currency>>(getRepositoryToken(Currency));
    statusRepo = app.get<Repository<TransactionStatus>>(
      getRepositoryToken(TransactionStatus),
    );
    providerRepo = app.get<Repository<PaymentProvider>>(
      getRepositoryToken(PaymentProvider),
    );

    // Ensure required reference data
    let statusSucceeded_temp = await statusRepo.findOne({
      where: { code: 'succeeded' },
    });
    if (!statusSucceeded_temp) {
      statusSucceeded_temp = await statusRepo.save({
        code: 'succeeded',
        name: 'Succeeded',
      });
    }
    statusSucceeded = statusSucceeded_temp;

    let usd_temp = await currencyRepo.findOne({ where: { shortCode: 'USD' } });
    if (!usd_temp) {
      usd_temp = await currencyRepo.save({
        shortCode: 'USD',
        name: 'US Dollar',
      });
    }
    usd = usd_temp;

    let provider_temp = (await providerRepo.find())[0];
    if (!provider_temp) {
      provider_temp = await providerRepo.save({
        name: 'Test Provider',
        country: 'Test Country',
        countryCode: 'TST',
        currency: usd,
        supportsDecimals: true,
        code: 'test',
        payoutDelay: 2,
      });
    }
    provider = provider_temp;

    // Ensure the test creator exists
    await ensureUser(userRepo, TEST_UID, UserRole.Creator);
  });

  afterAll(async () => {
    await app?.close();
    nowSpy?.mockRestore();
  });

  // Helpers

  async function ensureUser(
    repo: Repository<User>,
    firebaseUid: string,
    role: UserRole,
  ) {
    let u = await repo.findOne({ where: { firebaseUid } });
    if (!u) {
      u = repo.create({ firebaseUid, role });
      u = await repo.save(u);
    } else if (u.role !== role) {
      u.role = role;
      await repo.save(u);
    }
    return u;
  }

  async function insertTx(
    beneficiary: User,
    createdAtUtc: Date,
    usdValue: string,
  ) {
    // Perform atomic raw INSERT specifying FK columns and timestamps explicitly
    const messageId = Math.random().toString(36).slice(2, 12);
    await txRepo.query(
      `
      INSERT INTO "transactions"
        ("amount",
         "usdEstimatedValue",
         "currencyId",
         "messageId",
         "beneficiaryId",
         "payerFullName",
         "payerPhone",
         "paymentProviderId",
         "statusId",
         "payoutId",
         "createdAt",
         "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
      `,
      [
        usdValue,
        usdValue,
        usd.id,
        messageId,
        beneficiary.id,
        'Test Payer',
        '+100000000',
        provider.id,
        statusSucceeded.id,
        null,
        createdAtUtc.toISOString(),
      ],
    );
  }

  async function clearForBeneficiary(beneficiary: User) {
    await txRepo
      .createQueryBuilder()
      .delete()
      .where('"beneficiaryId" = :bid', { bid: beneficiary.id })
      .execute();
  }

  async function setupScenario(uid: string) {
    const creator = await ensureUser(userRepo, uid, UserRole.Creator);
    // Clean slate for beneficiary before each scenario
    await clearForBeneficiary(creator);
    return { creator };
  }

  type TxCase = { createdAtUtc: string; usd: string };

  function computeExpected(
    txs: TxCase[],
    days: number,
    tzOffsetMinutes: number,
    baseNowUtc: Date,
  ) {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const tzMs = tzOffsetMinutes * 60 * 1000;

    const nowLocalMs = baseNowUtc.getTime() + tzMs;
    const endLocalExclusiveMs =
      Math.floor(nowLocalMs / MS_PER_DAY) * MS_PER_DAY + MS_PER_DAY;
    const startLocalInclusiveMs = endLocalExclusiveMs - days * MS_PER_DAY;
    const prevStartLocalInclusiveMs = startLocalInclusiveMs - days * MS_PER_DAY;
    const prevEndLocalExclusiveMs = startLocalInclusiveMs;

    // Build series skeleton (labels derived from local-day indices)
    const series: { date: string; revenueUsd: number }[] = [];
    const indexByDate = new Map<string, number>();
    const startLocalDayIndex = Math.floor(startLocalInclusiveMs / MS_PER_DAY);
    for (let i = 0; i < days; i++) {
      const dayIndex = startLocalDayIndex + i;
      const dateStr = new Date(dayIndex * MS_PER_DAY)
        .toISOString()
        .slice(0, 10);
      indexByDate.set(dateStr, i);
      series.push({ date: dateStr, revenueUsd: 0 });
    }

    // Aggregate
    let previousTotal = 0;
    for (const tx of txs) {
      const createdMs = new Date(tx.createdAtUtc).getTime();
      const localMs = createdMs + tzMs;
      if (localMs >= startLocalInclusiveMs && localMs < endLocalExclusiveMs) {
        const dayIndex = Math.floor(localMs / MS_PER_DAY);
        const key = new Date(dayIndex * MS_PER_DAY).toISOString().slice(0, 10);
        const idx = indexByDate.get(key);
        if (idx !== undefined) {
          const prev = series[idx].revenueUsd;
          const next = prev + Number(tx.usd);
          series[idx].revenueUsd = Number(next.toFixed(2));
        }
      } else if (
        localMs >= prevStartLocalInclusiveMs &&
        localMs < prevEndLocalExclusiveMs
      ) {
        previousTotal += Number(tx.usd);
      }
    }

    const totalRevenueUsd = Number(
      series.reduce((a, s) => a + s.revenueUsd, 0).toFixed(2),
    );
    const previousTotalRounded = Number(previousTotal.toFixed(2));
    const trendPercentage =
      previousTotalRounded > 0
        ? Number(
            (
              ((totalRevenueUsd - previousTotalRounded) /
                previousTotalRounded) *
              100
            ).toFixed(2),
          )
        : 0;

    const startDate = new Date(startLocalDayIndex * MS_PER_DAY)
      .toISOString()
      .slice(0, 10);
    const endDate = new Date((startLocalDayIndex + days - 1) * MS_PER_DAY)
      .toISOString()
      .slice(0, 10);

    return { startDate, endDate, series, totalRevenueUsd, trendPercentage };
  }

  // SCENARIOS

  it('S1: sums multiple transactions on same local day (tz=0, days=1)', async () => {
    const uid = 'e2e-creator-math-s1';
    const { creator } = await setupScenario(uid);
    currentUid = uid;

    const txs: TxCase[] = [
      { createdAtUtc: '2025-01-05T10:00:00.000Z', usd: '1.11' },
      { createdAtUtc: '2025-01-05T12:00:00.000Z', usd: '2.22' },
      { createdAtUtc: '2025-01-05T22:00:00.000Z', usd: '3.33' },
    ];

    for (const t of txs) {
      await insertTx(creator, new Date(t.createdAtUtc), t.usd);
    }

    const res = await request(app.getHttpServer())
      .get('/creator-insights/revenue-per-day')
      .query({ days: 1, tzOffsetMinutes: 0 })
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);

    const expected = computeExpected(txs, 1, 0, BASE_NOW_UTC);
    expect(res.body.series.length).toBe(1);
    expect(res.body.totalRevenueUsd).toBe(expected.totalRevenueUsd);
    expect(res.body.series[0].revenueUsd).toBe(6.66);
    expect(res.body.trendPercentage).toBe(expected.trendPercentage);
  });

  it('S2: multi-day with zero-fill (tz=0, days=3)', async () => {
    const uid = 'e2e-creator-math-s2';
    const { creator } = await setupScenario(uid);
    currentUid = uid;

    const txs: TxCase[] = [
      { createdAtUtc: '2025-01-01T15:00:00.000Z', usd: '4.00' },
      { createdAtUtc: '2025-01-03T11:00:00.000Z', usd: '5.00' },
    ];

    for (const t of txs) {
      await insertTx(creator, new Date(t.createdAtUtc), t.usd);
    }

    const res = await request(app.getHttpServer())
      .get('/creator-insights/revenue-per-day')
      .query({ days: 3, tzOffsetMinutes: 0 })
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);

    const expected = computeExpected(txs, 3, 0, BASE_NOW_UTC);
    expect(res.body.series.length).toBe(3);
    verifySeriesAndTotal(
      res.body.series,
      expected.series,
      res.body.totalRevenueUsd,
      expected.totalRevenueUsd,
      res.body.trendPercentage,
      expected.trendPercentage,
    );
  });

  it('S3: tzOffset +180 shifts to next local day', async () => {
    const uid = 'e2e-creator-math-s3';
    const { creator } = await setupScenario(uid);
    currentUid = uid;

    const txs: TxCase[] = [
      // 22:30Z becomes 01:30 local at +180 (next day) and stays within [2025-01-04, 2025-01-06) local window
      { createdAtUtc: '2025-01-04T22:30:00.000Z', usd: '10.00' },
    ];

    for (const t of txs) {
      await insertTx(creator, new Date(t.createdAtUtc), t.usd);
    }

    const res = await request(app.getHttpServer())
      .get('/creator-insights/revenue-per-day')
      .query({ days: 2, tzOffsetMinutes: 180 }) // 2-day window around Jan 1/2 local
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);

    const expected = computeExpected(txs, 2, 180, BASE_NOW_UTC);
    verifySeriesAndTotal(
      res.body.series,
      expected.series,
      res.body.totalRevenueUsd,
      expected.totalRevenueUsd,
      res.body.trendPercentage,
      expected.trendPercentage,
    );
    // Ensure at least one day has 10.00 and the other 0.00
    const hasTen = res.body.series.some(
      (d: any) => Number(d.revenueUsd) === 10,
    );
    expect(hasTen).toBe(true);
  });

  it('S4: tzOffset -240 shifts to previous local day', async () => {
    const uid = 'e2e-creator-math-s4';
    const { creator } = await setupScenario(uid);
    currentUid = uid;

    const txs: TxCase[] = [
      // 01:30Z becomes previous local day at -240 and stays within [2025-01-04, 2025-01-06) local window
      { createdAtUtc: '2025-01-05T01:30:00.000Z', usd: '10.00' },
    ];

    for (const t of txs) {
      await insertTx(creator, new Date(t.createdAtUtc), t.usd);
    }

    const res = await request(app.getHttpServer())
      .get('/creator-insights/revenue-per-day')
      .query({ days: 2, tzOffsetMinutes: -240 })
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);

    const expected = computeExpected(txs, 2, -240, BASE_NOW_UTC);
    verifySeriesAndTotal(
      res.body.series,
      expected.series,
      res.body.totalRevenueUsd,
      expected.totalRevenueUsd,
      res.body.trendPercentage,
      expected.trendPercentage,
    );
    const hasTen = res.body.series.some(
      (d: any) => Number(d.revenueUsd) === 10,
    );
    expect(hasTen).toBe(true);
  });

  it('S5: window boundaries (start inclusive, end exclusive)', async () => {
    const uid = 'e2e-creator-math-s5';
    const { creator } = await setupScenario(uid);
    currentUid = uid;

    // For BASE_NOW_UTC=2025-01-05T12:00Z and tz=0:
    // days=2 => local window = [2025-01-04T00:00:00, 2025-01-06T00:00:00)
    // Insert exactly at start boundary (included) and at end boundary (excluded)
    const txs: TxCase[] = [
      { createdAtUtc: '2025-01-04T00:00:00.000Z', usd: '7.00' }, // included
      { createdAtUtc: '2025-01-06T00:00:00.000Z', usd: '9.00' }, // excluded
    ];

    for (const t of txs) {
      await insertTx(creator, new Date(t.createdAtUtc), t.usd);
    }

    const res = await request(app.getHttpServer())
      .get('/creator-insights/revenue-per-day')
      .query({ days: 2, tzOffsetMinutes: 0 })
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);

    const expected = computeExpected(txs, 2, 0, BASE_NOW_UTC);
    verifySeriesAndTotal(
      res.body.series,
      expected.series,
      res.body.totalRevenueUsd,
      expected.totalRevenueUsd,
      res.body.trendPercentage,
      expected.trendPercentage,
    );
    // Ensure the 9.00 was excluded
    const containsNine = res.body.series.some(
      (d: any) => Number(d.revenueUsd) === 9,
    );
    expect(containsNine).toBe(false);
  });

  it('S7: total invariance for interior set across tz offsets', async () => {
    const uid = 'e2e-creator-math-s7';
    const { creator } = await setupScenario(uid);
    currentUid = uid;

    // Interior transactions (far from boundaries for days=5, around BASE_NOW)
    const txs: TxCase[] = [
      { createdAtUtc: '2025-01-03T10:00:00.000Z', usd: '12.34' },
      { createdAtUtc: '2025-01-04T11:00:00.000Z', usd: '5.66' },
      { createdAtUtc: '2025-01-05T09:15:00.000Z', usd: '20.00' },
    ];

    for (const t of txs) {
      await insertTx(creator, new Date(t.createdAtUtc), t.usd);
    }

    const call = async (tz: number) =>
      request(app.getHttpServer())
        .get('/creator-insights/revenue-per-day')
        .query({ days: 5, tzOffsetMinutes: tz })
        .set('Authorization', 'Bearer test');

    const res0 = await call(0);
    const resNeg = await call(-240);
    const resPos = await call(330);

    expect(res0.status).toBe(200);
    expect(resNeg.status).toBe(200);
    expect(resPos.status).toBe(200);

    const t0 = Number(res0.body.totalRevenueUsd);
    const tN = Number(resNeg.body.totalRevenueUsd);
    const tP = Number(resPos.body.totalRevenueUsd);

    expect(Number(t0.toFixed(2))).toBe(Number(tN.toFixed(2)));
    expect(Number(t0.toFixed(2))).toBe(Number(tP.toFixed(2)));
    expect(res0.body.trendPercentage).toBe(0);
    expect(resNeg.body.trendPercentage).toBe(0);
    expect(resPos.body.trendPercentage).toBe(0);
  });

  it('S8: 5-day sparse coverage, zero-fill correctness and dates', async () => {
    const uid = 'e2e-creator-math-s8';
    const { creator } = await setupScenario(uid);
    currentUid = uid;

    const txs: TxCase[] = [
      { createdAtUtc: '2025-01-01T08:00:00.000Z', usd: '1.00' },
      { createdAtUtc: '2025-01-03T12:00:00.000Z', usd: '2.00' },
      { createdAtUtc: '2025-01-05T16:00:00.000Z', usd: '3.00' },
    ];

    for (const t of txs) {
      await insertTx(creator, new Date(t.createdAtUtc), t.usd);
    }

    const days = 5;
    const tz = 0;

    const res = await request(app.getHttpServer())
      .get('/creator-insights/revenue-per-day')
      .query({ days, tzOffsetMinutes: tz })
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);

    const expected = computeExpected(txs, days, tz, BASE_NOW_UTC);
    expect(res.body.startDate).toBe(expected.startDate);
    expect(res.body.endDate).toBe(expected.endDate);
    verifySeriesAndTotal(
      res.body.series,
      expected.series,
      res.body.totalRevenueUsd,
      expected.totalRevenueUsd,
      res.body.trendPercentage,
      expected.trendPercentage,
    );
  });

  it('S9: trend percentage compares against previous period total', async () => {
    const uid = 'e2e-creator-math-s9';
    const { creator } = await setupScenario(uid);
    currentUid = uid;

    const txs: TxCase[] = [
      // Previous window (days=3) transactions
      { createdAtUtc: '2025-01-01T12:00:00.000Z', usd: '15.00' },
      // Current window transactions (Jan 3-5 local for tz=0)
      { createdAtUtc: '2025-01-03T08:00:00.000Z', usd: '7.00' },
      { createdAtUtc: '2025-01-04T10:00:00.000Z', usd: '13.00' },
    ];

    for (const t of txs) {
      await insertTx(creator, new Date(t.createdAtUtc), t.usd);
    }

    const days = 3;
    const tz = 0;

    const res = await request(app.getHttpServer())
      .get('/creator-insights/revenue-per-day')
      .query({ days, tzOffsetMinutes: tz })
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);

    const expected = computeExpected(txs, days, tz, BASE_NOW_UTC);
    verifySeriesAndTotal(
      res.body.series,
      expected.series,
      res.body.totalRevenueUsd,
      expected.totalRevenueUsd,
      res.body.trendPercentage,
      expected.trendPercentage,
    );
    expect(res.body.trendPercentage).toBe(33.33);
  });

  function verifySeriesAndTotal(
    gotSeries: Array<{ date: string; revenueUsd: number }>,
    expSeries: Array<{ date: string; revenueUsd: number }>,
    gotTotal: number,
    expTotal: number,
    gotTrend: number,
    expTrend: number,
  ) {
    expect(gotSeries.length).toBe(expSeries.length);
    for (let i = 0; i < expSeries.length; i++) {
      expect(gotSeries[i].date).toBe(expSeries[i].date);
      expect(Number(gotSeries[i].revenueUsd)).toBe(
        Number(expSeries[i].revenueUsd),
      );
    }
    expect(Number(Number(gotTotal).toFixed(2))).toBe(
      Number(Number(expTotal).toFixed(2)),
    );
    expect(Number(Number(gotTrend).toFixed(2))).toBe(
      Number(Number(expTrend).toFixed(2)),
    );
  }
});
