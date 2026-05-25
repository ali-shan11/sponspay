import { Test, TestingModule } from '@nestjs/testing';
import { CreatorInsightsService } from './creator-insights.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Transaction } from '../transaction/entities/transaction.entity';
import { UserChannel } from '../creator/entities/user-channel.entity';
import { TelegramChannel } from '../creator/entities/telegram-channel.entity';
import { LinkClick } from '../link-click/entities/link-click.entity';
import { Account } from '../accounts/entities/account.entity';
import { Payout } from '../transaction/entities/payout.entity';
import { Country } from '../transaction/entities/country.entity';
import { TelegramService } from '../telegram/telegram.service';
import { ExchangeRateService } from '../transaction/services/exchange-rate.service';
import { User } from '../creator/entities/user.entity';
import { UserRole } from '../creator/enums/user.enum';

function makeCountriesQb(
  countryRows: {
    countryCode: string;
    countryName: string;
    currencyCode: string;
  }[] = [],
): any {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(countryRows),
  };
}

function makeTxQb(rows: any[], totalCount = rows.length) {
  const base: any = {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };

  const countClone: any = {
    getCount: jest.fn().mockResolvedValue(totalCount),
    clone: jest.fn(),
  };

  const dataClone: any = {
    innerJoin: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
    clone: jest.fn(),
  };

  countClone.clone.mockReturnValue(countClone);
  dataClone.clone.mockReturnValue(dataClone);

  // Clone order: 1st clone → dataClone (data query built before Promise.all),
  // 2nd clone → countClone (getCount inside Promise.all)
  let cloneCalls = 0;
  base.clone = jest.fn(() => {
    cloneCalls += 1;
    return cloneCalls === 1 ? dataClone : countClone;
  });

  return { base, countClone, dataClone };
}

describe('CreatorInsightsService.getTransactions (unit)', () => {
  let service: CreatorInsightsService;
  let txRepo: { createQueryBuilder: jest.Mock };
  let userRepo: { findOne: jest.Mock };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-02-01T00:00:00Z').getTime());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    txRepo = { createQueryBuilder: jest.fn() };
    userRepo = { findOne: jest.fn().mockResolvedValue({ id: 'uc1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorInsightsService,
        { provide: getRepositoryToken(Transaction), useValue: txRepo },
        { provide: getRepositoryToken(UserChannel), useValue: userRepo },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue({ role: UserRole.Creator }),
          },
        },
        {
          provide: getRepositoryToken(TelegramChannel),
          useValue: { findOne: jest.fn().mockResolvedValue(null) },
        },
        { provide: getRepositoryToken(LinkClick), useValue: {} },
        { provide: getRepositoryToken(Account), useValue: {} },
        { provide: getRepositoryToken(Payout), useValue: {} },
        { provide: getRepositoryToken(Country), useValue: {} },
        { provide: TelegramService, useValue: {} },
        {
          provide: ExchangeRateService,
          useValue: { convertCurrency: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(CreatorInsightsService);
  });

  it('maps rows with new transaction response structure', async () => {
    const txRows = [
      {
        transactionId: 'tx1',
        messageId: '12345',
        messageContent: 'Great content!',
        revenueStatus: 'earned',
        countryCode: 'KEN',
        providerName: 'Provider A',
        currencyCode: 'KES',
        amount: '100.00',
        createdAt: new Date('2024-01-20T00:00:00Z'),
        referralSource: 'twitter',
        referralMedium: 'social',
      },
      {
        transactionId: 'tx2',
        messageId: '67890',
        messageContent: null,
        revenueStatus: 'awaiting-reply',
        countryCode: 'TZA',
        providerName: 'Provider B',
        currencyCode: 'TZS',
        amount: '50.00',
        createdAt: new Date('2024-01-25T00:00:00Z'),
        referralSource: null,
        referralMedium: null,
      },
    ];
    const qbMocks = makeTxQb(txRows);
    const countriesQb = makeCountriesQb([
      {
        countryCode: 'KEN',
        countryName: 'Republic of Kenya',
        currencyCode: 'KES',
      },
    ]);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qbMocks.base)
      .mockReturnValueOnce(countriesQb);

    const res = await service.getTransactions('uid', 'test-channel-uuid');
    expect(res.items).toHaveLength(2);
    expect(res.items[0]).toMatchObject({
      messageId: '12345',
      messageContent: 'Great content!',
      createdAt: '2024-01-20T00:00:00.000Z',
      country: 'KEN',
      countryCode: 'KEN',
      localAmount: 100,
      localCurrencyCode: 'KES',
      referralSource: 'twitter',
      referralMedium: 'social',
      revenueStatus: 'earned',
      replyDeadline: null, // earned status, no deadline
    });
    expect(res.items[1]).toMatchObject({
      messageId: '67890',
      messageContent: null,
      createdAt: '2024-01-25T00:00:00.000Z',
      country: 'TZA',
      countryCode: 'TZA',
      localAmount: 50,
      localCurrencyCode: 'TZS',
      referralSource: null,
      referralMedium: null,
      revenueStatus: 'awaiting-reply',
      replyDeadline: '2024-02-08T00:00:00.000Z', // awaiting-reply: createdAt + 14 days (Jan 25 + 14 = Feb 8)
    });
    expect(qbMocks.dataClone.limit).toHaveBeenCalledWith(20);
    expect(qbMocks.dataClone.offset).toHaveBeenCalledWith(0);
    expect(res.page).toBe(1);
    expect(res.limit).toBe(20);
    expect(res.totalRecords).toBe(2);
  });

  it('includes availableCountries grouped by country', async () => {
    const qbMocks = makeTxQb([]);
    const countriesQb = makeCountriesQb([
      {
        countryCode: 'KEN',
        countryName: 'Republic of Kenya',
        currencyCode: 'KES',
      },
      {
        countryCode: 'TZA',
        countryName: 'United Republic of Tanzania',
        currencyCode: 'TZS',
      },
    ]);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qbMocks.base)
      .mockReturnValueOnce(countriesQb);

    const res = await service.getTransactions('uid', 'test-channel-uuid');
    expect(res.availableCountries).toEqual([
      {
        countryCode: 'KEN',
        countryName: 'Republic of Kenya',
        currencies: ['KES'],
      },
      {
        countryCode: 'TZA',
        countryName: 'United Republic of Tanzania',
        currencies: ['TZS'],
      },
    ]);
  });

  it('groups multiple currencies under the same country', async () => {
    const qbMocks = makeTxQb([]);
    const countriesQb = makeCountriesQb([
      {
        countryCode: 'COD',
        countryName: 'Democratic Republic of the Congo',
        currencyCode: 'CDF',
      },
      {
        countryCode: 'COD',
        countryName: 'Democratic Republic of the Congo',
        currencyCode: 'USD',
      },
    ]);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qbMocks.base)
      .mockReturnValueOnce(countriesQb);

    const res = await service.getTransactions('uid', 'test-channel-uuid');
    expect(res.availableCountries).toEqual([
      {
        countryCode: 'COD',
        countryName: 'Democratic Republic of the Congo',
        currencies: ['CDF', 'USD'],
      },
    ]);
  });

  it('returns empty availableCountries when no transactions exist', async () => {
    const qbMocks = makeTxQb([]);
    const countriesQb = makeCountriesQb([]);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qbMocks.base)
      .mockReturnValueOnce(countriesQb);

    const res = await service.getTransactions('uid', 'test-channel-uuid');
    expect(res.availableCountries).toEqual([]);
  });
});
