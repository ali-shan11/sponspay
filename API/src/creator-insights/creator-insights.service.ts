import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between, IsNull, In } from 'typeorm';
import { Transaction } from '../transaction/entities/transaction.entity';
import { TelegramChannel } from '../creator/entities/telegram-channel.entity';
import { UserChannel } from '../creator/entities/user-channel.entity';
import { User } from '../creator/entities/user.entity';
import { UserRole } from '../creator/enums/user.enum';
import { LinkClick } from '../link-click/entities/link-click.entity';
import { Account } from '../accounts/entities/account.entity';
import { Payout } from '../transaction/entities/payout.entity';
import { Country } from '../transaction/entities/country.entity';
import {
  addDays,
  addMinutes,
  formatISO,
  startOfDay,
  subDays,
  subMinutes,
} from 'date-fns';
import { UserChannelRole } from '../creator/entities/user-channel.entity';
import { TelegramService } from '../telegram/telegram.service';
import { RevenueStatus } from '../transaction/entities/revenue-status.enum';
import { ExchangeRateService } from '../transaction/services/exchange-rate.service';

type RevenueRow = {
  day: string; // ISO date string returned by Postgres (timestamp without tz)
  revenue: string; // numeric as string (local currency amount)
  currencyCode: string; // ISO 4217 currency code
};

@Injectable()
export class CreatorInsightsService {
  private readonly logger = new Logger(CreatorInsightsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TelegramChannel)
    private readonly telegramChannelRepo: Repository<TelegramChannel>,
    @InjectRepository(LinkClick)
    private readonly linkClickRepo: Repository<LinkClick>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Payout)
    private readonly payoutRepo: Repository<Payout>,
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
    @InjectRepository(UserChannel)
    private readonly userChannelRepo: Repository<UserChannel>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly telegramService: TelegramService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  /**
   * Validates that the authenticated user has access to the given channel.
   * Admin users bypass the check and can access any channel.
   * Throws ForbiddenException if user has no UserChannel record for this channel.
   */
  async validateChannelAccess(
    firebaseUid: string,
    channelId: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { firebaseUid },
      select: { role: true },
    });
    if (user?.role === UserRole.Admin) {
      return;
    }

    const userChannel = await this.userChannelRepo.findOne({
      where: {
        youtubeChannelId: channelId,
        user: { firebaseUid },
      },
    });
    if (!userChannel) {
      throw new ForbiddenException('You do not have access to this channel');
    }
  }

  /**
   * Resolves the effective firebaseUid for data queries.
   * For Admin users viewing another creator's channel, returns the channel owner's UID.
   * For regular users, returns their own UID.
   */
  private async resolveOwnerUid(
    firebaseUid: string,
    channelId: string,
  ): Promise<string> {
    const user = await this.userRepo.findOne({
      where: { firebaseUid },
      select: { role: true },
    });

    if (user?.role === UserRole.Admin) {
      const ownerChannel = await this.userChannelRepo.findOne({
        where: {
          youtubeChannelId: channelId,
          role: UserChannelRole.Owner,
        },
        relations: ['user'],
      });
      if (ownerChannel) {
        return ownerChannel.user.firebaseUid;
      }
    }

    return firebaseUid;
  }

  /**
   * Returns daily USD estimated revenue for a creator (by Firebase UID).
   * - Uses only transactions with status code 'succeeded'
   * - Groups by local day derived from tzOffsetMinutes (local = UTC + offset)
   * - Fills missing days with zeros
   */
  async getRevenuePerDay(
    firebaseUid: string,
    channelId: string,
    days: number = 30,
    tzOffsetMinutes: number = 0,
  ) {
    await this.validateChannelAccess(firebaseUid, channelId);

    // 1) Determine local window [startLocalInclusive, endLocalExclusive)
    // Use Date.now() so tests can freeze the clock via jest.spyOn(Date, 'now', ...)
    const nowUtc = new Date(Date.now());
    const nowLocal = addMinutes(nowUtc, tzOffsetMinutes);
    const endLocalExclusive = startOfDay(addDays(nowLocal, 1));
    const startLocalInclusive = startOfDay(subDays(endLocalExclusive, days));

    // 2) Convert to UTC for DB filter
    const startUtc = subMinutes(startLocalInclusive, tzOffsetMinutes);
    const endUtc = subMinutes(endLocalExclusive, tzOffsetMinutes);

    // 3) Query: group by local day + currency, sum local amounts
    //    NOTE: We intentionally group using shifted createdAt to align with the provided timezone offset.
    //    USD conversion happens in the application layer using live exchange rates.
    const qb = this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.status', 's')
      .innerJoin('t.currency', 'cur')
      .select(
        `date_trunc('day', t."createdAt" + (:tzOffsetMinutes) * interval '1 minute')`,
        'day',
      )
      .addSelect('SUM(t."amount"::numeric)', 'revenue')
      .addSelect('cur.shortCode', 'currencyCode')
      .where('t.youtubeChannelId = :channelId', { channelId })
      .andWhere('s.code = :succ', { succ: 'succeeded' })
      .andWhere('t."createdAt" >= :startUtc AND t."createdAt" < :endUtc', {
        startUtc,
        endUtc,
      })
      .setParameters({ tzOffsetMinutes })
      .groupBy('day')
      .addGroupBy('cur.shortCode')
      .orderBy('day', 'ASC');

    const raw: RevenueRow[] = await qb.getRawMany();

    // 4) Compute totals for the previous local window to derive trend percentage
    const previousStartLocalInclusive = subDays(startLocalInclusive, days);
    const previousEndLocalExclusive = startLocalInclusive;
    const previousStartUtc = subMinutes(
      previousStartLocalInclusive,
      tzOffsetMinutes,
    );
    const previousEndUtc = subMinutes(
      previousEndLocalExclusive,
      tzOffsetMinutes,
    );

    const previousRows = await this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.status', 's')
      .innerJoin('t.currency', 'cur')
      .select('SUM(t."amount"::numeric)', 'revenue')
      .addSelect('cur.shortCode', 'currencyCode')
      .where('t.youtubeChannelId = :channelId', { channelId })
      .andWhere('s.code = :succ', { succ: 'succeeded' })
      .andWhere('t."createdAt" >= :startUtc AND t."createdAt" < :endUtc', {
        startUtc: previousStartUtc,
        endUtc: previousEndUtc,
      })
      .groupBy('cur.shortCode')
      .getRawMany<{ revenue: string; currencyCode: string }>();

    // 5) Fetch exchange rates for all unique currencies across both windows
    const allCurrencies = [
      ...new Set([
        ...raw.map((r) =>
          (r.currencyCode ?? (r as any).currencycode ?? '').toUpperCase(),
        ),
        ...previousRows.map((r) =>
          (r.currencyCode ?? (r as any).currencycode ?? '').toUpperCase(),
        ),
      ]),
    ].filter(Boolean);

    const rateResults = await Promise.allSettled(
      allCurrencies.map((code) =>
        this.exchangeRateService
          .convertCurrency(code, 'USD')
          .then((res) => ({ code, rate: res.conversion_rate })),
      ),
    );

    const rateMap = new Map<string, number>();
    for (const result of rateResults) {
      if (result.status === 'fulfilled') {
        rateMap.set(result.value.code, result.value.rate);
      } else {
        this.logger.warn(`Failed to fetch exchange rate: ${result.reason}`);
      }
    }

    // 6) Build fixed-length series of local dates and merge query results
    // Use YYYY-MM-DD strings as keys
    const series: { date: string; revenueUsd: number }[] = [];
    const indexByDate = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = addDays(startLocalInclusive, i);
      const dateStr = formatISO(d, { representation: 'date' }); // YYYY-MM-DD
      indexByDate.set(dateStr, i);
      series.push({ date: dateStr, revenueUsd: 0 });
    }

    for (const row of raw as any[]) {
      // row.day may be returned as a string or Date depending on driver.
      // Derive YYYY-MM-DD in a timezone-stable way to avoid local TZ shifts.
      let dateStr: string;
      if (typeof row.day === 'string') {
        // e.g., '2025-08-24T00:00:00.000Z' or '2025-08-24 00:00:00'
        dateStr = row.day.slice(0, 10);
      } else if (row.day instanceof Date) {
        // Use UTC ISO date portion
        dateStr = row.day.toISOString().slice(0, 10);
      } else {
        dateStr = String(row.day).slice(0, 10);
      }

      const idx = indexByDate.get(dateStr);
      if (idx !== undefined) {
        const localAmount = Number(row.revenue ?? 0);
        const currencyCode = (
          row.currencyCode ??
          row.currencycode ??
          ''
        ).toUpperCase();
        const rate = rateMap.get(currencyCode) ?? 0;
        const usdAmount = Number((localAmount * rate).toFixed(2));
        // Accumulate — a single day may have multiple currencies
        series[idx].revenueUsd = Number(
          (series[idx].revenueUsd + usdAmount).toFixed(2),
        );
      }
    }

    const totalRevenueUsd = Number(
      series.reduce((acc, s) => acc + s.revenueUsd, 0).toFixed(2),
    );

    // Convert previous period totals using the same exchange rates
    const previousTotalRevenueUsd = Number(
      (previousRows as any[])
        .reduce((acc, row) => {
          const currencyCode = (
            row.currencyCode ??
            row.currencycode ??
            ''
          ).toUpperCase();
          const rate = rateMap.get(currencyCode) ?? 0;
          return acc + Number(row.revenue ?? 0) * rate;
        }, 0)
        .toFixed(2),
    );

    const hasPreviousData = previousRows.length > 0;
    const trendPercentage = hasPreviousData
      ? previousTotalRevenueUsd > 0
        ? Number(
            (
              ((totalRevenueUsd - previousTotalRevenueUsd) /
                previousTotalRevenueUsd) *
              100
            ).toFixed(2),
          )
        : 0
      : null;

    return {
      days,
      timezoneOffsetMinutes: tzOffsetMinutes,
      startDate: formatISO(startLocalInclusive, { representation: 'date' }),
      endDate: formatISO(subDays(endLocalExclusive, 1), {
        representation: 'date',
      }),
      series,
      totalRevenueUsd,
      trendPercentage,
    };
  }

  /**
   * Returns top earning countries for a creator within a local-time window.
   * - Scopes by youtubeChannelId
   * - Includes only transactions with status 'succeeded'
   * - Aggregates totals by payment provider country and currency
   */
  async getTopEarningCountries(
    firebaseUid: string,
    channelId: string,
    days: number = 30,
    tzOffsetMinutes: number = 0,
    limit: number = 5,
  ) {
    await this.validateChannelAccess(firebaseUid, channelId);

    // 1) Determine local window [startLocalInclusive, endLocalExclusive)
    const nowUtc = new Date(Date.now());
    const nowLocal = addMinutes(nowUtc, tzOffsetMinutes);
    const endLocalExclusive = startOfDay(addDays(nowLocal, 1));
    const startLocalInclusive = startOfDay(subDays(endLocalExclusive, days));

    // 2) Convert to UTC for DB filter
    const startUtc = subMinutes(startLocalInclusive, tzOffsetMinutes);
    const endUtc = subMinutes(endLocalExclusive, tzOffsetMinutes);

    type TopCountryRow = {
      countryCode: string;
      currencyCode: string;
      iso4217Numeric: number | null;
      localAmountTotal: string;
    };

    // 3) Query: aggregate by country + currency using denormalized fields
    const qb = this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.status', 's')
      .innerJoin('t.currency', 'cur')
      .select('t.providerCountryCode', 'countryCode')
      .addSelect('cur.shortCode', 'currencyCode')
      .addSelect('cur.iso4217Numeric', 'iso4217Numeric')
      .addSelect('SUM(t."amount"::numeric)', 'localAmountTotal')
      .where('t.youtubeChannelId = :channelId', { channelId })
      .andWhere('s.code = :succ', { succ: 'succeeded' })
      .andWhere('t."createdAt" >= :startUtc AND t."createdAt" < :endUtc', {
        startUtc,
        endUtc,
      })
      .groupBy('t.providerCountryCode')
      .addGroupBy('cur.shortCode')
      .addGroupBy('cur.iso4217Numeric');

    const raw: TopCountryRow[] = await qb.getRawMany();

    // 4) Fetch exchange rates for unique currencies
    const uniqueCurrencies = [
      ...new Set(
        raw.map((r) =>
          (r.currencyCode ?? (r as any).currencycode ?? '').toUpperCase(),
        ),
      ),
    ].filter(Boolean);

    const rateResults = await Promise.allSettled(
      uniqueCurrencies.map((code) =>
        this.exchangeRateService
          .convertCurrency(code, 'USD')
          .then((res) => ({ code, rate: res.conversion_rate })),
      ),
    );

    const rateMap = new Map<string, number>();
    let exchangeRatesApplied = true;
    for (const result of rateResults) {
      if (result.status === 'fulfilled') {
        rateMap.set(result.value.code, result.value.rate);
      } else {
        exchangeRatesApplied = false;
        this.logger.warn(`Failed to fetch exchange rate: ${result.reason}`);
      }
    }

    // 5) Map rows with USD conversion
    let items = (raw as any[]).map((row) => {
      const currencyCode =
        row.currencyCode ?? row.currencycode ?? String(row.currencyCode);
      const countryCodeStr = row.countryCode ?? row.countrycode ?? '';
      const isoNum = row.iso4217Numeric ?? row.iso4217numeric ?? null;
      const localTotalNum = Number(
        Number(row.localAmountTotal ?? 0).toFixed(2),
      );
      const rate = rateMap.get(currencyCode.toUpperCase());
      const usdTotalNum = rate ? Number((localTotalNum * rate).toFixed(2)) : 0;
      return {
        country: countryCodeStr,
        countryCode: countryCodeStr,
        currency: {
          code: currencyCode,
          iso4217Numeric: isoNum,
        },
        localAmountTotal: localTotalNum,
        usdTotal: usdTotalNum,
      };
    });

    // Enforce deterministic ordering and client-side limit
    items = items
      .sort((a, b) => {
        if (b.usdTotal !== a.usdTotal) return b.usdTotal - a.usdTotal;
        if (b.localAmountTotal !== a.localAmountTotal)
          return b.localAmountTotal - a.localAmountTotal;
        return a.country.localeCompare(b.country);
      })
      .slice(0, limit);

    const totalUsd = Number(
      items.reduce((acc, it) => acc + it.usdTotal, 0).toFixed(2),
    );

    return {
      days,
      timezoneOffsetMinutes: tzOffsetMinutes,
      startDate: formatISO(startLocalInclusive, { representation: 'date' }),
      endDate: formatISO(subDays(endLocalExclusive, 1), {
        representation: 'date',
      }),
      limit,
      totalUsd,
      exchangeRatesApplied,
      items,
    };
  }

  /**
   * Returns channel statistics for a creator (by Firebase UID).
   * - Returns channel handle, link clicks count, and transactions count for the specified period
   */
  async getChannelStatistics(
    firebaseUid: string,
    channelId: string,
    days = 30,
  ) {
    await this.validateChannelAccess(firebaseUid, channelId);

    // Find TelegramChannel via YouTubeChannel
    const telegramChannel = await this.telegramChannelRepo.findOne({
      where: { youtubeChannelId: channelId },
    });

    if (!telegramChannel) {
      return {
        channelHandle: null,
        linkClicks: 0,
        transactions: 0,
        transactionTrend: null,
      };
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const prevStartDate = new Date(
      startDate.getTime() - days * 24 * 60 * 60 * 1000,
    );

    const linkClicks = await this.linkClickRepo.count({
      where: {
        telegramChannel: { id: telegramChannel.id },
        createdAt: MoreThan(startDate),
      },
    });

    const transactions = await this.txRepo.count({
      where: {
        youtubeChannelId: channelId,
        createdAt: MoreThan(startDate),
      },
    });

    const prevTransactions = await this.txRepo.count({
      where: {
        youtubeChannelId: channelId,
        createdAt: Between(prevStartDate, startDate),
      },
    });

    const transactionTrend =
      prevTransactions > 0
        ? Number(
            (
              ((transactions - prevTransactions) / prevTransactions) *
              100
            ).toFixed(1),
          )
        : null;

    return {
      channelHandle: telegramChannel.channelHandle,
      linkClicks,
      transactions,
      transactionTrend,
    };
  }

  /**
   * Returns raw transactions for a creator within the given window.
   * - Scopes by youtubeChannelId and status 'succeeded'
   * - Returns cumulative paid message counts per country
   * - Computes payout date based on provider payout delay
   * - Computes pay deadline (createdAt + 1 month) if no account exists for provider
   */
  async getTransactions(
    firebaseUid: string,
    channelId: string,
    startDate?: string,
    endDate?: string,
    amountGte?: number,
    amountLte?: number,
    countries?: string[],
    currencies?: string[],
    revenueStatuses?: string[],
    operator?: string,
    sortBy:
      | 'amount'
      | 'createdAt'
      | 'country'
      | 'revenueStatus'
      | 'multiplier' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    page = 1,
    limit = 20,
    search?: string,
  ) {
    await this.validateChannelAccess(firebaseUid, channelId);

    // Default to 30 days if not provided
    const nowUtc = new Date(Date.now());
    const defaultEndDate = formatISO(nowUtc, { representation: 'date' });
    const defaultStartDate = formatISO(subDays(nowUtc, 30), {
      representation: 'date',
    });

    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || defaultEndDate;

    // Convert to UTC timestamps (inclusive range)
    const startUtcInclusive = startOfDay(
      new Date(`${effectiveStartDate}T00:00:00Z`),
    );
    const endUtcInclusive = new Date(`${effectiveEndDate}T23:59:59.999Z`);

    const baseQb = this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.status', 's')
      .where('t.youtubeChannelId = :channelId', { channelId })
      .andWhere('s.code = :succ', { succ: 'succeeded' })
      .andWhere('t."createdAt" >= :start AND t."createdAt" <= :end', {
        start: startUtcInclusive,
        end: endUtcInclusive,
      });

    // Amount filtering
    if (amountGte !== undefined) {
      baseQb.andWhere('CAST(t.amount AS DECIMAL) >= :amountGte', {
        amountGte,
      });
    }
    if (amountLte !== undefined) {
      baseQb.andWhere('CAST(t.amount AS DECIMAL) <= :amountLte', {
        amountLte,
      });
    }

    // Country filtering (OR within countries)
    if (countries && countries.length > 0) {
      baseQb.andWhere('t.providerCountryCode IN (:...countries)', {
        countries,
      });
    }

    // Revenue status filtering
    if (revenueStatuses && revenueStatuses.length > 0) {
      baseQb.andWhere('t.revenueStatus IN (:...revenueStatuses)', {
        revenueStatuses,
      });
    }

    // Operator filtering
    if (operator) {
      baseQb.andWhere('t.pawapayCorrespondent = :operator', { operator });
    }

    // Free-text search across multiple fields
    if (search) {
      const searchPattern = `%${search}%`;
      baseQb
        .leftJoin('countries', 'co', 'co."iso3Code" = t."providerCountryCode"')
        .andWhere(
          `(
            co.name ILIKE :search
            OR t."providerCountryCode" ILIKE :search
            OR t."messageContent" ILIKE :search
            OR CAST(t.amount AS TEXT) ILIKE :search
            OR TO_CHAR(t."createdAt", 'Mon DD, YYYY') ILIKE :search
          )`,
          { search: searchPattern },
        );
    }

    // Query transactions with selected fields
    const dataQb = baseQb.clone().innerJoin('t.currency', 'c');

    // Currency filtering (OR within currencies) - applied after join
    if (currencies && currencies.length > 0) {
      dataQb.andWhere('c.shortCode IN (:...currencies)', { currencies });
    }

    const sortColumnMap: Record<string, string> = {
      createdAt: 't."createdAt"',
      amount: 't."amount"',
      country: 't."providerCountryCode"',
      revenueStatus: 't."revenueStatus"',
      multiplier: 't."multiplier"',
    };

    dataQb
      .select('t.id', 'transactionId')
      .addSelect('t.messageId', 'messageId')
      .addSelect('t.messageContent', 'messageContent')
      .addSelect('t.revenueStatus', 'revenueStatus')
      .addSelect('t.providerCountryCode', 'countryCode')
      .addSelect('t.providerName', 'providerName')
      .addSelect('c.shortCode', 'currencyCode')
      .addSelect('t.amount', 'amount')
      .addSelect('t.multiplier', 'multiplier')
      .addSelect('t."createdAt"', 'createdAt')
      .addSelect('t.referralSource', 'referralSource')
      .addSelect('t.referralMedium', 'referralMedium')
      .addSelect('t.payerFullName', 'payerFullName')
      .orderBy(sortColumnMap[sortBy], sortOrder.toUpperCase() as 'ASC' | 'DESC')
      .limit(limit)
      .offset((page - 1) * limit);

    // Run count, data, and available countries queries in parallel
    const [totalRecords, rows, availableCountryRows] = await Promise.all([
      baseQb.clone().getCount(),
      dataQb.getRawMany<{
        transactionId: string;
        messageId: string;
        messageContent: string | null;
        revenueStatus: RevenueStatus;
        countryCode: string;
        providerName: string;
        currencyCode: string;
        amount: string;
        multiplier: number;
        createdAt: Date;
        referralSource: string | null;
        referralMedium: string | null;
        payerFullName: string | null;
      }>(),
      this.getAvailableCountries(channelId),
    ]);

    // Get channel handle from YouTubeChannel's linked TelegramChannel
    const telegramChannel = await this.telegramChannelRepo.findOne({
      where: { youtubeChannelId: channelId },
    });

    const channelHandle = telegramChannel?.channelHandle;

    // Batch check for admin replies on awaiting-reply transactions
    const pendingTransactions = rows.filter(
      (r) => r.revenueStatus === RevenueStatus.AwaitingReply && r.messageId,
    );

    if (pendingTransactions.length > 0) {
      if (channelHandle) {
        try {
          // Batch check all pending message IDs in a single call (1 API call total)
          const messageIds = pendingTransactions.map((r) => r.messageId);
          const replyResults =
            await this.telegramService.checkMessagesForAdminReplies(
              channelHandle,
              messageIds,
            );

          // Update transactions that have admin replies
          const updatePromises = pendingTransactions.map(async (row) => {
            const hasReply = replyResults.get(row.messageId);

            if (hasReply) {
              // Update database
              await this.txRepo.update(row.transactionId, {
                revenueStatus: RevenueStatus.Earned,
              });

              // Update in-memory row for response
              row.revenueStatus = RevenueStatus.Earned;

              this.logger.log(
                `Updated transaction ${row.transactionId} to earned`,
              );
            }
          });

          await Promise.all(updatePromises);
        } catch (error: any) {
          this.logger.error(
            `Error batch checking replies:`,
            error?.message || error,
          );
          // On error, transactions remain awaiting-reply for retry on next load
        }
      }
    }

    const items = rows.map((r) => {
      const createdAt = new Date(r.createdAt);

      // Calculate reply deadline (14 days from creation)
      // Only include if status is awaiting-reply or auto-replied
      let replyDeadline: string | null = null;
      if (
        r.revenueStatus === RevenueStatus.AwaitingReply ||
        r.revenueStatus === RevenueStatus.AutoReplied
      ) {
        const deadlineDate = addDays(createdAt, 14);
        replyDeadline = deadlineDate.toISOString();
      }

      return {
        messageId: r.messageId,
        messageContent: r.messageContent,
        createdAt: createdAt.toISOString(),
        country: r.countryCode,
        countryCode: r.countryCode,
        localAmount: Number(Number(r.amount).toFixed(2)),
        localCurrencyCode: r.currencyCode,
        referralSource: r.referralSource,
        referralMedium: r.referralMedium,
        revenueStatus: r.revenueStatus,
        multiplier: Number(r.multiplier),
        replyDeadline,
        senderName: r.payerFullName || null,
        telegramMessageLink:
          channelHandle && r.messageId
            ? `https://t.me/${channelHandle}/${r.messageId}`
            : null,
      };
    });

    // Group available countries by country code
    const countryMap = new Map<
      string,
      { countryCode: string; countryName: string; currencies: string[] }
    >();
    for (const row of availableCountryRows) {
      let entry = countryMap.get(row.countryCode);
      if (!entry) {
        entry = {
          countryCode: row.countryCode,
          countryName: row.countryName,
          currencies: [],
        };
        countryMap.set(row.countryCode, entry);
      }
      entry.currencies.push(row.currencyCode);
    }
    const availableCountries = Array.from(countryMap.values());

    return {
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      page,
      limit,
      items,
      totalRecords,
      availableCountries,
    };
  }

  /**
   * Reply to a fan's Telegram message on behalf of the creator.
   * Sends the reply via Telegram and updates the transaction's revenue status to Earned.
   */
  async replyToTransaction(
    firebaseUid: string,
    channelId: string,
    messageId: string,
    text: string,
  ): Promise<{ success: boolean; revenueStatus: string }> {
    await this.validateChannelAccess(firebaseUid, channelId);

    const transaction = await this.txRepo.findOne({
      where: { messageId, youtubeChannelId: channelId },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction with messageId ${messageId} not found`,
      );
    }

    if (transaction.revenueStatus !== RevenueStatus.AwaitingReply) {
      throw new BadRequestException(
        `Transaction is not awaiting reply (current status: ${transaction.revenueStatus})`,
      );
    }

    const telegramChannel = await this.telegramChannelRepo.findOne({
      where: { youtubeChannelId: channelId },
    });

    if (!telegramChannel?.channelHandle) {
      throw new NotFoundException('No Telegram channel found for this creator');
    }

    await this.telegramService.replyToMessage(
      telegramChannel.channelHandle,
      text,
      messageId,
    );

    await this.txRepo.update(transaction.id, {
      revenueStatus: RevenueStatus.Earned,
    });

    this.logger.log(
      `Creator ${firebaseUid} replied to message ${messageId}, status updated to earned`,
    );

    return { success: true, revenueStatus: RevenueStatus.Earned };
  }

  /**
   * Returns distinct country/currency combinations from a creator's succeeded transactions.
   */
  private async getAvailableCountries(
    channelId: string,
  ): Promise<
    { countryCode: string; countryName: string; currencyCode: string }[]
  > {
    return this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.status', 's')
      .innerJoin('t.currency', 'c')
      .leftJoin(Country, 'co', 'co.iso3Code = t.providerCountryCode')
      .select('t.providerCountryCode', 'countryCode')
      .addSelect('COALESCE(co.name, t.providerCountryCode)', 'countryName')
      .addSelect('c.shortCode', 'currencyCode')
      .where('t.youtubeChannelId = :channelId', { channelId })
      .andWhere('s.code = :succ', { succ: 'succeeded' })
      .groupBy('t.providerCountryCode')
      .addGroupBy('co.name')
      .addGroupBy('c.shortCode')
      .orderBy('co.name', 'ASC')
      .addOrderBy('c.shortCode', 'ASC')
      .getRawMany<{
        countryCode: string;
        countryName: string;
        currencyCode: string;
      }>();
  }

  /**
   * Aggregated statistics for a channel in a single country/payment provider.
   * - Scopes by youtubeChannelId and provider code
   * - Considers only transactions with status 'succeeded'
   * - Window defaults to last 30 days ending today
   * - Computes totals, counts and next payout date/amount
   */
  async getAccountStatistics(
    firebaseUid: string,
    channelId: string,
    accountId?: string,
    country?: string,
    countryCode?: string,
    days = 30,
  ) {
    await this.validateChannelAccess(firebaseUid, channelId);
    const ownerUid = await this.resolveOwnerUid(firebaseUid, channelId);

    let providerName: string | null = null;
    let providerCountryCode: string | null = null;
    let account: Account | null = null;

    if (accountId) {
      account = await this.accountRepo.findOne({
        where: { id: accountId, owner: { firebaseUid: ownerUid } },
        relations: ['owner'],
      });
      if (account) {
        providerName = account.providerName;
        providerCountryCode = account.providerCountryCode;
      }
    } else if (countryCode) {
      account = await this.accountRepo.findOne({
        where: {
          providerCountryCode: countryCode,
          owner: { firebaseUid: ownerUid },
        },
        relations: ['owner'],
      });
      if (account) {
        providerName = account.providerName;
        providerCountryCode = account.providerCountryCode;
      }
    }

    if (!providerName || !providerCountryCode) {
      return {
        localCurrencyCode: '',
        totalLocal: 0,
        totalUsd: 0,
        nextPayAmountLocal: null,
        nextPayAmountUsd: null,
        nextPayDate: null,
        premiumMessages: 0,
        mobileNumber: null,
        livestreamTotalLocal: 0,
        livestreamTotalUsd: 0,
        videoTotalLocal: 0,
        videoTotalUsd: 0,
        uniqueLivestreams: 0,
        averageMessageValue: 0,
        totalFees: 0,
        averageFee: 0,
      };
    }

    const nowUtc = new Date(Date.now());
    const endUtcExclusive = startOfDay(addDays(nowUtc, 1));
    const startUtcInclusive = startOfDay(subDays(endUtcExclusive, days));

    // Query aggregates in local currency (no longer rely on usdEstimatedValue)
    const qb = this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.status', 's')
      .innerJoin('t.currency', 'cur')
      .select('SUM(t.amount)::numeric', 'totalLocal')
      .addSelect('cur.shortCode', 'currencyCode')
      .addSelect('COUNT(*)', 'msgCount')
      .addSelect('SUM(t."totalFees"::numeric)', 'totalFees')
      .addSelect(
        "SUM(CASE WHEN t.messageType = 'livestream' THEN t.amount ELSE 0 END)::numeric",
        'livestreamLocal',
      )
      .addSelect(
        "SUM(CASE WHEN t.messageType = 'video' THEN t.amount ELSE 0 END)::numeric",
        'videoLocal',
      )
      .addSelect('COUNT(DISTINCT t."livestreamId")', 'uniqueStreams')
      .where('t.youtubeChannelId = :channelId', { channelId })
      .andWhere('t.providerName = :providerName', { providerName })
      .andWhere('t.providerCountryCode = :providerCountryCode', {
        providerCountryCode,
      })
      .andWhere('s.code = :succ', { succ: 'succeeded' })
      .andWhere('t."createdAt" >= :start AND t."createdAt" < :end', {
        start: startUtcInclusive,
        end: endUtcExclusive,
      })
      .groupBy('cur.shortCode');

    const raw = await qb.getRawOne<{ [key: string]: string }>();
    const currencyCode = (
      raw?.currencyCode ??
      (raw as any)?.currencycode ??
      ''
    ).toUpperCase();
    const msgCount = Number(raw?.msgCount || 0);
    const totalLocal = Number(raw?.totalLocal || 0);
    const totalFees = Number(raw?.totalFees || 0);
    const livestreamLocal = Number(raw?.livestreamLocal || 0);
    const videoLocal = Number(raw?.videoLocal || 0);
    const uniqueStreams = Number(raw?.uniqueStreams || 0);

    // Fetch live exchange rate for this currency
    let rate = 0;
    if (currencyCode) {
      try {
        const rateRes = await this.exchangeRateService.convertCurrency(
          currencyCode,
          'USD',
        );
        rate = rateRes.conversion_rate;
      } catch (err) {
        this.logger.warn(
          `Failed to fetch exchange rate for ${currencyCode}: ${err}`,
        );
      }
    }

    const totalUsd = Number((totalLocal * rate).toFixed(2));
    const livestreamUsd = Number((livestreamLocal * rate).toFixed(2));
    const videoUsd = Number((videoLocal * rate).toFixed(2));

    // Next payout calculation for unpaid transactions
    const unpaid = await this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.status', 's')
      .select(['t.createdAt', 't.totalPayout'])
      .where('t.youtubeChannelId = :channelId', { channelId })
      .andWhere('t.providerName = :providerName', { providerName })
      .andWhere('t.providerCountryCode = :providerCountryCode', {
        providerCountryCode,
      })
      .andWhere('s.code = :succ', { succ: 'succeeded' })
      .andWhere('t.payoutAt IS NULL')
      .getMany();

    let nextPayDate: Date | null = null;
    let nextPayLocal = 0;
    for (const tx of unpaid) {
      // Assume default payout delay of 7 days since we don't store this anymore
      const payoutDate = addDays(tx.createdAt, 7);
      if (!nextPayDate || payoutDate < nextPayDate) {
        nextPayDate = payoutDate;
        nextPayLocal = Number(tx.totalPayout);
      } else if (payoutDate.getTime() === nextPayDate.getTime()) {
        nextPayLocal += Number(tx.totalPayout);
      }
    }
    const nextPayUsd = Number((nextPayLocal * rate).toFixed(2));

    const avgMsgValue = msgCount
      ? Number((totalLocal / msgCount).toFixed(2))
      : 0;
    const avgFee = msgCount ? Number((totalFees / msgCount).toFixed(2)) : 0;

    return {
      localCurrencyCode: currencyCode,
      totalLocal: Number(totalLocal.toFixed(2)),
      totalUsd,
      nextPayAmountLocal: nextPayDate ? Number(nextPayLocal.toFixed(2)) : null,
      nextPayAmountUsd: nextPayDate ? nextPayUsd : null,
      nextPayDate: nextPayDate ? nextPayDate.toISOString().slice(0, 10) : null,
      premiumMessages: msgCount,
      mobileNumber: account?.phoneNumber ?? null,
      livestreamTotalLocal: Number(livestreamLocal.toFixed(2)),
      livestreamTotalUsd: livestreamUsd,
      videoTotalLocal: Number(videoLocal.toFixed(2)),
      videoTotalUsd: videoUsd,
      uniqueLivestreams: uniqueStreams,
      averageMessageValue: avgMsgValue,
      totalFees: Number(totalFees.toFixed(2)),
      averageFee: avgFee,
    };
  }

  /**
   * Returns payment overview for all countries with transactions.
   * Aggregates by providerCountryCode + currency, converts to USD via live exchange rates,
   * and checks whether the creator has an account for each country.
   */
  async getPaymentOverview(firebaseUid: string, channelId: string, days = 30) {
    await this.validateChannelAccess(firebaseUid, channelId);

    const nowUtc = new Date(Date.now());
    const endUtcExclusive = startOfDay(addDays(nowUtc, 1));
    const startUtcInclusive = startOfDay(subDays(endUtcExclusive, days));

    // 1) Aggregate by country + currency
    type AggRow = {
      countryCode: string;
      currencyCode: string;
      totalLocal: string;
      msgCount: string;
      totalFees: string;
      livestreamLocal: string;
      videoLocal: string;
      livestreamMsgCount: string;
      videoMsgCount: string;
      uniqueStreams: string;
    };

    const aggRows: AggRow[] = await this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.status', 's')
      .innerJoin('t.currency', 'cur')
      .select('t.providerCountryCode', 'countryCode')
      .addSelect('cur.shortCode', 'currencyCode')
      .addSelect('SUM(t."amount"::numeric)', 'totalLocal')
      .addSelect('COUNT(*)', 'msgCount')
      .addSelect('SUM(t."totalFees"::numeric)', 'totalFees')
      .addSelect(
        "SUM(CASE WHEN t.messageType = 'livestream' THEN t.amount ELSE 0 END)::numeric",
        'livestreamLocal',
      )
      .addSelect(
        "SUM(CASE WHEN t.messageType = 'video' THEN t.amount ELSE 0 END)::numeric",
        'videoLocal',
      )
      .addSelect(
        "SUM(CASE WHEN t.messageType = 'livestream' THEN 1 ELSE 0 END)",
        'livestreamMsgCount',
      )
      .addSelect(
        "SUM(CASE WHEN t.messageType = 'video' THEN 1 ELSE 0 END)",
        'videoMsgCount',
      )
      .addSelect('COUNT(DISTINCT t."livestreamId")', 'uniqueStreams')
      .where('t.youtubeChannelId = :channelId', { channelId })
      .andWhere('s.code = :succ', { succ: 'succeeded' })
      .andWhere('t."createdAt" >= :start AND t."createdAt" < :end', {
        start: startUtcInclusive,
        end: endUtcExclusive,
      })
      .groupBy('t.providerCountryCode')
      .addGroupBy('cur.shortCode')
      .getRawMany();

    if (aggRows.length === 0) {
      return { days, items: [] };
    }

    // 2) Next payout per country (unpaid transactions)
    type PayoutRow = {
      countryCode: string;
      earliestPayoutDate: Date;
      payoutLocal: string;
    };

    const payoutRows: PayoutRow[] = await this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.status', 's')
      .select('t.providerCountryCode', 'countryCode')
      .addSelect(`MIN(t."createdAt" + interval '7 days')`, 'earliestPayoutDate')
      .addSelect('SUM(t."totalPayout"::numeric)', 'payoutLocal')
      .where('t.youtubeChannelId = :channelId', { channelId })
      .andWhere('s.code = :succ', { succ: 'succeeded' })
      .andWhere('t."payoutAt" IS NULL')
      .groupBy('t.providerCountryCode')
      .getRawMany();

    const payoutMap = new Map(
      payoutRows.map((r) => [
        (r.countryCode ?? (r as any).countrycode ?? '').toUpperCase(),
        r,
      ]),
    );

    // 3) Check which countries have an account
    const ownerUid = await this.resolveOwnerUid(firebaseUid, channelId);
    const accounts = await this.accountRepo.find({
      where: { owner: { firebaseUid: ownerUid }, deletedAt: IsNull() },
      select: ['providerCountryCode'],
    });
    const accountCountryCodes = new Set(
      accounts.map((a) => a.providerCountryCode?.toUpperCase()).filter(Boolean),
    );

    // 4) Fetch live exchange rates for all currencies
    const uniqueCurrencies = [
      ...new Set(
        aggRows
          .map((r) =>
            (r.currencyCode ?? (r as any).currencycode ?? '').toUpperCase(),
          )
          .filter(Boolean),
      ),
    ];

    const rateResults = await Promise.allSettled(
      uniqueCurrencies.map((code) =>
        this.exchangeRateService
          .convertCurrency(code, 'USD')
          .then((res) => ({ code, rate: res.conversion_rate })),
      ),
    );

    const rateMap = new Map<string, number>();
    for (const result of rateResults) {
      if (result.status === 'fulfilled') {
        rateMap.set(result.value.code, result.value.rate);
      } else {
        this.logger.warn(`Failed to fetch exchange rate: ${result.reason}`);
      }
    }

    // 5) Build items
    const items = (aggRows as any[]).map((row) => {
      const cc = (row.countryCode ?? row.countrycode ?? '').toUpperCase();
      const currencyCode = (
        row.currencyCode ??
        row.currencycode ??
        ''
      ).toUpperCase();
      const totalLocal = Number(Number(row.totalLocal ?? 0).toFixed(2));
      const totalFees = Number(Number(row.totalFees ?? 0).toFixed(2));
      const livestreamLocal = Number(
        Number(row.livestreamLocal ?? 0).toFixed(2),
      );
      const videoLocal = Number(Number(row.videoLocal ?? 0).toFixed(2));
      const msgCount = Number(row.msgCount ?? 0);
      const livestreamMsgCount = Number(row.livestreamMsgCount ?? 0);
      const videoMsgCount = Number(row.videoMsgCount ?? 0);
      const uniqueStreams = Number(row.uniqueStreams ?? 0);
      const rate = rateMap.get(currencyCode) ?? 0;

      const totalUsd = Number((totalLocal * rate).toFixed(2));
      const livestreamUsd = Number((livestreamLocal * rate).toFixed(2));
      const videoUsd = Number((videoLocal * rate).toFixed(2));
      const avgMsgValue = msgCount
        ? Number((totalLocal / msgCount).toFixed(2))
        : 0;
      const avgFee = msgCount ? Number((totalFees / msgCount).toFixed(2)) : 0;
      const feePercentage = totalLocal
        ? Number(((totalFees / totalLocal) * 100).toFixed(1))
        : 0;

      const payout = payoutMap.get(cc);
      const nextPayLocal = payout
        ? Number(Number(payout.payoutLocal ?? 0).toFixed(2))
        : 0;
      const nextPayUsd = Number((nextPayLocal * rate).toFixed(2));
      const nextPayDate = payout?.earliestPayoutDate
        ? new Date(payout.earliestPayoutDate).toISOString().slice(0, 10)
        : null;

      return {
        countryCode: cc,
        localCurrencyCode: currencyCode,
        hasAccount: accountCountryCodes.has(cc),
        totalLocal,
        totalUsd,
        nextPayAmountLocal: nextPayDate ? nextPayLocal : null,
        nextPayAmountUsd: nextPayDate ? nextPayUsd : null,
        nextPayDate,
        premiumMessages: msgCount,
        livestreamTotalLocal: livestreamLocal,
        livestreamTotalUsd: livestreamUsd,
        videoTotalLocal: videoLocal,
        videoTotalUsd: videoUsd,
        livestreamMessages: livestreamMsgCount,
        videoMessages: videoMsgCount,
        uniqueLivestreams: uniqueStreams,
        averageMessageValue: avgMsgValue,
        totalFees,
        averageFee: avgFee,
        feePercentage,
      };
    });

    // Sort by totalUsd desc
    items.sort((a, b) => b.totalUsd - a.totalUsd);

    return { days, items };
  }

  /**
   * Returns payouts for a channel filtered by country with pagination, search and sorting.
   */
  async getPayouts(
    firebaseUid: string,
    channelId: string,
    country?: string,
    countryCode?: string,
    page = 1,
    limit = 20,
    search?: string,
    sort: 'asc' | 'desc' = 'desc',
  ) {
    await this.validateChannelAccess(firebaseUid, channelId);

    const qb = this.payoutRepo
      .createQueryBuilder('p')
      .innerJoin('p.transactions', 't')
      .innerJoin('p.beneficiary', 'acc')
      .innerJoin('p.status', 's')
      .select('t.id', 'transactionId')
      .addSelect('acc.phoneNumber', 'beneficiaryPhone')
      .addSelect('p.providerName', 'paymentProvider')
      .addSelect('p.amount', 'amount')
      .addSelect('p.usdEstimatedValue', 'usdEstimatedValue')
      .addSelect('s.id', 'statusId')
      .addSelect('p.invoiceId', 'invoiceId')
      .addSelect('p.initiatedAt', 'initiatedAt')
      .where('t.youtubeChannelId = :channelId', { channelId });

    if (countryCode) {
      qb.andWhere('p.providerCountryCode = :countryCode', { countryCode });
    }

    if (search) {
      qb.andWhere(
        '(CAST(t.id AS TEXT) LIKE :search OR acc.phoneNumber LIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    qb.orderBy('p.initiatedAt', sort === 'asc' ? 'ASC' : 'DESC')
      .limit(limit)
      .offset((page - 1) * limit);

    const rows = await qb.getRawMany<{
      transactionId: string;
      beneficiaryPhone: string;
      paymentProvider: string;
      amount: string;
      usdEstimatedValue: string;
      statusId: string;
      invoiceId: string | null;
      initiatedAt: Date;
    }>();

    const items = rows.map((r) => ({
      transactionId: r.transactionId,
      beneficiaryPhone: r.beneficiaryPhone,
      paymentProvider: r.paymentProvider,
      amount: Number(Number(r.amount).toFixed(2)),
      usdEstimatedValue: Number(Number(r.usdEstimatedValue).toFixed(2)),
      statusId: r.statusId,
      invoiceId: r.invoiceId,
      initiatedAt: r.initiatedAt.toISOString(),
    }));

    return { page, limit, items };
  }

  /**
   * Returns message unit statistics for a creator (by Firebase UID).
   * - All monetary values are USD estimates based on live exchange rates
   * - Compares current 30 days vs previous 30 days
   * - Provides 6-month monthly averages for trend data
   * - Identifies top performing country by USD earnings
   */
  async getMessageUnitStatistics(firebaseUid: string, channelId: string) {
    await this.validateChannelAccess(firebaseUid, channelId);

    type AggRow = {
      totalLocal: string;
      currencyCode: string;
      transactionCount: string;
    };

    const nowUtc = new Date(Date.now());
    const endUtc = startOfDay(addDays(nowUtc, 1));
    const startUtc30 = startOfDay(subDays(endUtc, 30));
    const startUtc60 = subDays(startUtc30, 30);

    // Helper: build a period aggregation query grouped by currency
    const buildPeriodQuery = (start: Date, end: Date) =>
      this.txRepo
        .createQueryBuilder('t')
        .select('SUM(t."amount"::numeric)', 'totalLocal')
        .addSelect('cur.shortCode', 'currencyCode')
        .addSelect('COUNT(*)::integer', 'transactionCount')
        .innerJoin('t.status', 's')
        .innerJoin('t.currency', 'cur')
        .where('t.youtubeChannelId = :channelId', { channelId })
        .andWhere('s.code = :succ', { succ: 'succeeded' })
        .andWhere('t."createdAt" >= :start AND t."createdAt" < :end', {
          start,
          end,
        })
        .groupBy('cur.shortCode')
        .getRawMany<AggRow>();

    // 1. Current and previous 30-day periods
    const [currentRows, previousRows] = await Promise.all([
      buildPeriodQuery(startUtc30, endUtc),
      buildPeriodQuery(startUtc60, startUtc30),
    ]);

    // 2. Monthly averages (6 rolling 30-day windows)
    const monthlyRawRows: AggRow[][] = [];
    const monthLabels: string[] = [];
    for (let i = 0; i < 6; i++) {
      const monthEnd = subDays(endUtc, i * 30);
      const monthStart = subDays(monthEnd, 30);
      monthLabels.push(
        formatISO(monthStart, { representation: 'date' }).substring(0, 7),
      );
      monthlyRawRows.push(await buildPeriodQuery(monthStart, monthEnd));
    }

    // 3. Top country (last 30 days) grouped by country + currency
    type CountryRow = {
      countryCode: string;
      currencyCode: string;
      totalLocal: string;
    };
    const countryRows: CountryRow[] = await this.txRepo
      .createQueryBuilder('t')
      .select('t.providerCountryCode', 'countryCode')
      .addSelect('cur.shortCode', 'currencyCode')
      .addSelect('SUM(t."amount"::numeric)', 'totalLocal')
      .innerJoin('t.status', 's')
      .innerJoin('t.currency', 'cur')
      .where('t.youtubeChannelId = :channelId', { channelId })
      .andWhere('s.code = :succ', { succ: 'succeeded' })
      .andWhere('t."createdAt" >= :start AND t."createdAt" < :end', {
        start: startUtc30,
        end: endUtc,
      })
      .groupBy('t.providerCountryCode')
      .addGroupBy('cur.shortCode')
      .getRawMany();

    // 4. Collect all unique currencies and fetch exchange rates once
    const allRows = [
      ...currentRows,
      ...previousRows,
      ...monthlyRawRows.flat(),
      ...countryRows,
    ];
    const uniqueCurrencies = [
      ...new Set(
        allRows
          .map((r) =>
            (r.currencyCode ?? (r as any).currencycode ?? '').toUpperCase(),
          )
          .filter(Boolean),
      ),
    ];

    const rateMap = new Map<string, number>();
    if (uniqueCurrencies.length > 0) {
      const rateResults = await Promise.allSettled(
        uniqueCurrencies.map((code) =>
          this.exchangeRateService
            .convertCurrency(code, 'USD')
            .then((res) => ({ code, rate: res.conversion_rate })),
        ),
      );
      for (const result of rateResults) {
        if (result.status === 'fulfilled') {
          rateMap.set(result.value.code, result.value.rate);
        } else {
          this.logger.warn(`Failed to fetch exchange rate: ${result.reason}`);
        }
      }
    }

    // Helper: convert aggregation rows to USD total and transaction count
    const convertRows = (rows: AggRow[]) => {
      let totalUsd = 0;
      let transactionCount = 0;
      for (const row of rows) {
        const cc = (
          row.currencyCode ??
          (row as any).currencycode ??
          ''
        ).toUpperCase();
        const local = Number(row.totalLocal ?? 0);
        const rate = rateMap.get(cc) ?? 0;
        totalUsd += local * rate;
        transactionCount += Number(row.transactionCount ?? 0);
      }
      return {
        totalUsd: Number(totalUsd.toFixed(2)),
        transactionCount,
      };
    };

    const currentConverted = convertRows(currentRows);
    const previousConverted = convertRows(previousRows);

    // 5. Change percentage (null when no previous data to compare)
    const hasPreviousData = previousRows.length > 0;
    const changePercentage = hasPreviousData
      ? previousConverted.totalUsd > 0
        ? Number(
            (
              ((currentConverted.totalUsd - previousConverted.totalUsd) /
                previousConverted.totalUsd) *
              100
            ).toFixed(2),
          )
        : 0
      : null;

    // 6. Monthly averages in USD
    const monthlyAverages = monthlyRawRows.map((rows, i) => {
      const { totalUsd } = convertRows(rows);
      return {
        month: monthLabels[i],
        averagePerDayUsd: Number((totalUsd / 30).toFixed(2)),
      };
    });
    monthlyAverages.reverse();

    // 7. Top country by USD earnings
    const countryUsdMap = new Map<string, number>();
    for (const row of countryRows) {
      const cc = (
        row.countryCode ??
        (row as any).countrycode ??
        ''
      ).toUpperCase();
      const currCode = (
        row.currencyCode ??
        (row as any).currencycode ??
        ''
      ).toUpperCase();
      const local = Number(row.totalLocal ?? 0);
      const rate = rateMap.get(currCode) ?? 0;
      countryUsdMap.set(cc, (countryUsdMap.get(cc) ?? 0) + local * rate);
    }

    // Build sorted array of all countries by USD earnings
    const countryCodes = [...countryUsdMap.keys()];
    const countryEntities =
      countryCodes.length > 0
        ? await this.countryRepo.find({
            where: { iso3Code: In(countryCodes) },
          })
        : [];
    const nameMap = new Map(countryEntities.map((c) => [c.iso3Code, c.name]));

    const topCountries = [...countryUsdMap.entries()]
      .map(([code, usd]) => ({
        countryCode: code,
        countryName: nameMap.get(code) || code,
        totalUsd: Number(usd.toFixed(2)),
      }))
      .sort(
        (a, b) =>
          b.totalUsd - a.totalUsd || a.countryCode.localeCompare(b.countryCode),
      );

    return {
      current30Days: {
        totalUsd: currentConverted.totalUsd,
        averageUsd: Number((currentConverted.totalUsd / 30).toFixed(2)),
        transactionCount: currentConverted.transactionCount,
      },
      previous30Days: {
        totalUsd: previousConverted.totalUsd,
        averageUsd: Number((previousConverted.totalUsd / 30).toFixed(2)),
        transactionCount: previousConverted.transactionCount,
      },
      changePercentage,
      monthlyAverages,
      topCountries,
    };
  }
}
