import {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { FirebaseAuthGuard } from '../src/auth/firebase-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { UserRole } from '../src/creator/enums/user.enum';
import { FirebaseAdminService } from '../src/firebase/firebase-admin.service';
import { TelegramClient } from 'telegram';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentProvider } from '../src/transaction/entities/payment-provider.entity';
import { Currency } from '../src/transaction/entities/currency.entity';
import * as crypto from 'crypto';
import { ProviderCountryDto } from '../src/accounts/dto/provider-country.dto';

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

describe('GET /accounts/countries (e2e)', () => {
  let app: INestApplication;
  let providerRepo: Repository<PaymentProvider>;
  let currencyRepo: Repository<Currency>;
  let duplicateProviderId: string | null = null;

  class AllowAllAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      req.user = { user_id: 'test-user', role: UserRole.Creator };
      return true;
    }
  }

  beforeAll(async () => {
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

    providerRepo = app.get<Repository<PaymentProvider>>(
      getRepositoryToken(PaymentProvider),
    );
    currencyRepo = app.get<Repository<Currency>>(getRepositoryToken(Currency));

    const kes = await currencyRepo.findOne({ where: { shortCode: 'KES' } });
    if (!kes) {
      throw new Error('KES currency missing for accounts countries e2e test');
    }

    const duplicate = await providerRepo.save({
      name: `Duplicate Kenya Provider ${crypto.randomUUID()}`,
      country: 'Kenya',
      countryCode: 'KEN',
      currency: kes,
      supportsDecimals: true,
      code: `dup-ken-${crypto.randomUUID()}`,
      payoutDelay: 3,
    });
    duplicateProviderId = duplicate.id;
  });

  afterAll(async () => {
    if (duplicateProviderId) {
      await providerRepo.delete(duplicateProviderId);
    }
    await app.close();
  });

  it('returns unique, sorted country names from payment providers', async () => {
    const response = await request(app.getHttpServer())
      .get('/accounts/countries')
      .expect(200);

    const countries: unknown = response.body;
    expect(Array.isArray(countries)).toBe(true);

    const typedCountries = countries as ProviderCountryDto[];
    expect(typedCountries.length).toBeGreaterThan(0);
    for (const entry of typedCountries) {
      expect(typeof entry.country).toBe('string');
      expect(typeof entry.countryCode).toBe('string');
      expect(entry.countryCode).toHaveLength(3);
    }

    const uniqueKeys = typedCountries.map(
      (entry) => `${entry.country}|${entry.countryCode}`,
    );
    expect(new Set(uniqueKeys).size).toBe(typedCountries.length);
    const sorted = [...typedCountries].sort((a, b) => {
      const countryCompare = a.country.localeCompare(b.country);
      if (countryCompare !== 0) {
        return countryCompare;
      }
      return a.countryCode.localeCompare(b.countryCode);
    });
    expect(typedCountries).toEqual(sorted);

    const kenyaEntries = typedCountries.filter(
      (entry) => entry.country === 'Kenya' && entry.countryCode === 'KEN',
    );
    expect(kenyaEntries).toHaveLength(1);
  });
});
