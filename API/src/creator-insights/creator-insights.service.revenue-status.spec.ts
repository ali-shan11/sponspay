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
import { RevenueStatus } from '../transaction/entities/revenue-status.enum';

function makeCountriesQb(): any {
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
    getRawMany: jest.fn().mockResolvedValue([]),
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

function makeAccountQb(rows: any[]) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  } as any;
}

describe('CreatorInsightsService.getTransactions - Revenue Status (unit)', () => {
  let service: CreatorInsightsService;
  let txRepo: { createQueryBuilder: jest.Mock; update: jest.Mock };
  let accountRepo: { createQueryBuilder: jest.Mock };
  let userRepo: { findOne: jest.Mock };
  let telegramChannelRepo: { findOne: jest.Mock };
  let telegramService: { checkMessagesForAdminReplies: jest.Mock };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-02-01T00:00:00Z').getTime());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    txRepo = {
      createQueryBuilder: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    accountRepo = { createQueryBuilder: jest.fn() };
    userRepo = { findOne: jest.fn().mockResolvedValue({ id: 'uc1' }) };
    telegramChannelRepo = { findOne: jest.fn().mockResolvedValue(null) };
    telegramService = {
      checkMessagesForAdminReplies: jest.fn(),
    };

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
          useValue: telegramChannelRepo,
        },
        { provide: getRepositoryToken(LinkClick), useValue: {} },
        { provide: getRepositoryToken(Account), useValue: accountRepo },
        { provide: getRepositoryToken(Payout), useValue: {} },
        { provide: getRepositoryToken(Country), useValue: {} },
        { provide: TelegramService, useValue: telegramService },
        {
          provide: ExchangeRateService,
          useValue: { convertCurrency: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(CreatorInsightsService);
  });

  it('should batch check pending transactions for admin replies', async () => {
    const txRows = [
      {
        transactionId: 'tx-1',
        messageId: 'msg-100',
        revenueStatus: RevenueStatus.AwaitingReply,
        countryCode: 'KEN',
        providerName: 'Provider A',
        currencyCode: 'KES',
        amount: '100.00',
        usdEstimatedValue: '80.00',
        totalPayout: '90.00',
        createdAt: new Date('2024-01-20T00:00:00Z'),
        paidMessagesCount: '1',
      },
      {
        transactionId: 'tx-2',
        messageId: 'msg-200',
        revenueStatus: RevenueStatus.AwaitingReply,
        countryCode: 'TZA',
        providerName: 'Provider B',
        currencyCode: 'TZS',
        amount: '50.00',
        usdEstimatedValue: null,
        totalPayout: '45.00',
        createdAt: new Date('2024-01-25T00:00:00Z'),
        paidMessagesCount: '1',
      },
    ];

    const qbMocks = makeTxQb(txRows);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qbMocks.base)
      .mockReturnValueOnce(makeCountriesQb());
    accountRepo.createQueryBuilder.mockReturnValue(makeAccountQb([]));

    // Mock telegram channel lookup
    telegramChannelRepo.findOne.mockResolvedValue({
      channelHandle: 'testchannel',
    });

    // Mock Telegram service - msg-100 has reply, msg-200 doesn't
    const replyMap = new Map<string, boolean>();
    replyMap.set('msg-100', true);
    replyMap.set('msg-200', false);
    telegramService.checkMessagesForAdminReplies.mockResolvedValue(replyMap);

    const res = await service.getTransactions('uid', 'test-channel-uuid');

    // Verify batch check was called
    expect(telegramService.checkMessagesForAdminReplies).toHaveBeenCalledWith(
      'testchannel',
      ['msg-100', 'msg-200'],
    );

    // Verify database update for msg-100 (has reply)
    expect(txRepo.update).toHaveBeenCalledWith('tx-1', {
      revenueStatus: RevenueStatus.Earned,
    });

    // Verify msg-200 was not updated (no reply)
    expect(txRepo.update).not.toHaveBeenCalledWith('tx-2', expect.anything());

    // Verify response includes updated status
    expect(res.items[0]).toMatchObject({
      revenueStatus: RevenueStatus.Earned,
    });
    expect(res.items[1]).toMatchObject({
      revenueStatus: RevenueStatus.AwaitingReply,
    });
  });

  it('should skip batch check when all transactions are already earned', async () => {
    const txRows = [
      {
        transactionId: 'tx-1',
        messageId: 'msg-100',
        revenueStatus: RevenueStatus.Earned,
        countryCode: 'KEN',
        providerName: 'Provider A',
        currencyCode: 'KES',
        amount: '100.00',
        usdEstimatedValue: '80.00',
        totalPayout: '90.00',
        createdAt: new Date('2024-01-20T00:00:00Z'),
        paidMessagesCount: '1',
      },
    ];

    const qbMocks = makeTxQb(txRows);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qbMocks.base)
      .mockReturnValueOnce(makeCountriesQb());
    accountRepo.createQueryBuilder.mockReturnValue(makeAccountQb([]));

    await service.getTransactions('uid', 'test-channel-uuid');

    // Should not call Telegram service
    expect(telegramService.checkMessagesForAdminReplies).not.toHaveBeenCalled();
    expect(txRepo.update).not.toHaveBeenCalled();
  });

  it('should skip batch check when no messageId is present', async () => {
    const txRows = [
      {
        transactionId: 'tx-1',
        messageId: null,
        revenueStatus: RevenueStatus.AwaitingReply,
        countryCode: 'KEN',
        providerName: 'Provider A',
        currencyCode: 'KES',
        amount: '100.00',
        usdEstimatedValue: '80.00',
        totalPayout: '90.00',
        createdAt: new Date('2024-01-20T00:00:00Z'),
        paidMessagesCount: '1',
      },
    ];

    const qbMocks = makeTxQb(txRows);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qbMocks.base)
      .mockReturnValueOnce(makeCountriesQb());
    accountRepo.createQueryBuilder.mockReturnValue(makeAccountQb([]));

    await service.getTransactions('uid', 'test-channel-uuid');

    expect(telegramService.checkMessagesForAdminReplies).not.toHaveBeenCalled();
  });

  it('should skip batch check when user has no telegram channel', async () => {
    const txRows = [
      {
        transactionId: 'tx-1',
        messageId: 'msg-100',
        revenueStatus: RevenueStatus.AwaitingReply,
        countryCode: 'KEN',
        providerName: 'Provider A',
        currencyCode: 'KES',
        amount: '100.00',
        usdEstimatedValue: '80.00',
        totalPayout: '90.00',
        createdAt: new Date('2024-01-20T00:00:00Z'),
        paidMessagesCount: '1',
      },
    ];

    const qbMocks = makeTxQb(txRows);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qbMocks.base)
      .mockReturnValueOnce(makeCountriesQb());
    accountRepo.createQueryBuilder.mockReturnValue(makeAccountQb([]));

    // telegramChannelRepo.findOne returns null by default (no channel), so batch check is skipped

    await service.getTransactions('uid', 'test-channel-uuid');

    expect(telegramService.checkMessagesForAdminReplies).not.toHaveBeenCalled();
  });

  it('should handle Telegram service errors gracefully', async () => {
    const txRows = [
      {
        transactionId: 'tx-1',
        messageId: 'msg-100',
        revenueStatus: RevenueStatus.AwaitingReply,
        countryCode: 'KEN',
        providerName: 'Provider A',
        currencyCode: 'KES',
        amount: '100.00',
        usdEstimatedValue: '80.00',
        totalPayout: '90.00',
        createdAt: new Date('2024-01-20T00:00:00Z'),
        paidMessagesCount: '1',
      },
    ];

    const qbMocks = makeTxQb(txRows);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qbMocks.base)
      .mockReturnValueOnce(makeCountriesQb());
    accountRepo.createQueryBuilder.mockReturnValue(makeAccountQb([]));

    // Mock telegram channel lookup
    telegramChannelRepo.findOne.mockResolvedValue({
      channelHandle: 'testchannel',
    });

    // Mock Telegram service error
    telegramService.checkMessagesForAdminReplies.mockRejectedValue(
      new Error('Telegram API error'),
    );

    // Should not throw - error handled gracefully
    const res = await service.getTransactions('uid', 'test-channel-uuid');

    // Transaction should remain pending
    expect(res.items[0]).toMatchObject({
      revenueStatus: RevenueStatus.AwaitingReply,
    });

    // No database updates
    expect(txRepo.update).not.toHaveBeenCalled();
  });

  it('should only update transactions where hasReply is true', async () => {
    const txRows = [
      {
        transactionId: 'tx-1',
        messageId: 'msg-100',
        revenueStatus: RevenueStatus.AwaitingReply,
        countryCode: 'KEN',
        providerName: 'Provider A',
        currencyCode: 'KES',
        amount: '100.00',
        usdEstimatedValue: '80.00',
        totalPayout: '90.00',
        createdAt: new Date('2024-01-20T00:00:00Z'),
        paidMessagesCount: '1',
      },
      {
        transactionId: 'tx-2',
        messageId: 'msg-200',
        revenueStatus: RevenueStatus.AwaitingReply,
        countryCode: 'TZA',
        providerName: 'Provider B',
        currencyCode: 'TZS',
        amount: '50.00',
        usdEstimatedValue: null,
        totalPayout: '45.00',
        createdAt: new Date('2024-01-25T00:00:00Z'),
        paidMessagesCount: '1',
      },
      {
        transactionId: 'tx-3',
        messageId: 'msg-300',
        revenueStatus: RevenueStatus.AwaitingReply,
        countryCode: 'UGA',
        providerName: 'Provider C',
        currencyCode: 'UGX',
        amount: '30.00',
        usdEstimatedValue: null,
        totalPayout: '25.00',
        createdAt: new Date('2024-01-26T00:00:00Z'),
        paidMessagesCount: '1',
      },
    ];

    const qbMocks = makeTxQb(txRows);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qbMocks.base)
      .mockReturnValueOnce(makeCountriesQb());
    accountRepo.createQueryBuilder.mockReturnValue(makeAccountQb([]));

    // Mock telegram channel lookup
    telegramChannelRepo.findOne.mockResolvedValue({
      channelHandle: 'testchannel',
    });

    // Only msg-100 and msg-300 have replies
    const replyMap = new Map<string, boolean>();
    replyMap.set('msg-100', true);
    replyMap.set('msg-200', false);
    replyMap.set('msg-300', true);
    telegramService.checkMessagesForAdminReplies.mockResolvedValue(replyMap);

    await service.getTransactions('uid', 'test-channel-uuid');

    // Only tx-1 and tx-3 should be updated
    expect(txRepo.update).toHaveBeenCalledWith('tx-1', {
      revenueStatus: RevenueStatus.Earned,
    });
    expect(txRepo.update).toHaveBeenCalledWith('tx-3', {
      revenueStatus: RevenueStatus.Earned,
    });
    expect(txRepo.update).not.toHaveBeenCalledWith('tx-2', expect.anything());
  });

  it('should include revenueStatus in response for all transactions', async () => {
    const txRows = [
      {
        transactionId: 'tx-1',
        messageId: 'msg-100',
        revenueStatus: RevenueStatus.Earned,
        countryCode: 'KEN',
        providerName: 'Provider A',
        currencyCode: 'KES',
        amount: '100.00',
        usdEstimatedValue: '80.00',
        totalPayout: '90.00',
        createdAt: new Date('2024-01-20T00:00:00Z'),
        paidMessagesCount: '1',
      },
      {
        transactionId: 'tx-2',
        messageId: 'msg-200',
        revenueStatus: RevenueStatus.AwaitingReply,
        countryCode: 'TZA',
        providerName: 'Provider B',
        currencyCode: 'TZS',
        amount: '50.00',
        usdEstimatedValue: null,
        totalPayout: '45.00',
        createdAt: new Date('2024-01-25T00:00:00Z'),
        paidMessagesCount: '1',
      },
      {
        transactionId: 'tx-3',
        messageId: null,
        revenueStatus: RevenueStatus.AutoReplied,
        countryCode: 'UGA',
        providerName: 'Provider C',
        currencyCode: 'UGX',
        amount: '30.00',
        usdEstimatedValue: null,
        totalPayout: '25.00',
        createdAt: new Date('2024-01-26T00:00:00Z'),
        paidMessagesCount: '1',
      },
    ];

    const qbMocks = makeTxQb(txRows);
    txRepo.createQueryBuilder
      .mockReturnValueOnce(qbMocks.base)
      .mockReturnValueOnce(makeCountriesQb());
    accountRepo.createQueryBuilder.mockReturnValue(makeAccountQb([]));

    const res = await service.getTransactions('uid', 'test-channel-uuid');

    expect(res.items).toHaveLength(3);
    expect(res.items[0].revenueStatus).toBe(RevenueStatus.Earned);
    expect(res.items[1].revenueStatus).toBe(RevenueStatus.AwaitingReply);
    expect(res.items[2].revenueStatus).toBe(RevenueStatus.AutoReplied);
  });
});
