import { ApiProperty } from '@nestjs/swagger';

/**
 * Statistics for a 30-day period (current or previous)
 */
class PeriodStatistics {
  @ApiProperty({
    description:
      'Total earnings in USD (estimate based on live exchange rates)',
    example: 125.5,
  })
  totalUsd: number;

  @ApiProperty({
    description: 'Average daily earnings in USD (estimate)',
    example: 4.18,
  })
  averageUsd: number;

  @ApiProperty({
    description: 'Number of transactions in the period',
    example: 123,
  })
  transactionCount: number;
}

/**
 * Monthly average for trend data
 */
class MonthlyAverage {
  @ApiProperty({
    description: 'Month in YYYY-MM format',
    example: '2025-01',
  })
  month: string;

  @ApiProperty({
    description: 'Average daily earnings in USD for this period (estimate)',
    example: 3.25,
  })
  averagePerDayUsd: number;
}

/**
 * Top performing country by USD earnings
 */
class TopCountry {
  @ApiProperty({
    description: 'ISO 3166-1 alpha-3 country code',
    example: 'KEN',
  })
  countryCode: string;

  @ApiProperty({
    description: 'Country name',
    example: 'Kenya',
    nullable: true,
  })
  countryName: string | null;

  @ApiProperty({
    description:
      'Total earnings from this country in USD (estimate based on live exchange rates)',
    example: 85.2,
  })
  totalUsd: number;
}

/**
 * Response DTO for message unit statistics endpoint.
 * All monetary values are USD estimates based on live exchange rates.
 */
export class MessageUnitStatisticsResponseDto {
  @ApiProperty({
    description: 'Statistics for the current 30-day period',
    type: PeriodStatistics,
  })
  current30Days: PeriodStatistics;

  @ApiProperty({
    description: 'Statistics for the previous 30-day period (30-60 days ago)',
    type: PeriodStatistics,
  })
  previous30Days: PeriodStatistics;

  @ApiProperty({
    description:
      'Percentage change from previous period to current period, or null if no previous data',
    example: 25.5,
    nullable: true,
  })
  changePercentage: number | null;

  @ApiProperty({
    description:
      'Average daily earnings in USD for each of the last 6 months (oldest to newest)',
    type: [MonthlyAverage],
    isArray: true,
  })
  monthlyAverages: MonthlyAverage[];

  @ApiProperty({
    description:
      'All countries sorted by USD earnings (highest first) in the last 30 days (estimate)',
    type: [TopCountry],
    isArray: true,
  })
  topCountries: TopCountry[];
}
