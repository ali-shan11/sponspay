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

function makePayoutQb(rows: any[]) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  } as any;
}

describe('CreatorInsightsService.getPayouts (unit)', () => {
  let service: CreatorInsightsService;
  let payoutRepo: { createQueryBuilder: jest.Mock };
  let userRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    payoutRepo = { createQueryBuilder: jest.fn() };
    userRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorInsightsService,
        { provide: getRepositoryToken(Transaction), useValue: {} },
        {
          provide: getRepositoryToken(UserChannel),
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 'u1' }) },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue({ role: UserRole.Creator }),
          },
        },
        { provide: getRepositoryToken(TelegramChannel), useValue: {} },
        { provide: getRepositoryToken(LinkClick), useValue: {} },
        { provide: getRepositoryToken(Account), useValue: {} },
        { provide: getRepositoryToken(Payout), useValue: payoutRepo },
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

  it('maps rows and applies pagination', async () => {
    const rows = [
      {
        transactionId: 'tx1',
        beneficiaryPhone: '+111',
        paymentProvider: 'M-Pesa',
        amount: '100.00',
        usdEstimatedValue: '9.25',
        statusId: 's1',
        invoiceId: null,
        initiatedAt: new Date('2024-01-30T00:00:00Z'),
      },
    ];
    userRepo.findOne.mockResolvedValue({ id: 'user1', firebaseUid: 'uid' });
    payoutRepo.createQueryBuilder.mockReturnValue(makePayoutQb(rows));

    // Note: The service only supports countryCode filtering now, not country name
    const res = await service.getPayouts(
      'uid',
      'test-channel-uuid',
      undefined,
      'KEN',
    );
    expect(res.items).toHaveLength(1);
    expect(res.items[0]).toMatchObject({
      transactionId: 'tx1',
      beneficiaryPhone: '+111',
      paymentProvider: 'M-Pesa',
      amount: 100,
      usdEstimatedValue: 9.25,
      statusId: 's1',
      invoiceId: null,
      initiatedAt: '2024-01-30T00:00:00.000Z',
    });
    const qbInstance = payoutRepo.createQueryBuilder.mock.results[0]
      .value as any;
    expect(qbInstance.andWhere).toHaveBeenCalledWith(
      'p.providerCountryCode = :countryCode',
      { countryCode: 'KEN' },
    );
    expect(qbInstance.limit).toHaveBeenCalledWith(20);
    expect(qbInstance.offset).toHaveBeenCalledWith(0);
    expect(res.page).toBe(1);
    expect(res.limit).toBe(20);
  });

  it('filters by countryCode when provided', async () => {
    const rows: any[] = [];
    userRepo.findOne.mockResolvedValue({ id: 'user1', firebaseUid: 'uid' });
    payoutRepo.createQueryBuilder.mockReturnValue(makePayoutQb(rows));
    await service.getPayouts('uid', 'test-channel-uuid', undefined, 'KE');
    const qbInstance = payoutRepo.createQueryBuilder.mock.results[0]
      .value as any;
    expect(qbInstance.andWhere).toHaveBeenCalledWith(
      'p.providerCountryCode = :countryCode',
      { countryCode: 'KE' },
    );
  });
});
