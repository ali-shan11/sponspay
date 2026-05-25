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
import { TelegramClient } from 'telegram';
import * as crypto from 'crypto';

const BASE_NOW_UTC = new Date('2024-02-01T00:00:00Z');

describe('GET /creator-insights/transactions (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let txRepo: Repository<Transaction>;
  let currencyRepo: Repository<Currency>;
  let statusRepo: Repository<TransactionStatus>;
  let nowSpy: jest.SpyInstance<number, []>;
  let testUid: string;

  class AllowAllAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      req.user = { user_id: testUid, role: UserRole.Creator };
      return true;
    }
  }

  beforeAll(async () => {
    testUid = 'e2e-user-tx-' + crypto.randomUUID();

    const mockTelegramClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      invoke: jest.fn().mockResolvedValue({}),
      getDialogs: jest.fn().mockResolvedValue([]),
      getEntity: jest.fn().mockResolvedValue({}),
      getInputEntity: jest.fn().mockResolvedValue({}),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FirebaseAdminService)
      .useValue({ verifyIdToken: jest.fn() })
      .overrideProvider(TelegramClient)
      .useValue(mockTelegramClient)
      .overrideGuard(FirebaseAuthGuard)
      .useClass(AllowAllAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    txRepo = app.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    currencyRepo = app.get<Repository<Currency>>(getRepositoryToken(Currency));
    statusRepo = app.get<Repository<TransactionStatus>>(
      getRepositoryToken(TransactionStatus),
    );

    // Freeze time for deterministic window
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(BASE_NOW_UTC.getTime());

    // Ensure creator user
    const creator = await userRepo.save({
      firebaseUid: testUid,
      role: UserRole.Creator,
    });

    // Ensure currencies exist first
    const currencyKes =
      (await currencyRepo.findOne({ where: { shortCode: 'KES' } })) ||
      (await currencyRepo.save({
        shortCode: 'KES',
        name: 'Kenyan shilling',
        iso4217Numeric: 404,
      }));

    const currencyTzs =
      (await currencyRepo.findOne({ where: { shortCode: 'TZS' } })) ||
      (await currencyRepo.save({
        shortCode: 'TZS',
        name: 'Tanzanian shilling',
        iso4217Numeric: 834,
      }));

    const statusSucceeded = await statusRepo.findOneOrFail({
      where: { code: 'succeeded' },
    });

    // Insert transactions using new denormalized structure
    await txRepo.query(
      `INSERT INTO "transactions"("amount","currencyId","messageId","messageContent","beneficiaryId","payerFullName","payerPhone","providerName","providerCountryCode","statusId","revenueStatus","referralSource","referralMedium","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`,
      [
        '100.00',
        currencyKes.id,
        'm1',
        'Test message 1',
        creator.id,
        'Test Payer',
        '+100000000',
        'M-PESA Kenya',
        'KEN',
        statusSucceeded.id,
        'earned',
        'twitter',
        'social',
        '2024-01-20T00:00:00Z',
      ],
    );
    await txRepo.query(
      `INSERT INTO "transactions"("amount","currencyId","messageId","messageContent","beneficiaryId","payerFullName","payerPhone","providerName","providerCountryCode","statusId","revenueStatus","referralSource","referralMedium","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`,
      [
        '200.00',
        currencyKes.id,
        'm2',
        'Test message 2',
        creator.id,
        'Test Payer',
        '+100000001',
        'M-PESA Kenya',
        'KEN',
        statusSucceeded.id,
        'pending',
        null,
        null,
        '2024-01-25T00:00:00Z',
      ],
    );
    await txRepo.query(
      `INSERT INTO "transactions"("amount","currencyId","messageId","messageContent","beneficiaryId","payerFullName","payerPhone","providerName","providerCountryCode","statusId","revenueStatus","referralSource","referralMedium","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`,
      [
        '300.00',
        currencyTzs.id,
        'm3',
        null,
        creator.id,
        'Test Payer',
        '+100000002',
        'Tigo Pesa',
        'TZA',
        statusSucceeded.id,
        'earned',
        'facebook',
        'cpc',
        '2024-01-25T01:00:00Z',
      ],
    );
  });

  afterAll(async () => {
    if (app) await app.close();
    if (nowSpy) nowSpy.mockRestore();
  });

  it('returns transactions with new response structure', async () => {
    const res = await request(app.getHttpServer())
      .get('/creator-insights/transactions')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(3);
    // Sorted by createdAt DESC (newest first)
    expect(res.body.items[0]).toMatchObject({
      messageId: 'm3',
      messageContent: null,
      createdAt: '2024-01-25T01:00:00.000Z',
      country: 'TZA',
      countryCode: 'TZA',
      localAmount: 300,
      localCurrencyCode: 'TZS',
      referralSource: 'facebook',
      referralMedium: 'cpc',
      revenueStatus: 'earned',
      forfeitDeadline: null, // earned status, no deadline
    });
    expect(res.body.items[1]).toMatchObject({
      messageId: 'm2',
      messageContent: 'Test message 2',
      createdAt: '2024-01-25T00:00:00.000Z',
      country: 'KEN',
      countryCode: 'KEN',
      localAmount: 200,
      localCurrencyCode: 'KES',
      referralSource: null,
      referralMedium: null,
      revenueStatus: 'pending',
      forfeitDeadline: '2024-02-08T00:00:00.000Z', // pending: createdAt + 14 days
    });
    expect(res.body.items[2]).toMatchObject({
      messageId: 'm1',
      messageContent: 'Test message 1',
      createdAt: '2024-01-20T00:00:00.000Z',
      country: 'KEN',
      countryCode: 'KEN',
      localAmount: 100,
      localCurrencyCode: 'KES',
      referralSource: 'twitter',
      referralMedium: 'social',
      revenueStatus: 'earned',
      forfeitDeadline: null, // earned status, no deadline
    });
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
    expect(res.body.totalRecords).toBe(3);
    expect(res.body.startDate).toBeDefined();
    expect(res.body.endDate).toBeDefined();
  });

  it('paginates results with limit and page', async () => {
    const res = await request(app.getHttpServer())
      .get('/creator-insights/transactions?limit=2&page=2')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      messageId: 'm1',
      messageContent: 'Test message 1',
      country: 'KEN',
      countryCode: 'KEN',
      localAmount: 100,
      localCurrencyCode: 'KES',
    });
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.totalRecords).toBe(3);
  });
});
