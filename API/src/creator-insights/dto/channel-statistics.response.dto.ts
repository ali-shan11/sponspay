import { ApiProperty } from '@nestjs/swagger';

export class ChannelStatisticsResponseDto {
  @ApiProperty({ description: 'Latest telegram channel handle' })
  channelHandle: string | null;

  @ApiProperty({ description: 'Number of link clicks in the period' })
  linkClicks: number;

  @ApiProperty({
    description: 'Number of transactions where user is beneficiary',
  })
  transactions: number;

  @ApiProperty({
    description:
      'Percentage change in transactions compared to the previous period. Null when no prior period data exists.',
    nullable: true,
  })
  transactionTrend: number | null;
}
