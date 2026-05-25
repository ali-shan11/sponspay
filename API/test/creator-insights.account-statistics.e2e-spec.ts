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
import { PaymentProvider } from '../src/transaction/entities/payment-provider.entity';
import { TransactionStatus } from '../src/transaction/entities/transaction-status.entity';
import { Account } from '../src/accounts/entities/account.entity';
import { TelegramClient } from 'telegram';
import * as crypto from 'crypto';
import { MessageType } from '../src/transaction/entities/message-type.enum';

const TEST_COUNTRY = 'Wonderland';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
process.env.DB_NAME = process.env.DB_NAME || 'postgres';
process.env.DB_SYNC = process.env.DB_SYNC || 'true';
process.env.SERVICE_ACCOUNT = process.env.SERVICE_ACCOUNT || 'test';
process.env.SERVICE_ACCOUNT_PRIVATE_KEY =
  process.env.SERVICE_ACCOUNT_PRIVATE_KEY || 'test';
process.env.SERVICE_ACCOUNT_USER = process.env.SERVICE_ACCOUNT_USER || 'test';
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'test';
process.env.API_KEY_ALLOWED_DOMAINS =
  process.env.API_KEY_ALLOWED_DOMAINS || 'example.com';
process.env.FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@example.com';
process.env.CONTACT_US_EMAIL =
  process.env.CONTACT_US_EMAIL || 'support@example.com';
process.env.FIREBASE_SERVICE_ACCOUNT =
  process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
process.env.FIREBASE_CHECK_REVOKED =
  process.env.FIREBASE_CHECK_REVOKED || 'false';
process.env.TIMEZONE_API_URL =
  process.env.TIMEZONE_API_URL || 'https://example.com';
process.env.PHOTOS_BUCKET = process.env.PHOTOS_BUCKET || 'test-bucket';
process.env.ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || 'test';
process.env.ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || 'test';
process.env.ZOHO_REDIRECT_URI =
  process.env.ZOHO_REDIRECT_URI || 'https://example.com/oauth';
process.env.ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || 'token';
process.env.ZOHO_ENVIRONMENT = process.env.ZOHO_ENVIRONMENT || 'production';
process.env.TELEGRAM_SERVICE_URL =
  process.env.TELEGRAM_SERVICE_URL || 'http://localhost:9999';
process.env.INTERNAL_API_KEY =
  process.env.INTERNAL_API_KEY || 'test-internal-key';

const BASE_NOW_UTC = new Date('2024-02-01T00:00:00Z');

describe('GET /creator-insights/account-statistics (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let txRepo: Repository<Transaction>;
  let currencyRepo: Repository<Currency>;
  let providerRepo: Repository<PaymentProvider>;
  let statusRepo: Repository<TransactionStatus>;
  let accountRepo: Repository<Account>;
  let nowSpy: jest.SpyInstance<number, []>;
  let testUid: string;
  let uniqueCountryCode: string;
  let accountId: string;

  class AllowAllAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      req.user = { user_id: testUid, role: UserRole.Creator };
      return true;
    }
  }

  beforeAll(async () => {
    testUid = 'e2e-user-country-' + crypto.randomUUID();

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
    providerRepo = app.get<Repository<PaymentProvider>>(
      getRepositoryToken(PaymentProvider),
    );
    statusRepo = app.get<Repository<TransactionStatus>>(
      getRepositoryToken(TransactionStatus),
    );
    accountRepo = app.get<Repository<Account>>(getRepositoryToken(Account));

    nowSpy = jest
      .spyOn(Date, 'now')
      .mockImplementation(() => BASE_NOW_UTC.getTime());

    const currency =
      (await currencyRepo.findOne({ where: { shortCode: 'USD' } })) ||
      (await currencyRepo.save({ shortCode: 'USD', name: 'US Dollar' }));
    // Use unique provider name to avoid conflicts
    const uniqueProviderName = `Provider Wonderland ${testUid}`;
    uniqueCountryCode = `W${testUid.slice(-2)}`;

    const provider = await providerRepo.save({
      name: uniqueProviderName,
      country: TEST_COUNTRY,
      countryCode: uniqueCountryCode,
      currency,
      supportsDecimals: true,
      code: `wnd${testUid.slice(-3)}`,
      payoutDelay: 2,
    });
    let status = await statusRepo.findOne({ where: { code: 'succeeded' } });
    if (!status) {
      status = await statusRepo.save({
        code: 'succeeded',
        name: 'Succeeded',
      });
    }
    const creator = await userRepo.save({
      firebaseUid: testUid,
      role: UserRole.Creator,
    });
    const account = await accountRepo.save({
      owner: creator,
      paymentProvider: provider,
      phoneNumber: `+333${testUid.slice(-6)}`,
      fullName: 'Test User',
    });
    accountId = account.id;

    await txRepo.query(
      `INSERT INTO "transactions"("amount","usdEstimatedValue","currencyId","messageId","beneficiaryId","payerFullName","payerPhone","paymentProviderId","statusId","payoutAt","messageType","livestreamId","totalFees","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`,
      [
        '100.00',
        '80.00',
        currency.id,
        'm1',
        creator.id,
        'Payer1',
        '+100000000',
        provider.id,
        status.id,
        null,
        MessageType.Video,
        null,
        '10.00',
        '2024-01-20T00:00:00Z',
      ],
    );
    await txRepo.query(
      `INSERT INTO "transactions"("amount","usdEstimatedValue","currencyId","messageId","beneficiaryId","payerFullName","payerPhone","paymentProviderId","statusId","payoutAt","messageType","livestreamId","totalFees","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`,
      [
        '50.00',
        '40.00',
        currency.id,
        'm2',
        creator.id,
        'Payer2',
        '+100000001',
        provider.id,
        status.id,
        '2024-01-27T00:00:00Z',
        MessageType.Livestream,
        'ls1',
        '5.00',
        '2024-01-25T00:00:00Z',
      ],
    );
  });

  afterAll(async () => {
    if (app) await app.close();
    if (nowSpy) nowSpy.mockRestore();
  });

  it('returns aggregated statistics for an account', async () => {
    const res = await request(app.getHttpServer())
      .get(`/creator-insights/account-statistics?accountId=${accountId}`)
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalLocal: 150,
      totalUsd: 120,
      nextPayAmountLocal: 90,
      nextPayAmountUsd: 80,
      nextPayDate: '2024-01-22',
      premiumMessages: 2,
      mobileNumber: `+333${testUid.slice(-6)}`,
      livestreamTotalLocal: 50,
      livestreamTotalUsd: 40,
      videoTotalLocal: 100,
      videoTotalUsd: 80,
      uniqueLivestreams: 1,
      averageMessageValue: 75,
      totalFees: 15,
      averageFee: 7.5,
    });
  });

  it('returns aggregated statistics for a country', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/creator-insights/account-statistics?countryCode=${uniqueCountryCode}`,
      )
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalLocal: 150,
      totalUsd: 120,
      nextPayAmountLocal: 90,
      nextPayAmountUsd: 80,
      nextPayDate: '2024-01-22',
      premiumMessages: 2,
      mobileNumber: `+333${testUid.slice(-6)}`,
      livestreamTotalLocal: 50,
      livestreamTotalUsd: 40,
      videoTotalLocal: 100,
      videoTotalUsd: 80,
      uniqueLivestreams: 1,
      averageMessageValue: 75,
      totalFees: 15,
      averageFee: 7.5,
    });
  });
});
