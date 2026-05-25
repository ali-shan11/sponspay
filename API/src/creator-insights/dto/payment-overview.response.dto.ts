import { ApiProperty } from '@nestjs/swagger';

export class PaymentOverviewItemDto {
  @ApiProperty({ description: 'ISO 3166-1 alpha-3 country code' })
  countryCode: string;

  @ApiProperty({ description: 'ISO 4217 currency code (e.g. KES)' })
  localCurrencyCode: string;

  @ApiProperty({
    description: 'Whether the creator has a payment account for this country',
  })
  hasAccount: boolean;

  @ApiProperty()
  totalLocal: number;

  @ApiProperty()
  totalUsd: number;

  @ApiProperty({ nullable: true })
  nextPayAmountLocal: number | null;

  @ApiProperty({ nullable: true })
  nextPayAmountUsd: number | null;

  @ApiProperty({ nullable: true })
  nextPayDate: string | null;

  @ApiProperty()
  premiumMessages: number;

  @ApiProperty()
  livestreamMessages: number;

  @ApiProperty()
  videoMessages: number;

  @ApiProperty()
  livestreamTotalLocal: number;

  @ApiProperty()
  livestreamTotalUsd: number;

  @ApiProperty()
  videoTotalLocal: number;

  @ApiProperty()
  videoTotalUsd: number;

  @ApiProperty()
  uniqueLivestreams: number;

  @ApiProperty()
  averageMessageValue: number;

  @ApiProperty()
  totalFees: number;

  @ApiProperty()
  averageFee: number;

  @ApiProperty({ description: 'Fees as a percentage of total revenue' })
  feePercentage: number;
}

export class PaymentOverviewResponseDto {
  @ApiProperty()
  days: number;

  @ApiProperty({ type: [PaymentOverviewItemDto] })
  items: PaymentOverviewItemDto[];
}
