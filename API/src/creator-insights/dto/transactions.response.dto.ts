import { ApiProperty } from '@nestjs/swagger';
import { RevenueStatus } from '../../transaction/entities/revenue-status.enum';

export class TransactionItemDto {
  @ApiProperty({
    description: 'Telegram message ID',
    example: '12345',
  })
  messageId!: string;

  @ApiProperty({
    description: 'The actual message text sent by the fan',
    example: 'Great content!',
    nullable: true,
  })
  messageContent!: string | null;

  @ApiProperty({
    description: 'Transaction creation timestamp (ISO 8601 UTC)',
    example: '2025-01-15T14:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Country of the payment provider',
    example: 'Kenya',
  })
  country!: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-3 country code',
    example: 'KEN',
  })
  countryCode!: string;

  @ApiProperty({
    description: 'Transaction amount in local currency',
    example: 100.0,
    minimum: 0,
    type: Number,
  })
  localAmount!: number;

  @ApiProperty({
    description: 'ISO 4217 currency code of the local amount',
    example: 'KES',
  })
  localCurrencyCode!: string;

  @ApiProperty({
    description: 'UTM referral source',
    example: 'twitter',
    nullable: true,
  })
  referralSource!: string | null;

  @ApiProperty({
    description: 'UTM referral medium',
    example: 'social',
    nullable: true,
  })
  referralMedium!: string | null;

  @ApiProperty({
    description: 'Revenue status indicating if creator has earned this revenue',
    enum: RevenueStatus,
    example: RevenueStatus.AwaitingReply,
  })
  revenueStatus!: RevenueStatus;

  @ApiProperty({
    description: 'Price multiplier chosen by fan (1-100x base price)',
    example: 1,
    minimum: 1,
    type: Number,
  })
  multiplier!: number;

  @ApiProperty({
    description:
      'Deadline to respond to message (ISO 8601). Only present if revenueStatus is awaiting-reply or auto-replied. Calculated as createdAt + 14 days.',
    example: '2025-01-29T14:30:00.000Z',
    nullable: true,
  })
  replyDeadline!: string | null;

  @ApiProperty({
    description:
      'Direct link to the Telegram message (https://t.me/{channelHandle}/{messageId})',
    example: 'https://t.me/my_channel/12345',
    nullable: true,
  })
  telegramMessageLink!: string | null;
}

export class AvailableCountryDto {
  @ApiProperty({
    description: 'ISO 3166-1 alpha-3 country code',
    example: 'KEN',
  })
  countryCode!: string;

  @ApiProperty({
    description: 'Full country name',
    example: 'Republic of Kenya',
  })
  countryName!: string;

  @ApiProperty({
    description:
      'ISO 4217 currency codes used in transactions from this country',
    example: ['KES'],
    type: [String],
  })
  currencies!: string[];
}

export class TransactionsResponseDto {
  @ApiProperty({
    description: 'Start of date range (UTC, YYYY-MM-DD, inclusive)',
    example: '2025-01-01',
  })
  startDate!: string;

  @ApiProperty({
    description: 'End of date range (UTC, YYYY-MM-DD, inclusive)',
    example: '2025-01-31',
  })
  endDate!: string;

  @ApiProperty({
    description: 'Current page (1-based)',
    example: 1,
    minimum: 1,
    type: Number,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of records per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    type: Number,
  })
  limit!: number;

  @ApiProperty({
    description:
      'Transactions within the date range, sorted by specified field and order',
    type: [TransactionItemDto],
  })
  items!: TransactionItemDto[];

  @ApiProperty({
    description: 'Total number of transactions matching the filters',
    example: 42,
    minimum: 0,
    type: Number,
  })
  totalRecords!: number;

  @ApiProperty({
    description:
      "All distinct countries with their currencies from this creator's succeeded transactions (not scoped to date range or filters)",
    type: [AvailableCountryDto],
  })
  availableCountries!: AvailableCountryDto[];
}
