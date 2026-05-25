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
import { Payout } from '../src/transaction/entities/payout.entity';
import { TelegramClient } from 'telegram';
import * as crypto from 'crypto';

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

describe('GET /creator-insights/payouts (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let txRepo: Repository<Transaction>;
  let currencyRepo: Repository<Currency>;
  let providerRepo: Repository<PaymentProvider>;
  let statusRepo: Repository<TransactionStatus>;
  let accountRepo: Repository<Account>;
  let payoutRepo: Repository<Payout>;
  let testUid: string;
  let tx1Id: string;
  let tx2Id: string;
  let phoneKenya: string;

  class AllowAllAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      req.user = { user_id: testUid, role: UserRole.Creator };
      return true;
    }
  }

  beforeAll(async () => {
    testUid = 'e2e-user-payout-' + crypto.randomUUID();

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
    payoutRepo = app.get<Repository<Payout>>(getRepositoryToken(Payout));

    // Seed basic data
    const creator = await userRepo.save({
      firebaseUid: testUid,
      role: UserRole.Creator,
    });

    const providerKenya = await providerRepo.findOneOrFail({
      where: { countryCode: 'KEN' },
    });
    const providerTz = await providerRepo.findOneOrFail({
      where: { countryCode: 'TZA' },
    });

    const usd = await currencyRepo.findOneOrFail({
      where: { shortCode: 'USD' },
    });
    const statusSucceeded = await statusRepo.findOneOrFail({
      where: { code: 'succeeded' },
    });

    const accKenya = await accountRepo.save({
      owner: creator,
      phoneNumber: `+111${testUid.slice(-6)}`,
      paymentProvider: providerKenya,
      fullName: 'Test User',
    });
    phoneKenya = accKenya.phoneNumber;
    const accTz = await accountRepo.save({
      owner: creator,
      phoneNumber: `+222${testUid.slice(-6)}`,
      paymentProvider: providerTz,
      fullName: 'Test User',
    });

    // insert transactions
    await txRepo.query(
      `INSERT INTO "transactions"("id","amount","usdEstimatedValue","currencyId","messageId","beneficiaryId","payerFullName","payerPhone","paymentProviderId","statusId","payoutId","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)`,
      [
        (tx1Id = crypto.randomUUID()),
        '100.00',
        '9.25',
        usd.id,
        'm1',
        creator.id,
        'Test Payer',
        '+100000000',
        providerKenya.id,
        statusSucceeded.id,
        null,
        '2024-01-20T00:00:00Z',
      ],
    );
    await txRepo.query(
      `INSERT INTO "transactions"("id","amount","usdEstimatedValue","currencyId","messageId","beneficiaryId","payerFullName","payerPhone","paymentProviderId","statusId","payoutId","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)`,
      [
        (tx2Id = crypto.randomUUID()),
        '200.00',
        '18.50',
        usd.id,
        'm2',
        creator.id,
        'Test Payer',
        '+100000001',
        providerKenya.id,
        statusSucceeded.id,
        null,
        '2024-01-25T00:00:00Z',
      ],
    );
    const tx3Id = crypto.randomUUID();
    await txRepo.query(
      `INSERT INTO "transactions"("id","amount","usdEstimatedValue","currencyId","messageId","beneficiaryId","payerFullName","payerPhone","paymentProviderId","statusId","payoutId","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)`,
      [
        tx3Id,
        '150.00',
        '13.00',
        usd.id,
        'm3',
        creator.id,
        'Test Payer',
        '+100000002',
        providerTz.id,
        statusSucceeded.id,
        null,
        '2024-01-26T00:00:00Z',
      ],
    );

    // insert payouts and link transactions
    const [{ id: p1Id }] = await payoutRepo.query(
      `INSERT INTO "payouts"("beneficiaryId","paymentProviderId","amount","usdEstimatedValue","statusId","invoiceId","initiatedAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
      [
        accKenya.id,
        providerKenya.id,
        '90.00',
        '8.00',
        statusSucceeded.id,
        null,
        '2024-02-10T00:00:00Z',
      ],
    );
    await txRepo.query(
      `UPDATE "transactions" SET "payoutId" = $1 WHERE id = $2`,
      [p1Id, tx1Id],
    );

    const [{ id: p2Id }] = await payoutRepo.query(
      `INSERT INTO "payouts"("beneficiaryId","paymentProviderId","amount","usdEstimatedValue","statusId","invoiceId","initiatedAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
      [
        accKenya.id,
        providerKenya.id,
        '180.00',
        '16.00',
        statusSucceeded.id,
        null,
        '2024-02-15T00:00:00Z',
      ],
    );
    await txRepo.query(
      `UPDATE "transactions" SET "payoutId" = $1 WHERE id = $2`,
      [p2Id, tx2Id],
    );

    const [{ id: p3Id }] = await payoutRepo.query(
      `INSERT INTO "payouts"("beneficiaryId","paymentProviderId","amount","usdEstimatedValue","statusId","invoiceId","initiatedAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
      [
        accTz.id,
        providerTz.id,
        '140.00',
        '12.00',
        statusSucceeded.id,
        null,
        '2024-02-20T00:00:00Z',
      ],
    );
    await txRepo.query(
      `UPDATE "transactions" SET "payoutId" = $1 WHERE id = $2`,
      [p3Id, tx3Id],
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns payouts filtered by countryCode and sorted desc by default', async () => {
    const res = await request(app.getHttpServer())
      .get('/creator-insights/payouts')
      .query({ countryCode: 'KEN' })
      .expect(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].transactionId).toBe(tx2Id);
    expect(res.body.items[1].transactionId).toBe(tx1Id);
  });

  it('supports search and ascending sort', async () => {
    const res = await request(app.getHttpServer())
      .get('/creator-insights/payouts')
      .query({ countryCode: 'KEN', search: tx1Id, sort: 'asc' })
      .expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].transactionId).toBe(tx1Id);
    expect(res.body.items[0].beneficiaryPhone).toBe(phoneKenya);
  });

  it('accepts country name as well', async () => {
    const res = await request(app.getHttpServer())
      .get('/creator-insights/payouts')
      .query({ country: 'Kenya' })
      .expect(200);
    expect(res.body.items).toHaveLength(2);
  });
});
