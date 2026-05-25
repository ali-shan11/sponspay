import { ApiProperty } from '@nestjs/swagger';

export class AccountStatisticsResponseDto {
  @ApiProperty({ description: 'ISO 4217 currency code (e.g. KES)' })
  localCurrencyCode: string;

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

  @ApiProperty({ nullable: true })
  mobileNumber: string | null;

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
}
