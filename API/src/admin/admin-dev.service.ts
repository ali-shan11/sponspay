import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../creator/entities/user.entity';
import {
  UserChannel,
  UserChannelRole,
} from '../creator/entities/user-channel.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { Currency } from '../transaction/entities/currency.entity';
import { TransactionStatus } from '../transaction/entities/transaction-status.entity';
import { Account } from '../accounts/entities/account.entity';
import { ProviderCacheService } from '../pawapay/provider-cache.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AdminDevService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserChannel)
    private readonly userChannelRepo: Repository<UserChannel>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Currency)
    private readonly currencyRepo: Repository<Currency>,
    @InjectRepository(TransactionStatus)
    private readonly statusRepo: Repository<TransactionStatus>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    private readonly providerCacheService: ProviderCacheService,
  ) {}

  private assertNonProduction() {
    const env = this.configService.get<string>('NODE_ENV');
    if (env === 'production') {
      throw new ForbiddenException(
        'This endpoint is disabled in production environments.',
      );
    }
  }

  private randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randFloat(min: number, max: number, decimals = 2) {
    const v = Math.random() * (max - min) + min;
    return Number(v.toFixed(decimals));
  }

  // Approximate mapping for dev-only seeding realism
  private countryCurrencyMap: Record<
    string,
    { shortCode: string; name: string; usdRate: number }
  > = {
    Benin: {
      shortCode: 'XOF',
      name: 'West African CFA franc',
      usdRate: 0.0016,
    },
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
    Tanzania: {
      shortCode: 'TZS',
      name: 'Tanzanian shilling',
      usdRate: 0.00038,
    },
    Uganda: { shortCode: 'UGX', name: 'Ugandan shilling', usdRate: 0.00027 },
    Zambia: { shortCode: 'ZMW', name: 'Zambian kwacha', usdRate: 0.036 },
  };

  private currencyForCountry(country: string) {
    return (
      this.countryCurrencyMap[country] || {
        shortCode: 'USD',
        name: 'United States Dollar',
        usdRate: 1,
      }
    );
  }

  private async ensureCurrency(
    shortCode: string,
    name: string,
  ): Promise<Currency> {
    // First attempt to find existing by unique shortCode
    let c = await this.currencyRepo.findOne({ where: { shortCode } });
    if (!c) {
      // Concurrency-safe upsert by shortCode
      await this.currencyRepo.upsert(
        {
          shortCode,
          name,
          iso4217Numeric: shortCode === 'USD' ? 840 : null,
        } as any,
        ['shortCode'],
      );
      c = await this.currencyRepo.findOneOrFail({ where: { shortCode } });
    }

    // Ensure backfill of ISO code for USD if missing (idempotent)
    if ((c as any).iso4217Numeric == null && shortCode === 'USD') {
      (c as any).iso4217Numeric = 840;
      c = await this.currencyRepo.save(c);
    }

    return c;
  }

  private async ensureAccountsForCreator(
    creator: User,
    count: number = 3,
  ): Promise<number> {
    const allProviders = await this.providerCacheService.getProviders();
    if (allProviders.length === 0) {
      throw new NotFoundException(
        'No payment providers found from PawaPay API.',
      );
    }

    let created = 0;
    for (let i = 0; i < count; i++) {
      const provider = allProviders[this.randInt(0, allProviders.length - 1)];

      // Check if account with this provider already exists
      const existing = await this.accountRepo.findOne({
        where: {
          owner: { id: creator.id },
          providerName: provider.name,
          providerCountryCode: provider.countryCode,
        },
        relations: ['owner'],
      });

      if (existing) continue;

      const acc = this.accountRepo.create({
        owner: creator,
        phoneNumber: `+${this.randInt(100000000, 999999999)}`,
        providerName: provider.name,
        providerCountry: provider.country,
        providerCountryCode: provider.countryCode,
        currencyCode: provider.currency,
        fullName: 'Dev Account',
        isVerified: true,
        verifiedAt: new Date(),
      });
      await this.accountRepo.save(acc);
      created++;
    }
    return created;
  }

  async preSeedTransactions(firebaseUid: string) {
    this.assertNonProduction();

    const user = await this.userRepo.findOne({ where: { firebaseUid } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find all user's YouTube channels via UserChannel junction
    const userChannels = await this.userChannelRepo.find({
      where: { userId: user.id },
      relations: ['youtubeChannel'],
    });
    const youtubeChannels = userChannels
      .map((uc) => uc.youtubeChannel)
      .filter(Boolean);
    if (youtubeChannels.length === 0) {
      throw new NotFoundException(
        'User has no YouTube channels. Onboard as creator first.',
      );
    }

    const statusSucceeded = await this.statusRepo.findOne({
      where: { code: 'succeeded' },
    });
    if (!statusSucceeded) {
      throw new NotFoundException(
        'TransactionStatus "succeeded" not found. Seed statuses first.',
      );
    }

    const allProviders = await this.providerCacheService.getProviders();
    if (allProviders.length === 0) {
      throw new NotFoundException(
        'No payment providers found from PawaPay API.',
      );
    }

    // Filter providers to only include those with valid ISO 3166-1 alpha-3 country codes
    const validProviders = allProviders.filter(
      (provider) =>
        provider.countryCode && /^[A-Z]{3}$/.test(provider.countryCode),
    );

    if (validProviders.length === 0) {
      throw new NotFoundException(
        'No payment providers with valid country codes found.',
      );
    }

    const selectedProviders =
      validProviders.length <= 6 ? validProviders : validProviders.slice(0, 6);

    const accountsEnsured = await this.ensureAccountsForCreator(
      user,
      Math.min(3, selectedProviders.length),
    );
    const payerNames = Array.from(
      { length: 25 },
      () => `Payer ${randomUUID().slice(0, 8)}`,
    );

    const days = 45;
    const count = 500;
    const minUsd = 1;
    const maxUsd = 250;

    const now = new Date();
    const toInsert: Transaction[] = [];

    for (let i = 0; i < count; i++) {
      const daysAgo = this.randInt(0, Math.max(0, days - 1));
      const createdAt = new Date(now);
      createdAt.setDate(now.getDate() - daysAgo);
      createdAt.setHours(
        this.randInt(0, 23),
        this.randInt(0, 59),
        this.randInt(0, 59),
        0,
      );

      const provider =
        selectedProviders[
          this.randInt(0, Math.max(0, selectedProviders.length - 1))
        ];
      const curMeta = this.currencyForCountry(provider.country);
      const cur = await this.ensureCurrency(curMeta.shortCode, curMeta.name);
      const amountLocal = this.randFloat(minUsd, maxUsd, 2);
      const usdEstimatedValue = Number(
        (amountLocal * (curMeta.usdRate || 1)).toFixed(2),
      );

      // Round-robin across all user's channels
      const youtubeChannel = youtubeChannels[i % youtubeChannels.length];

      const t = this.txRepo.create({
        amount: amountLocal.toFixed(2),
        usdEstimatedValue: usdEstimatedValue.toFixed(2),
        currency: cur,
        messageId: randomUUID().slice(0, 12),
        youtubeChannel,
        payerFullName:
          payerNames[this.randInt(0, Math.max(0, payerNames.length - 1))],
        payerPhone: `+${this.randInt(100000000, 999999999)}`,
        providerName: provider.name,
        providerCountryCode: provider.countryCode,
        status: statusSucceeded,
        payout: null,
        createdAt,
      });
      toInsert.push(t);
    }

    await this.txRepo.save(toInsert);

    return {
      firebaseUid,
      userId: user.id,
      transactionsCreated: toInsert.length,
      providersUsed: selectedProviders.length,
      accountsEnsured,
    };
  }

  async resetUser(firebaseUid: string) {
    this.assertNonProduction();

    const user = await this.userRepo.findOne({ where: { firebaseUid } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const userId = user.id;

    // Delete transactions for channels owned by this user (not channels they manage)
    const userChannels = await this.userChannelRepo.find({
      where: { userId, role: UserChannelRole.Owner },
    });
    const channelIds = userChannels.map((uc) => uc.youtubeChannelId);

    let deleteTxAffected = 0;
    if (channelIds.length > 0) {
      const deleteTxRes = await this.txRepo
        .createQueryBuilder()
        .delete()
        .where('"youtubeChannelId" IN (:...channelIds)', { channelIds })
        .execute();
      deleteTxAffected = deleteTxRes.affected ?? 0;
    }

    // Delete accounts owned by this user
    const deleteAccRes = await this.accountRepo
      .createQueryBuilder()
      .delete()
      .where('"ownerId" = :userId', { userId })
      .execute();

    return {
      firebaseUid,
      userId,
      transactionsDeleted: deleteTxAffected,
      accountsDeleted: deleteAccRes.affected ?? 0,
    };
  }
}
