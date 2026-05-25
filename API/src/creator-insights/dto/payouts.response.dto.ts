import { ApiProperty } from '@nestjs/swagger';

export class PayoutItemDto {
  @ApiProperty({ description: 'ID of the related transaction' })
  transactionId!: string;

  @ApiProperty({ description: 'Phone number of the beneficiary account' })
  beneficiaryPhone!: string;

  @ApiProperty({ description: 'Payment provider name' })
  paymentProvider!: string;

  @ApiProperty({
    description: 'Amount sent in local currency',
    example: 100.0,
    type: Number,
  })
  amount!: number;

  @ApiProperty({
    description: 'Approximate USD value at time of payout',
    example: 9.25,
    type: Number,
  })
  usdEstimatedValue!: number;

  @ApiProperty({ description: 'Status ID from payment status table' })
  statusId!: string;

  @ApiProperty({ description: 'Invoice ID if available', nullable: true })
  invoiceId!: string | null;

  @ApiProperty({
    description: 'UTC timestamp when the payout was initiated',
    example: '2025-06-10T12:00:00.000Z',
  })
  initiatedAt!: string;
}

export class PayoutsResponseDto {
  @ApiProperty({
    description: 'Current page (1-based)',
    example: 1,
    type: Number,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of records per page',
    example: 20,
    type: Number,
  })
  limit!: number;

  @ApiProperty({ description: 'Payout items', type: [PayoutItemDto] })
  items!: PayoutItemDto[];
}
