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

function makeAggQb(row: any) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(row),
  } as any;
}

function makeUnpaidQb(rows: any[]) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  } as any;
}

describe('CreatorInsightsService.getAccountStatistics', () => {
  let service: CreatorInsightsService;
  let txRepo: { createQueryBuilder: jest.Mock };
  let accountRepo: { findOne: jest.Mock };
  let exchangeRateService: { convertCurrency: jest.Mock };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-02-01T00:00:00Z').getTime());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    txRepo = { createQueryBuilder: jest.fn() };
    accountRepo = { findOne: jest.fn() };
    exchangeRateService = {
      convertCurrency: jest.fn().mockResolvedValue({ conversion_rate: 0.8 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorInsightsService,
        { provide: getRepositoryToken(Transaction), useValue: txRepo },
        {
          provide: getRepositoryToken(UserChannel),
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 'uc1' }) },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue({ role: UserRole.Creator }),
          },
        },
        { provide: getRepositoryToken(TelegramChannel), useValue: {} },
        { provide: getRepositoryToken(LinkClick), useValue: {} },
        { provide: getRepositoryToken(Account), useValue: accountRepo },
        { provide: getRepositoryToken(Payout), useValue: {} },
        { provide: getRepositoryToken(Country), useValue: {} },
        { provide: TelegramService, useValue: {} },
        { provide: ExchangeRateService, useValue: exchangeRateService },
      ],
    }).compile();

    service = module.get(CreatorInsightsService);
  });

  it('computes aggregated stats with live exchange rate conversion', async () => {
    accountRepo.findOne.mockResolvedValue({
      id: 'acc1',
      phoneNumber: '+123',
      providerName: 'MTN_MOMO_KEN',
      providerCountry: 'Kenya',
      providerCountryCode: 'KEN',
      owner: { firebaseUid: 'uid' },
    });
    // Rate: 0.8 USD per local unit
    const aggRow = {
      totalLocal: '300',
      currencyCode: 'KES',
      msgCount: '3',
      totalFees: '30',
      livestreamLocal: '100',
      videoLocal: '200',
      uniqueStreams: '1',
    };
    const unpaidRows = [
      {
        createdAt: new Date('2024-01-01T00:00:00Z'),
        totalPayout: '50',
      },
      {
        createdAt: new Date('2024-01-02T00:00:00Z'),
        totalPayout: '30',
      },
      {
        createdAt: new Date('2024-01-01T00:00:00Z'),
        totalPayout: '20',
      },
    ];
    txRepo.createQueryBuilder
      .mockReturnValueOnce(makeAggQb(aggRow))
      .mockReturnValueOnce(makeUnpaidQb(unpaidRows));

    const res = await service.getAccountStatistics(
      'uid',
      'test-channel-uuid',
      'acc1',
      undefined,
      undefined,
      30,
    );

    expect(exchangeRateService.convertCurrency).toHaveBeenCalledWith(
      'KES',
      'USD',
    );
    expect(res).toEqual({
      localCurrencyCode: 'KES',
      totalLocal: 300,
      totalUsd: 240, // 300 * 0.8
      nextPayAmountLocal: 70, // 50 + 20 (same date 2024-01-01)
      nextPayAmountUsd: 56, // 70 * 0.8
      nextPayDate: '2024-01-08', // 2024-01-01 + 7 days
      premiumMessages: 3,
      mobileNumber: '+123',
      livestreamTotalLocal: 100,
      livestreamTotalUsd: 80, // 100 * 0.8
      videoTotalLocal: 200,
      videoTotalUsd: 160, // 200 * 0.8
      uniqueLivestreams: 1,
      averageMessageValue: 100,
      totalFees: 30,
      averageFee: 10,
    });
  });

  it('returns zero USD when exchange rate fetch fails', async () => {
    accountRepo.findOne.mockResolvedValue({
      id: 'acc1',
      phoneNumber: '+123',
      providerName: 'MTN_MOMO_KEN',
      providerCountryCode: 'KEN',
      owner: { firebaseUid: 'uid' },
    });
    exchangeRateService.convertCurrency.mockRejectedValue(
      new Error('API down'),
    );

    const aggRow = {
      totalLocal: '100',
      currencyCode: 'KES',
      msgCount: '1',
      totalFees: '5',
      livestreamLocal: '0',
      videoLocal: '100',
      uniqueStreams: '0',
    };
    txRepo.createQueryBuilder
      .mockReturnValueOnce(makeAggQb(aggRow))
      .mockReturnValueOnce(makeUnpaidQb([]));

    const res = await service.getAccountStatistics(
      'uid',
      'test-channel-uuid',
      'acc1',
      undefined,
      undefined,
      30,
    );

    expect(res.totalLocal).toBe(100);
    expect(res.totalUsd).toBe(0); // rate failed, so 0
    expect(res.videoTotalUsd).toBe(0);
  });
});
