import { ApiProperty } from '@nestjs/swagger';

export class TopEarningCountryCurrencyDto {
  @ApiProperty({
    description: 'Currency short code (ISO 4217 alpha-3), e.g., KES, TZS, ZAR',
    example: 'KES',
  })
  code!: string;

  @ApiProperty({
    description: 'ISO 4217 numeric code if available, e.g., 840 = USD',
    example: 404,
    nullable: true,
    type: Number,
  })
  iso4217Numeric!: number | null;
}

export class TopEarningCountryItemDto {
  @ApiProperty({
    description: 'Country where the payment provider operates',
    example: 'Kenya',
  })
  country!: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-3 country code',
    example: 'KEN',
  })
  countryCode!: string;

  @ApiProperty({
    description: 'Local currency metadata for this country',
    type: TopEarningCountryCurrencyDto,
  })
  currency!: TopEarningCountryCurrencyDto;

  @ApiProperty({
    description: 'Total local currency amount across the window',
    example: 11800.0,
    minimum: 0,
    type: Number,
  })
  localAmountTotal!: number;

  @ApiProperty({
    description: 'Total USD estimated value across the window',
    example: 34.4,
    minimum: 0,
    type: Number,
  })
  usdTotal!: number;
}

export class TopEarningCountriesResponseDto {
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
    description: 'Maximum number of countries requested',
    example: 5,
    minimum: 1,
    maximum: 10,
    type: Number,
  })
  limit!: number;

  @ApiProperty({
    description: 'Sum of usdTotal across items',
    example: 89.5,
    minimum: 0,
    type: Number,
  })
  totalUsd!: number;

  @ApiProperty({
    description:
      'Whether exchange rates were successfully applied to all currency conversions. If false, some usdTotal values may be 0 due to rate lookup failures.',
    example: true,
    type: Boolean,
  })
  exchangeRatesApplied!: boolean;

  @ApiProperty({
    description:
      'Top earning countries by USD total over the local-time window',
    type: [TopEarningCountryItemDto],
  })
  items!: TopEarningCountryItemDto[];
}
