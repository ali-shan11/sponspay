import { Test, TestingModule } from '@nestjs/testing';
import { CreatorInsightsController } from './creator-insights.controller';
import { CreatorInsightsService } from './creator-insights.service';
import { BadRequestException } from '@nestjs/common';
import { RevenuePerDayQueryDto } from './dto/revenue-per-day.query.dto';
import { TransactionsQueryDto } from './dto/transactions.query.dto';
import { AccountStatisticsQueryDto } from './dto/account-statistics.query.dto';
import { PayoutsQueryDto } from './dto/payouts.query.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('CreatorInsightsController', () => {
  let controller: CreatorInsightsController;
  const service = {
    getRevenuePerDay: jest.fn(),
    getTransactions: jest.fn(),
    getAccountStatistics: jest.fn(),
    getPaymentOverview: jest.fn(),
    getPayouts: jest.fn(),
  } as unknown as CreatorInsightsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreatorInsightsController],
      providers: [{ provide: CreatorInsightsService, useValue: service }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CreatorInsightsController);
    jest.clearAllMocks();
  });

  it('throws BadRequest when missing firebase user', async () => {
    await expect(
      controller.getRevenuePerDay(
        { user: undefined },
        { channelId: 'test-channel-uuid' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.getRevenuePerDay).not.toHaveBeenCalled();
  });

  it('uses defaults when query params are not provided', async () => {
    (service.getRevenuePerDay as jest.Mock).mockResolvedValue({
      days: 30,
      timezoneOffsetMinutes: 0,
      startDate: '2025-08-01',
      endDate: '2025-08-30',
      series: [],
      totalRevenueUsd: 0,
      trendPercentage: 0,
    });

    const res = await controller.getRevenuePerDay(
      { user: { user_id: 'uid123' } as any },
      { channelId: 'test-channel-uuid' },
    );

    expect(service.getRevenuePerDay).toHaveBeenCalledWith(
      'uid123',
      'test-channel-uuid',
      30,
      0,
    );
    expect(res.days).toBe(30);
    expect(res.timezoneOffsetMinutes).toBe(0);
  });

  it('forwards query values to service', async () => {
    (service.getRevenuePerDay as jest.Mock).mockResolvedValue({
      days: 7,
      timezoneOffsetMinutes: -240,
      startDate: '2025-08-24',
      endDate: '2025-08-30',
      series: [],
      totalRevenueUsd: 0,
      trendPercentage: 0,
    });

    const query: RevenuePerDayQueryDto = {
      channelId: 'test-channel-uuid',
      days: 7,
      tzOffsetMinutes: -240,
    };
    const res = await controller.getRevenuePerDay(
      { user: { user_id: 'abc' } as any },
      query,
    );

    expect(service.getRevenuePerDay).toHaveBeenCalledWith(
      'abc',
      'test-channel-uuid',
      7,
      -240,
    );
    expect(res.days).toBe(7);
    expect(res.timezoneOffsetMinutes).toBe(-240);
  });

  it('getTransactions throws BadRequest when missing firebase user', async () => {
    await expect(
      controller.getTransactions(
        { user: undefined },
        { channelId: 'test-channel-uuid' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.getTransactions).not.toHaveBeenCalled();
  });

  it('getTransactions uses defaults when query params are not provided', async () => {
    (service.getTransactions as jest.Mock).mockResolvedValue({
      startDate: '2025-08-01',
      endDate: '2025-08-30',
      page: 1,
      limit: 20,
      items: [],
      totalRecords: 0,
    });

    const res = await controller.getTransactions(
      { user: { user_id: 'uid123' } as any },
      { channelId: 'test-channel-uuid' },
    );

    expect(service.getTransactions).toHaveBeenCalledWith(
      'uid123',
      'test-channel-uuid',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'createdAt',
      'desc',
      1,
      20,
      undefined,
    );
    expect(res.startDate).toBe('2025-08-01');
    expect(res.endDate).toBe('2025-08-30');
    expect(res.page).toBe(1);
    expect(res.limit).toBe(20);
  });

  it('getTransactions forwards query values to service', async () => {
    (service.getTransactions as jest.Mock).mockResolvedValue({
      startDate: '2025-08-21',
      endDate: '2025-08-30',
      page: 2,
      limit: 5,
      items: [],
      totalRecords: 0,
    });
    const query: TransactionsQueryDto = {
      channelId: 'test-channel-uuid',
      startDate: '2025-08-21',
      endDate: '2025-08-30',
      page: 2,
      limit: 5,
    };
    const res = await controller.getTransactions(
      { user: { user_id: 'abc' } as any },
      query,
    );
    expect(service.getTransactions).toHaveBeenCalledWith(
      'abc',
      'test-channel-uuid',
      '2025-08-21',
      '2025-08-30',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'createdAt',
      'desc',
      2,
      5,
      undefined,
    );
    expect(res.startDate).toBe('2025-08-21');
    expect(res.endDate).toBe('2025-08-30');
    expect(res.page).toBe(2);
    expect(res.limit).toBe(5);
  });

  it('getAccountStatistics throws BadRequest when missing firebase user', async () => {
    await expect(
      controller.getAccountStatistics({ user: undefined }, {
        channelId: 'test-channel-uuid',
        accountId: 'acc1',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.getAccountStatistics).not.toHaveBeenCalled();
  });

  it('getAccountStatistics uses defaults when query params are not provided', async () => {
    (service.getAccountStatistics as jest.Mock).mockResolvedValue({});
    await controller.getAccountStatistics(
      { user: { user_id: 'uid123' } as any },
      { channelId: 'test-channel-uuid', accountId: 'acc1' },
    );
    expect(service.getAccountStatistics).toHaveBeenCalledWith(
      'uid123',
      'test-channel-uuid',
      'acc1',
      undefined,
      undefined,
      30,
    );
  });

  it('getAccountStatistics forwards query values to service', async () => {
    (service.getAccountStatistics as jest.Mock).mockResolvedValue({});
    const query: AccountStatisticsQueryDto = {
      channelId: 'test-channel-uuid',
      accountId: 'acc2',
      country: 'GH',
      countryCode: 'GHA',
      days: 10,
    };
    await controller.getAccountStatistics(
      { user: { user_id: 'abc' } as any },
      query,
    );
    expect(service.getAccountStatistics).toHaveBeenCalledWith(
      'abc',
      'test-channel-uuid',
      'acc2',
      'GH',
      'GHA',
      10,
    );
  });

  it('getPaymentOverview throws BadRequest when missing firebase user', async () => {
    await expect(
      controller.getPaymentOverview({ user: undefined }, {
        channelId: 'test-channel-uuid',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.getPaymentOverview).not.toHaveBeenCalled();
  });

  it('getPaymentOverview forwards query values to service', async () => {
    (service.getPaymentOverview as jest.Mock).mockResolvedValue({
      days: 7,
      items: [],
    });
    await controller.getPaymentOverview(
      { user: { user_id: 'uid123' } as any },
      { channelId: 'test-channel-uuid', days: 7 },
    );
    expect(service.getPaymentOverview).toHaveBeenCalledWith(
      'uid123',
      'test-channel-uuid',
      7,
    );
  });

  it('getPayouts throws BadRequest when missing firebase user', async () => {
    await expect(
      controller.getPayouts({ user: undefined }, {
        channelId: 'test-channel-uuid',
        country: 'Kenya',
      } as PayoutsQueryDto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.getPayouts).not.toHaveBeenCalled();
  });

  it('getPayouts uses defaults when query params are not provided', async () => {
    (service.getPayouts as jest.Mock).mockResolvedValue({
      page: 1,
      limit: 20,
      items: [],
    });
    const res = await controller.getPayouts(
      { user: { user_id: 'uid123' } as any },
      { channelId: 'test-channel-uuid', country: 'Kenya' },
    );
    expect(service.getPayouts).toHaveBeenCalledWith(
      'uid123',
      'test-channel-uuid',
      'Kenya',
      undefined,
      1,
      20,
      undefined,
      'desc',
    );
    expect(res.page).toBe(1);
    expect(res.limit).toBe(20);
  });

  it('getPayouts forwards query values to service', async () => {
    (service.getPayouts as jest.Mock).mockResolvedValue({
      page: 2,
      limit: 5,
      items: [],
    });
    const query: PayoutsQueryDto = {
      channelId: 'test-channel-uuid',
      country: 'Kenya',
      page: 2,
      limit: 5,
      search: '123',
      sort: 'asc',
    };
    const res = await controller.getPayouts(
      { user: { user_id: 'abc' } as any },
      query,
    );
    expect(service.getPayouts).toHaveBeenCalledWith(
      'abc',
      'test-channel-uuid',
      'Kenya',
      undefined,
      2,
      5,
      '123',
      'asc',
    );
    expect(res.page).toBe(2);
    expect(res.limit).toBe(5);
  });

  it('getPayouts accepts countryCode', async () => {
    (service.getPayouts as jest.Mock).mockResolvedValue({
      page: 1,
      limit: 20,
      items: [],
    });
    await controller.getPayouts({ user: { user_id: 'u1' } as any }, {
      channelId: 'test-channel-uuid',
      countryCode: 'KE',
    } as PayoutsQueryDto);
    expect(service.getPayouts).toHaveBeenCalledWith(
      'u1',
      'test-channel-uuid',
      undefined,
      'KE',
      1,
      20,
      undefined,
      'desc',
    );
  });
});
