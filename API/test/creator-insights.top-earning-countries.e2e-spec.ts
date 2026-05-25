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
import * as crypto from 'crypto';

// Ensure required environment variables for ConfigModule validation and DB connectivity
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
    req.user = { user_id: TEST_UID, role: UserRole.Creator };
    return true;
  }
}

describe('CreatorInsights /creator-insights/top-earning-countries (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let adminDev: AdminDevService;

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
      // Bypass Firebase auth and role checks
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
    adminDev = app.get(AdminDevService);

    // Ensure creator user exists
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

    // Seed transactions (dev-only)
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

  it('returns top earning countries with correct shape and totals (default params)', async () => {
    const res = await request(app.getHttpServer())
      .get('/creator-insights/top-earning-countries')
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);
    const body = res.body;

    expect(body).toHaveProperty('days');
    expect(body).toHaveProperty('timezoneOffsetMinutes');
    expect(body).toHaveProperty('startDate');
    expect(body).toHaveProperty('endDate');
    expect(body).toHaveProperty('limit');
    expect(body).toHaveProperty('totalUsd');
    expect(Array.isArray(body.items)).toBe(true);

    // Validate items
    for (const item of body.items) {
      expect(typeof item.country).toBe('string');
      expect(item.countryCode).toMatch(/^[A-Z]{3}$/);
      expect(item.currency).toBeDefined();
      expect(typeof item.currency.code).toBe('string');
      expect(
        item.currency.iso4217Numeric === null ||
          Number.isInteger(item.currency.iso4217Numeric),
      ).toBe(true);
      expect(typeof item.localAmountTotal).toBe('number');
      expect(typeof item.usdTotal).toBe('number');
      expect(item.localAmountTotal).toBeGreaterThanOrEqual(0);
      expect(item.usdTotal).toBeGreaterThanOrEqual(0);
    }

    // Sorted by usdTotal desc (non-increasing)
    for (let i = 1; i < body.items.length; i++) {
      expect(body.items[i - 1].usdTotal).toBeGreaterThanOrEqual(
        body.items[i].usdTotal,
      );
    }

    // totalUsd equals sum(items.usdTotal) (2-decimals)
    const sum = Number(
      body.items.reduce((a: number, x: any) => a + x.usdTotal, 0).toFixed(2),
    );
    expect(body.totalUsd).toBe(sum);
  });

  it('respects limit and supports timezone offsets', async () => {
    const res = await request(app.getHttpServer())
      .get('/creator-insights/top-earning-countries')
      .query({ days: 30, tzOffsetMinutes: -240, limit: 3 })
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);
    const body = res.body;

    expect(body.limit).toBe(3);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeLessThanOrEqual(3);

    // Sorted by usdTotal desc (non-increasing)
    for (let i = 1; i < body.items.length; i++) {
      expect(body.items[i - 1].usdTotal).toBeGreaterThanOrEqual(
        body.items[i].usdTotal,
      );
    }

    // totalUsd equals sum(items.usdTotal) (2-decimals)
    const sum = Number(
      body.items.reduce((a: number, x: any) => a + x.usdTotal, 0).toFixed(2),
    );
    expect(body.totalUsd).toBe(sum);
  });
});
