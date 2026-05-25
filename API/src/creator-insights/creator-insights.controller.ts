import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import {
  ApiSecurityProfile,
  ApiSecureEndpoint,
  ApiCommonResponses,
} from '../decorators/api-security-docs.decorator';
import { CreatorInsightsService } from './creator-insights.service';
import { RevenuePerDayQueryDto } from './dto/revenue-per-day.query.dto';
import { RevenuePerDayResponseDto } from './dto/revenue-per-day.response.dto';
import { TopEarningCountriesQueryDto } from './dto/top-earning-countries.query.dto';
import { TopEarningCountriesResponseDto } from './dto/top-earning-countries.response.dto';
import { ChannelStatisticsQueryDto } from './dto/channel-statistics.query.dto';
import { ChannelStatisticsResponseDto } from './dto/channel-statistics.response.dto';
import { TransactionsQueryDto } from './dto/transactions.query.dto';
import { TransactionsResponseDto } from './dto/transactions.response.dto';
import { AccountStatisticsQueryDto } from './dto/account-statistics.query.dto';
import { AccountStatisticsResponseDto } from './dto/account-statistics.response.dto';
import { PaymentOverviewQueryDto } from './dto/payment-overview.query.dto';
import { PaymentOverviewResponseDto } from './dto/payment-overview.response.dto';
import { PayoutsQueryDto } from './dto/payouts.query.dto';
import { PayoutsResponseDto } from './dto/payouts.response.dto';
import { MessageUnitStatisticsQueryDto } from './dto/message-unit-statistics.query.dto';
import { MessageUnitStatisticsResponseDto } from './dto/message-unit-statistics.response.dto';
import { ReplyToMessageDto } from './dto/reply-to-message.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../decorators/role.decorator';
import { UserRole } from '../creator/enums/user.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@ApiTags('creator-insights')
@Controller('creator-insights')
export class CreatorInsightsController {
  constructor(private readonly service: CreatorInsightsService) {}

  @Get('revenue-per-day')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Role(UserRole.Creator)
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of local days to include (ending today). Default 30.',
    schema: { type: 'number', minimum: 1, maximum: 365, default: 30 },
  })
  @ApiQuery({
    name: 'tzOffsetMinutes',
    required: false,
    description:
      'Timezone offset in minutes (local = UTC + offset). Default 0. Example: New York (EDT) = -240, India = +330.',
    schema: { type: 'number', minimum: -720, maximum: 840, default: 0 },
  })
  @ApiOkResponse({
    description: 'Daily revenue series and totals',
    type: RevenuePerDayResponseDto,
  })
  @ApiOperation({
    summary: 'Daily revenue (USD estimate) grouped by local day',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Sensitive',
        auditLogging: 'No',
        securityConsiderations: [
          'Returns revenue data for authenticated creator only',
          'Timezone-aware calculations',
          'USD estimates rounded to 2 decimals',
          'Zero-filled series for missing days',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '400': 'Invalid query parameters',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Retrieves daily revenue grouped by local timezone day, with zero-filled gaps for continuity.',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  async getRevenuePerDay(
    @Req() req: { user?: AuthUser },
    @Query() query: RevenuePerDayQueryDto,
  ) {
    const firebaseUid = req.user?.user_id;
    if (!firebaseUid) {
      throw new BadRequestException('Missing authenticated Firebase user');
    }
    const days = Number(query.days ?? 30);
    const tzOffsetMinutes = Number(query.tzOffsetMinutes ?? 0);
    return this.service.getRevenuePerDay(
      firebaseUid,
      query.channelId,
      days,
      tzOffsetMinutes,
    );
  }

  @Get('top-earning-countries')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Role(UserRole.Creator)
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of local days to include (ending today). Default 30.',
    schema: { type: 'number', minimum: 1, maximum: 365, default: 30 },
  })
  @ApiQuery({
    name: 'tzOffsetMinutes',
    required: false,
    description:
      'Timezone offset in minutes (local = UTC + offset). Default 0. Example: New York (EDT) = -240, India = +330.',
    schema: { type: 'number', minimum: -720, maximum: 840, default: 0 },
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description:
      'Maximum number of countries to return, sorted by USD total desc. Default 5.',
    schema: { type: 'number', minimum: 1, maximum: 10, default: 5 },
  })
  @ApiOkResponse({
    description: 'Top earning countries over the local-time window',
    type: TopEarningCountriesResponseDto,
  })
  @ApiOperation({
    summary: 'Top earning countries over a local-time window',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Sensitive',
        auditLogging: 'No',
        securityConsiderations: [
          'Returns revenue by country for authenticated creator only',
          'Timezone-aware calculations',
          'Sorted by total USD descending',
          'Configurable limit (1-10 countries)',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '400': 'Invalid query parameters',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Retrieves top earning countries over a specified time window, sorted by total USD revenue.',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  async getTopEarningCountries(
    @Req() req: { user?: AuthUser },
    @Query() query: TopEarningCountriesQueryDto,
  ) {
    const firebaseUid = req.user?.user_id;
    if (!firebaseUid) {
      throw new BadRequestException('Missing authenticated Firebase user');
    }
    const days = Number(query.days ?? 30);
    const tzOffsetMinutes = Number(query.tzOffsetMinutes ?? 0);
    const limit = Number(query.limit ?? 5);
    return this.service.getTopEarningCountries(
      firebaseUid,
      query.channelId,
      days,
      tzOffsetMinutes,
      limit,
    );
  }

  @Get('channel-statistics')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Role(UserRole.Creator)
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to include (ending today). Default 30.',
    schema: { type: 'number', minimum: 1, maximum: 365, default: 30 },
  })
  @ApiOkResponse({
    description:
      'Channel statistics including handle, link clicks, and transactions',
    type: ChannelStatisticsResponseDto,
  })
  @ApiOperation({
    summary: 'Get channel statistics for the authenticated creator',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Sensitive',
        auditLogging: 'No',
        securityConsiderations: [
          'Returns channel engagement metrics',
          'Link clicks and transaction counts',
          'Time window configurable (1-365 days)',
          'Creator-specific data only',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '400': 'Invalid days parameter',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Retrieves channel statistics including Telegram handle, link clicks, and transaction metrics.',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  async getChannelStatistics(
    @Req() req: { user?: AuthUser },
    @Query() query: ChannelStatisticsQueryDto,
  ): Promise<ChannelStatisticsResponseDto> {
    const firebaseUid = req.user?.user_id;
    if (!firebaseUid) {
      throw new BadRequestException('Missing authenticated Firebase user');
    }
    const days = Number(query.days ?? 30);
    return this.service.getChannelStatistics(
      firebaseUid,
      query.channelId,
      days,
    );
  }

  @Get('transactions')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Role(UserRole.Creator)
  @ApiQuery({
    name: 'startDate',
    required: false,
    description:
      'Start date (inclusive, YYYY-MM-DD in UTC). Defaults to 30 days ago.',
    schema: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      example: '2025-01-01',
    },
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (inclusive, YYYY-MM-DD in UTC). Defaults to today.',
    schema: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      example: '2025-01-31',
    },
  })
  @ApiQuery({
    name: 'amountGte',
    required: false,
    description: 'Minimum amount (>=)',
    schema: { type: 'number', minimum: 0 },
  })
  @ApiQuery({
    name: 'amountLte',
    required: false,
    description: 'Maximum amount (<=)',
    schema: { type: 'number', minimum: 0 },
  })
  @ApiQuery({
    name: 'countries',
    required: false,
    description: 'Filter by country codes (ISO 3166-1 alpha-3)',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['KEN', 'ZMB'],
    },
  })
  @ApiQuery({
    name: 'currencies',
    required: false,
    description: 'Filter by currency codes (ISO 4217)',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['KES', 'ZMW'],
    },
  })
  @ApiQuery({
    name: 'operator',
    required: false,
    description: 'Filter by payment operator',
    schema: { type: 'string', example: 'MTN_MOMO_ZMB' },
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort by',
    schema: {
      type: 'string',
      enum: ['amount', 'createdAt'],
      default: 'createdAt',
    },
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    schema: {
      type: 'string',
      enum: ['asc', 'desc'],
      default: 'desc',
    },
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based). Default 1.',
    schema: { type: 'number', minimum: 1, default: 1 },
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records per page. Default 20.',
    schema: { type: 'number', minimum: 1, maximum: 100, default: 20 },
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description:
      'Free-text search across country name, country code, message content, amount, and date',
    schema: { type: 'string', example: 'Kenya' },
  })
  @ApiOkResponse({
    description: 'List of transactions within the window',
    type: TransactionsResponseDto,
  })
  @ApiOperation({
    summary: 'List transactions for the authenticated creator',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Sensitive',
        auditLogging: 'No',
        securityConsiderations: [
          'Returns transaction history for creator only',
          'Paginated results (max 100 per page)',
          'Flexible date range filtering (YYYY-MM-DD format)',
          'Amount, country, currency, operator filtering supported',
          'Sortable by amount or createdAt',
          'Includes message content and referral data',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '400': 'Invalid query parameters (date format, ranges, etc.)',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Retrieves paginated list of transactions with advanced filtering and sorting options. Date range is inclusive on both ends.',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  async getTransactions(
    @Req() req: { user?: AuthUser },
    @Query() query: TransactionsQueryDto,
  ): Promise<TransactionsResponseDto> {
    const firebaseUid = req.user?.user_id;
    if (!firebaseUid) {
      throw new BadRequestException('Missing authenticated Firebase user');
    }

    return this.service.getTransactions(
      firebaseUid,
      query.channelId,
      query.startDate,
      query.endDate,
      query.amountGte,
      query.amountLte,
      query.countries,
      query.currencies,
      query.revenueStatuses,
      query.operator,
      query.sortBy || 'createdAt',
      query.sortOrder || 'desc',
      query.page || 1,
      query.limit || 20,
      query.search,
    );
  }

  @Post('transactions/:messageId/reply')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Role(UserRole.Creator)
  @ApiOperation({ summary: 'Reply to a fan message on Telegram' })
  @ApiCommonResponses()
  async replyToTransaction(
    @Req() req: { user?: AuthUser },
    @Param('messageId') messageId: string,
    @Body() dto: ReplyToMessageDto,
  ): Promise<{ success: boolean; revenueStatus: string }> {
    const firebaseUid = req.user?.user_id;
    if (!firebaseUid) {
      throw new BadRequestException('Missing authenticated Firebase user');
    }
    return this.service.replyToTransaction(
      firebaseUid,
      dto.channelId,
      messageId,
      dto.text,
    );
  }

  @Get('account-statistics')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Role(UserRole.Creator)
  @ApiQuery({
    name: 'accountId',
    required: false,
    description: 'Account ID to retrieve statistics for',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'Country name of the payment provider',
  })
  @ApiQuery({
    name: 'countryCode',
    required: false,
    description: 'ISO 3166-1 alpha-3 country code of the payment provider',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to include (ending today). Default 30.',
    schema: { type: 'number', minimum: 1, maximum: 365, default: 30 },
  })
  @ApiOkResponse({
    description: 'Statistics for an account or country',
    type: AccountStatisticsResponseDto,
  })
  @ApiOperation({
    summary:
      'Account or country level statistics for the authenticated creator',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Sensitive',
        auditLogging: 'No',
        securityConsiderations: [
          'Requires accountId or country/countryCode parameter',
          'Returns statistics for creator-owned accounts only',
          'Transaction counts and revenue aggregation',
          'Time window configurable (1-365 days)',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '400': 'Missing required parameter (accountId or country)',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Retrieves statistics aggregated by payment account or country for the authenticated creator.',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  async getAccountStatistics(
    @Req() req: { user?: AuthUser },
    @Query() query: AccountStatisticsQueryDto,
  ): Promise<AccountStatisticsResponseDto> {
    const firebaseUid = req.user?.user_id;
    if (!firebaseUid) {
      throw new BadRequestException('Missing authenticated Firebase user');
    }
    const { accountId, country, countryCode } = query;
    if (!accountId && !country && !countryCode) {
      throw new BadRequestException(
        'accountId or country/countryCode is required',
      );
    }
    const days = Number(query.days ?? 30);
    return this.service.getAccountStatistics(
      firebaseUid,
      query.channelId,
      accountId,
      country,
      countryCode,
      days,
    );
  }

  @Get('payment-overview')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Role(UserRole.Creator)
  @ApiOkResponse({
    description: 'Payment overview for all countries',
    type: PaymentOverviewResponseDto,
  })
  @ApiOperation({
    summary:
      'Payment overview grouped by country for the authenticated creator',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  async getPaymentOverview(
    @Req() req: { user?: AuthUser },
    @Query() query: PaymentOverviewQueryDto,
  ): Promise<PaymentOverviewResponseDto> {
    const firebaseUid = req.user?.user_id;
    if (!firebaseUid) {
      throw new BadRequestException('Missing authenticated Firebase user');
    }
    const days = Number(query.days ?? 30);
    return this.service.getPaymentOverview(firebaseUid, query.channelId, days);
  }

  @Get('payouts')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Role(UserRole.Creator)
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'Country name of the payment provider',
  })
  @ApiQuery({
    name: 'countryCode',
    required: false,
    description: 'ISO 3166-1 alpha-2 country code of the payment provider',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by transaction ID or beneficiary phone number',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort order by payout timestamp',
    schema: { enum: ['asc', 'desc'], default: 'desc' },
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based). Default 1.',
    schema: { type: 'number', minimum: 1, default: 1 },
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records per page. Default 20.',
    schema: { type: 'number', minimum: 1, maximum: 100, default: 20 },
  })
  @ApiOkResponse({
    description: 'List of payouts for the authenticated creator',
    type: PayoutsResponseDto,
  })
  @ApiOperation({
    summary: 'List payouts for the authenticated creator',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Sensitive',
        auditLogging: 'No',
        securityConsiderations: [
          'Requires country or countryCode parameter',
          'Returns payout history for creator only',
          'Searchable by transaction ID or phone',
          'Paginated and sortable results',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '400': 'Missing required parameter (country or countryCode)',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Retrieves paginated list of completed payouts for the authenticated creator, filtered by country.',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  async getPayouts(
    @Req() req: { user?: AuthUser },
    @Query() query: PayoutsQueryDto,
  ): Promise<PayoutsResponseDto> {
    const firebaseUid = req.user?.user_id;
    if (!firebaseUid) {
      throw new BadRequestException('Missing authenticated Firebase user');
    }
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const sort = query.sort ?? 'desc';
    const { country, countryCode } = query;
    if (!country && !countryCode) {
      throw new BadRequestException('country or countryCode is required');
    }
    return this.service.getPayouts(
      firebaseUid,
      query.channelId,
      country,
      countryCode,
      page,
      limit,
      query.search,
      sort,
    );
  }

  @Get('message-unit-statistics')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Role(UserRole.Creator)
  @ApiOkResponse({
    description: 'Message unit statistics over time',
    type: MessageUnitStatisticsResponseDto,
  })
  @ApiOperation({
    summary: 'Get message unit statistics for the authenticated creator',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Sensitive',
        auditLogging: 'No',
        securityConsiderations: [
          'Returns message unit metrics for creator only',
          'Compares current 30 days vs previous 30 days',
          'Provides 6-month trend data (monthly averages)',
          'Identifies top performing country',
          'Message units = transaction multiplier (1-100x base price)',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Retrieves message unit statistics including current vs previous period comparison, 6-month trend, and top performing country. ' +
      'A message unit represents the multiplier chosen by a fan when sending a message (e.g., 3x multiplier = 3 message units).',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  async getMessageUnitStatistics(
    @Req() req: { user?: AuthUser },
    @Query() query: MessageUnitStatisticsQueryDto,
  ): Promise<MessageUnitStatisticsResponseDto> {
    const firebaseUid = req.user?.user_id;
    if (!firebaseUid) {
      throw new BadRequestException('Missing authenticated Firebase user');
    }
    return this.service.getMessageUnitStatistics(firebaseUid, query.channelId);
  }
}
