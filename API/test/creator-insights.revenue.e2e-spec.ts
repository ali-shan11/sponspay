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
import { AdminDevService } from '../src/admin/admin-dev.service';
import { TelegramClient } from 'telegram';
import { Account } from '../src/accounts/entities/account.entity';
import * as crypto from 'crypto';

// Ensure required environment variables for ConfigModule validation and DB connectivity
// These values are safe placeholders for CI and local e2e runs (postgres service must be available)
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
process.env.ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || 'test';
process.env.ZOHO_ENVIRONMENT = process.env.ZOHO_ENVIRONMENT || 'production';
process.env.TELEGRAM_SERVICE_URL =
  process.env.TELEGRAM_SERVICE_URL || 'http://localhost:9999';
process.env.INTERNAL_API_KEY =
  process.env.INTERNAL_API_KEY || 'test-internal-key';

const TEST_UID = `e2e-creator-${crypto.randomUUID()}`;

class AllowAllAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    // Populate the request.user similar to what Firebase JWT strategy + RolesGuard expect
    req.user = { user_id: TEST_UID, role: UserRole.Creator };
    return true;
  }
}

describe('CreatorInsights /creator-insights/revenue-per-day (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let adminDev: AdminDevService;
  let accountRepo: Repository<Account>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Prevent real Firebase Admin initialization, and bypass token verification
      .overrideProvider(FirebaseAdminService)
      .useValue({
        verifyIdToken: jest.fn().mockResolvedValue(false),
        addCustomClaim: jest.fn(),
      })
      // Bypass Firebase auth guard (we inject a mocked user above)
      .overrideGuard(FirebaseAuthGuard)
      .useValue(new AllowAllAuthGuard())
      // Bypass role checks explicitly (or we could keep it, since user.role = Creator)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(TelegramClient)
      .useValue({ connect: jest.fn(), disconnect: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    adminDev = app.get(AdminDevService);
    accountRepo = app.get<Repository<Account>>(getRepositoryToken(Account));

    // Ensure the creator user exists (idempotent across test runs)
    const existing = await userRepo.findOne({
      where: { firebaseUid: TEST_UID },
    });
    if (!existing) {
      await userRepo.save(
        userRepo.create({ firebaseUid: TEST_UID, role: UserRole.Creator }),
      );
    } else if (existing.role !== UserRole.Creator) {
      existing.role = UserRole.Creator;
      await userRepo.save(existing);
    }

    // Seed transactions via the service (non-production check allows NODE_ENV=test)
    await adminDev.preSeedTransactions(TEST_UID);
  });

  afterAll(async () => {
    // Cleanup seeded data to keep tests idempotent
    try {
      await adminDev.resetUser(TEST_UID);
    } catch {
      // ignore
    }
    await app?.close();
  });

  it('pre-seed creates accounts with payment providers', async () => {
    const accounts = await accountRepo.find({
      where: { owner: { firebaseUid: TEST_UID } },
      relations: ['paymentProvider', 'owner'],
    });
    expect(accounts.length).toBeGreaterThan(0);
    for (const acc of accounts) {
      expect(acc.paymentProvider).toBeDefined();
      expect(acc.paymentProvider.id).toBeDefined();
    }
  });

  it('returns daily revenue series with correct shape and totals', async () => {
    const res = await request(app.getHttpServer())
      .get('/creator-insights/revenue-per-day')
      .query({ days: 30, tzOffsetMinutes: 0 })
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);
    const body = res.body;

    expect(body).toHaveProperty('days', 30);
    expect(body).toHaveProperty('timezoneOffsetMinutes', 0);
    expect(Array.isArray(body.series)).toBe(true);
    expect(body.series.length).toBe(30);

    // Validate series items
    for (const item of body.series) {
      expect(typeof item.date).toBe('string');
      expect(typeof item.revenueUsd).toBe('number');
      expect(Number.isFinite(item.revenueUsd)).toBe(true);
      expect(item.revenueUsd).toBeGreaterThanOrEqual(0);
    }

    const sum = body.series.reduce(
      (a: number, s: any) => a + Number(s.revenueUsd),
      0,
    );
    expect(Number(sum.toFixed(2))).toBe(
      Number(Number(body.totalRevenueUsd).toFixed(2)),
    );
    expect(body.totalRevenueUsd).toBeGreaterThan(0);
  });

  it('supports timezone offsets and returns valid series', async () => {
    const baseRes = await request(app.getHttpServer())
      .get('/creator-insights/revenue-per-day')
      .query({ days: 30, tzOffsetMinutes: 0 })
      .set('Authorization', 'Bearer test');

    const nycRes = await request(app.getHttpServer())
      .get('/creator-insights/revenue-per-day')
      .query({ days: 30, tzOffsetMinutes: -240 })
      .set('Authorization', 'Bearer test');

    expect(baseRes.status).toBe(200);
    expect(nycRes.status).toBe(200);

    expect(Array.isArray(baseRes.body.series)).toBe(true);
    expect(Array.isArray(nycRes.body.series)).toBe(true);
    expect(baseRes.body.series.length).toBe(30);
    expect(nycRes.body.series.length).toBe(30);

    expect(typeof baseRes.body.totalRevenueUsd).toBe('number');
    expect(typeof nycRes.body.totalRevenueUsd).toBe('number');
    expect(baseRes.body.totalRevenueUsd).toBeGreaterThan(0);
    expect(nycRes.body.totalRevenueUsd).toBeGreaterThan(0);
  });
});
