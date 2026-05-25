import { INestApplicationContext, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../creator/entities/user.entity';
import { UserChannel } from '../../creator/entities/user-channel.entity';
import { UserRole } from '../../creator/enums/user.enum';
import { Transaction } from '../entities/transaction.entity';
import { Currency } from '../entities/currency.entity';
import { TransactionStatus } from '../entities/transaction-status.entity';
import { Account } from '../../accounts/entities/account.entity';
import { ProviderCacheService } from '../../pawapay/provider-cache.service';
import { Provider } from '../../pawapay/interfaces/provider.interface';
import { randomUUID } from 'crypto';

type SeedOptions = {
  creatorUid: string;
  days: number;
  count: number;
  minUsd: number;
  maxUsd: number;
};

function parseArgs(): SeedOptions {
  const argv = process.argv.slice(2);
  const get = (key: string, def?: string) => {
    const found = argv.find((a) => a.startsWith(`--${key}=`));
    return found ? found.split('=')[1] : def;
  };
  const creatorUid =
    get('creatorUid') ||
    process.env.CREATOR_FIREBASE_UID ||
    'YD60U0B8gCcvoujlslaIY5PpQJJ2';
  const days = Number(get('days', '45'));
  const count = Number(get('count', '500'));
  const minUsd = Number(get('minUsd', '1'));
  const maxUsd = Number(get('maxUsd', '250'));

  if (!creatorUid) {
    throw new Error(
      'Missing required creatorUid. Pass --creatorUid=FIREBASE_UID or set CREATOR_FIREBASE_UID.',
    );
  }
  return { creatorUid, days, count, minUsd, maxUsd };
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2) {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

// Map provider country to currency metadata (approximate USD conversion rates for seeding)
const countryCurrencyMap: Record<
  string,
  { shortCode: string; name: string; usdRate: number }
> = {
  // WAEMU (XOF)
  Benin: { shortCode: 'XOF', name: 'West African CFA franc', usdRate: 0.0016 },
  'Burkina Faso': {
    shortCode: 'XOF',
    name: 'West African CFA franc',
    usdRate: 0.0016,
  },
  'The Ivory Coast': {
    shortCode: 'XOF',
    name: 'West African CFA franc',
    usdRate: 0.0016,
  },
  Mali: { shortCode: 'XOF', name: 'West African CFA franc', usdRate: 0.0016 },
  Senegal: {
    shortCode: 'XOF',
    name: 'West African CFA franc',
    usdRate: 0.0016,
  },
  'Guinea Bissau': {
    shortCode: 'XOF',
    name: 'West African CFA franc',
    usdRate: 0.0016,
  },
  // CEMAC (XAF)
  Cameroon: {
    shortCode: 'XAF',
    name: 'Central African CFA franc',
    usdRate: 0.0016,
  },
  'Congo Brazzaville': {
    shortCode: 'XAF',
    name: 'Central African CFA franc',
    usdRate: 0.0016,
  },
  // Country specific
  'The Democratic Republic of Congo': {
    shortCode: 'CDF',
    name: 'Congolese franc',
    usdRate: 0.00036,
  },
  Ghana: { shortCode: 'GHS', name: 'Ghanaian cedi', usdRate: 0.073 },
  'Guinea Conakry': {
    shortCode: 'GNF',
    name: 'Guinean franc',
    usdRate: 0.00012,
  },
  Kenya: { shortCode: 'KES', name: 'Kenyan shilling', usdRate: 0.0076 },
  Lesotho: { shortCode: 'LSL', name: 'Lesotho loti', usdRate: 0.056 },
  Malawi: { shortCode: 'MWK', name: 'Malawian kwacha', usdRate: 0.00059 },
  Nigeria: { shortCode: 'NGN', name: 'Nigerian naira', usdRate: 0.00068 },
  Rwanda: { shortCode: 'RWF', name: 'Rwandan franc', usdRate: 0.00079 },
  'Sierra Leone': {
    shortCode: 'SLE',
    name: 'Sierra Leonean leone',
    usdRate: 0.05,
  },
  'South Africa': {
    shortCode: 'ZAR',
    name: 'South African rand',
    usdRate: 0.056,
  },
  Tanzania: { shortCode: 'TZS', name: 'Tanzanian shilling', usdRate: 0.00038 },
  Uganda: { shortCode: 'UGX', name: 'Ugandan shilling', usdRate: 0.00027 },
  Zambia: { shortCode: 'ZMW', name: 'Zambian kwacha', usdRate: 0.036 },
};

function currencyForCountry(country: string) {
  return (
    countryCurrencyMap[country] || {
      shortCode: 'USD',
      name: 'United States Dollar',
      usdRate: 1,
    }
  );
}

async function ensureAccountsForCreator(
  repo: Repository<Account>,
  creator: User,
  providers: Provider[],
): Promise<Account[]> {
  const created: Account[] = [];
  for (const p of providers) {
    const existing = await repo.findOne({
      where: {
        owner: { id: creator.id },
        providerName: p.name,
        providerCountryCode: p.countryCode,
      },
      relations: ['owner'],
    });
    if (existing) {
      created.push(existing);
      continue;
    }
    const acc = repo.create({
      owner: creator,
      phoneNumber: `+${randInt(100000000, 999999999)}`,
      providerName: p.name,
      providerCountry: p.country,
      providerCountryCode: p.countryCode,
      currencyCode: p.currency,
      fullName: 'Seed Account',
      isVerified: true,
      verifiedAt: new Date(),
    });
    created.push(await repo.save(acc));
  }
  return created;
}

async function ensureCurrency(
  repo: Repository<Currency>,
  shortCode: string,
  name: string,
): Promise<Currency> {
  let c = await repo.findOne({ where: { shortCode } });
  if (!c) {
    c = repo.create({
      shortCode,
      name,
      iso4217Numeric: shortCode === 'USD' ? 840 : null,
    });
    c = await repo.save(c);
  } else {
    // Backfill ISO 4217 numeric if missing
    if ((c as any).iso4217Numeric == null && shortCode === 'USD') {
      (c as any).iso4217Numeric = 840;
      c = await repo.save(c);
    }
  }
  return c;
}

async function ensureUser(
  repo: Repository<User>,
  firebaseUid: string,
  role: UserRole,
): Promise<User> {
  let u = await repo.findOne({ where: { firebaseUid } });
  if (!u) {
    u = repo.create({ firebaseUid, role });
    u = await repo.save(u);
  } else if (u.role !== role && role === UserRole.Creator) {
    // preserve admin or upgrade fan - do not downgrade admin
    if (u.role !== UserRole.Admin) {
      u.role = UserRole.Creator;
      u = await repo.save(u);
    }
  }
  return u;
}

async function run() {
  const logger = new Logger('DevTransactionsSeeder');
  const opts = parseArgs();

  const app: INestApplicationContext =
    await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'error', 'warn'],
    });

  try {
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const txRepo = app.get<Repository<Transaction>>(
      getRepositoryToken(Transaction),
    );
    const currRepo = app.get<Repository<Currency>>(
      getRepositoryToken(Currency),
    );
    const statusRepo = app.get<Repository<TransactionStatus>>(
      getRepositoryToken(TransactionStatus),
    );
    const accountRepo = app.get<Repository<Account>>(
      getRepositoryToken(Account),
    );
    const providerCacheService =
      app.get<ProviderCacheService>(ProviderCacheService);

    const userChannelRepo = app.get<Repository<UserChannel>>(
      getRepositoryToken(UserChannel),
    );

    const beneficiary = await ensureUser(
      userRepo,
      opts.creatorUid,
      UserRole.Creator,
    );

    // Find all user's YouTube channels via UserChannel junction
    const userChannels = await userChannelRepo.find({
      where: { userId: beneficiary.id },
      relations: ['youtubeChannel'],
    });
    const youtubeChannels = userChannels
      .map((uc) => uc.youtubeChannel)
      .filter(Boolean);
    if (youtubeChannels.length === 0) {
      throw new Error(
        'User has no YouTube channels. Onboard as creator first before seeding transactions.',
      );
    }

    // Use a subset of available providers to simulate multiple accounts
    const allProviders = await providerCacheService.getProviders();
    if (allProviders.length === 0) {
      throw new Error('No payment providers found from PawaPay API.');
    }
    // Pick up to 6 providers to simulate multiple accounts across providers
    const selectedProviders =
      allProviders.length <= 6 ? allProviders : allProviders.slice(0, 6);

    // Ensure creator has one account per selected provider
    await ensureAccountsForCreator(accountRepo, beneficiary, selectedProviders);

    const succeeded = await statusRepo.findOne({
      where: { code: 'succeeded' },
    });
    if (!succeeded) {
      throw new Error(
        'TransactionStatus "succeeded" not found. Ensure TransactionStatusSeeder runs or seed statuses first.',
      );
    }

    const now = new Date();
    const toInsert: Transaction[] = [];

    for (let i = 0; i < opts.count; i++) {
      const daysAgo = randInt(0, Math.max(0, opts.days - 1));
      const createdAt = new Date(now);
      createdAt.setDate(now.getDate() - daysAgo);
      // scatter time within day
      createdAt.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59), 0);

      // Choose a provider and currency for this transaction
      const provider =
        selectedProviders[
          randInt(0, Math.max(0, selectedProviders.length - 1))
        ];
      const curMeta = currencyForCountry(provider.country);
      const cur = await ensureCurrency(
        currRepo,
        curMeta.shortCode,
        curMeta.name,
      );
      // Local amount and rough USD estimate
      const amountLocal = randFloat(opts.minUsd, opts.maxUsd, 2);
      const usdEstimatedValue = Number(
        (amountLocal * (curMeta.usdRate || 1)).toFixed(2),
      );

      // Round-robin across all user's channels
      const youtubeChannel = youtubeChannels[i % youtubeChannels.length];

      const t = txRepo.create({
        amount: amountLocal.toFixed(2),
        usdEstimatedValue: usdEstimatedValue.toFixed(2),
        currency: cur,
        messageId: randomUUID().slice(0, 12),
        youtubeChannel,
        payerFullName: `Payer ${randomUUID().slice(0, 8)}`,
        payerPhone: `+${randInt(100000000, 999999999)}`,
        providerName: provider.name,
        providerCountryCode: provider.countryCode,
        status: succeeded,
        payout: null,
        createdAt,
        // updatedAt will auto-populate
      });
      toInsert.push(t);
    }

    await txRepo.save(toInsert);
    logger.log(
      `Seeded ${toInsert.length} transactions for creator firebaseUid=${opts.creatorUid} over last ${opts.days} days.`,
    );
  } catch (e: any) {
    logger.error(
      'Seeding dev transactions failed',
      e?.stack || e?.message || e,
    );
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run();
