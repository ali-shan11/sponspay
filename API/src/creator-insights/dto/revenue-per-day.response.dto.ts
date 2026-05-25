import { ApiProperty } from '@nestjs/swagger';

export class RevenuePerDayPointDto {
  @ApiProperty({
    description:
      'Local calendar date (YYYY-MM-DD) according to tzOffsetMinutes',
    example: '2025-08-24',
  })
  date!: string;

  @ApiProperty({
    description:
      'Estimated USD revenue for this local day, converted using live exchange rates',
    example: 123.45,
    minimum: 0,
    type: Number,
  })
  revenueUsd!: number;
}

export class RevenuePerDayResponseDto {
  @ApiProperty({
    description: 'Number of local days included (ending today)',
    example: 30,
    minimum: 1,
    maximum: 365,
    type: Number,
  })
  days!: number;

  @ApiProperty({
    description:
      'Timezone offset in minutes. Local time = UTC + tzOffsetMinutes. Example: New York (EDT) = -240, India = +330',
    example: -240,
    minimum: -720,
    maximum: 840,
    type: Number,
  })
  timezoneOffsetMinutes!: number;

  @ApiProperty({
    description: 'First day in the range (local) inclusive, YYYY-MM-DD',
    example: '2025-08-01',
  })
  startDate!: string;

  @ApiProperty({
    description: 'Last day in the range (local) inclusive, YYYY-MM-DD',
    example: '2025-08-30',
  })
  endDate!: string;

  @ApiProperty({
    description:
      'One entry per local day, zero-filled when there are no transactions',
    type: [RevenuePerDayPointDto],
  })
  series!: RevenuePerDayPointDto[];

  @ApiProperty({
    description: 'Sum of all daily values in the series',
    example: 5430.12,
    minimum: 0,
    type: Number,
  })
  totalRevenueUsd!: number;

  @ApiProperty({
    description:
      'Percentage change versus the previous period of equal length. Positive numbers indicate growth, negative numbers a decline. Returns null when there is no previous period data.',
    example: 1.8,
    type: Number,
    nullable: true,
  })
  trendPercentage!: number | null;
}
