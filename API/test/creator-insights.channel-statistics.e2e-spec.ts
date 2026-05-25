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
import { TelegramChannel } from '../src/creator/entities/telegram-channel.entity';
import { LinkClick } from '../src/link-click/entities/link-click.entity';
import { Transaction } from '../src/transaction/entities/transaction.entity';
import { Currency } from '../src/transaction/entities/currency.entity';
import { PaymentProvider } from '../src/transaction/entities/payment-provider.entity';
import { TransactionStatus } from '../src/transaction/entities/transaction-status.entity';
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

const BASE_NOW_UTC = new Date('2024-02-01T00:00:00Z');

describe('GET /creator-insights/channel-statistics (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let channelRepo: Repository<TelegramChannel>;
  let clickRepo: Repository<LinkClick>;
  let txRepo: Repository<Transaction>;
  let currencyRepo: Repository<Currency>;
  let providerRepo: Repository<PaymentProvider>;
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
    // Generate unique test IDs using crypto for better uniqueness
    testUid = 'e2e-user-channel-stats-' + crypto.randomUUID();

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
    channelRepo = app.get<Repository<TelegramChannel>>(
      getRepositoryToken(TelegramChannel),
    );
    clickRepo = app.get<Repository<LinkClick>>(getRepositoryToken(LinkClick));
    txRepo = app.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    currencyRepo = app.get<Repository<Currency>>(getRepositoryToken(Currency));
    providerRepo = app.get<Repository<PaymentProvider>>(
      getRepositoryToken(PaymentProvider),
    );
    statusRepo = app.get<Repository<TransactionStatus>>(
      getRepositoryToken(TransactionStatus),
    );

    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(BASE_NOW_UTC.getTime());

    // Clean up any existing test data first
    await userRepo.delete({ firebaseUid: testUid });

    // ensure base data
    let statusSucceeded = await statusRepo.findOne({
      where: { code: 'succeeded' },
    });
    if (!statusSucceeded) {
      statusSucceeded = await statusRepo.save({
        code: 'succeeded',
        name: 'Succeeded',
      });
    }
    let currency = await currencyRepo.findOne({ where: { shortCode: 'USD' } });
    if (!currency) {
      currency = await currencyRepo.save({
        shortCode: 'USD',
        name: 'US Dollar',
      });
    }
    let provider =
      (await providerRepo.findOne({
        where: [{ code: 'ken' }, { name: 'Provider Kenya' }],
      })) || null;
    if (!provider) {
      provider = await providerRepo.save({
        name: 'Provider Kenya',
        country: 'Kenya',
        countryCode: 'KEN',
        currency,
        supportsDecimals: true,
        code: 'ken',
        payoutDelay: 2,
      });
    }

    // Create users directly with error handling for conflicts
    let creator: User;
    try {
      creator = userRepo.create({
        firebaseUid: testUid,
        role: UserRole.Creator,
      });
      await userRepo.save(creator);
    } catch (error: any) {
      if (error.code === '23505') {
        // If user already exists, find it
        creator = await userRepo.findOneOrFail({
          where: { firebaseUid: testUid },
        });
      } else {
        throw error;
      }
    }

    // Payer users are no longer required

    // Clean up any existing channel with the same handle
    await channelRepo.delete({ channelHandle: 'ch1-' + crypto.randomUUID() });

    const channelHandle = 'ch1-' + crypto.randomUUID();
    const channel = await channelRepo.save({
      channelHandle: channelHandle,
      creatorId: creator.id,
    });

    // clicks inside and outside window
    await clickRepo.save([
      {
        telegramChannel: channel,
        createdAt: new Date('2024-01-20T00:00:00Z'),
      },
      {
        telegramChannel: channel,
        createdAt: new Date('2023-12-01T00:00:00Z'),
      },
    ]);

    // transactions inside and outside window
    await txRepo.query(
      `INSERT INTO "transactions"("amount","usdEstimatedValue","currencyId","messageId","beneficiaryId","payerFullName","payerPhone","paymentProviderId","statusId","payoutId","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)`,
      [
        '5.00',
        '5.00',
        currency.id,
        'm1',
        creator.id,
        'Test Payer',
        '+100000000',
        provider.id,
        statusSucceeded.id,
        null,
        '2024-01-20T00:00:00Z',
      ],
    );
    await txRepo.query(
      `INSERT INTO "transactions"("amount","usdEstimatedValue","currencyId","messageId","beneficiaryId","payerFullName","payerPhone","paymentProviderId","statusId","payoutId","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)`,
      [
        '5.00',
        '5.00',
        currency.id,
        'm2',
        creator.id,
        'Test Payer',
        '+100000001',
        provider.id,
        statusSucceeded.id,
        null,
        '2023-12-01T00:00:00Z',
      ],
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (nowSpy) {
      nowSpy.mockRestore();
    }
  });

  it('returns stats for default 30 days', async () => {
    const res = await request(app.getHttpServer())
      .get('/creator-insights/channel-statistics')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      channelHandle: expect.stringMatching(/^ch1-/),
      linkClicks: 1,
      transactions: 1,
      transactionTrend: 0,
    });
  });

  it('returns stats for custom days', async () => {
    const res = await request(app.getHttpServer())
      .get('/creator-insights/channel-statistics')
      .query({ days: 100 })
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      channelHandle: expect.stringMatching(/^ch1-/),
      linkClicks: 2,
      transactions: 2,
      transactionTrend: 0,
    });
  });
});
