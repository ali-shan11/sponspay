import { ApiProperty } from '@nestjs/swagger';

export class PaymentOperatorDto {
  @ApiProperty({
    description: 'Internal operator name (used for payment requests)',
    example: 'MTN_MOMO_ZMB',
  })
  name: string;

  @ApiProperty({
    description: 'Human-readable operator name',
    example: 'MTN MOMO ZMB',
  })
  displayName: string;

  @ApiProperty({
    description: 'Operator availability status for deposits',
    enum: ['OPERATIONAL', 'DELAYED'],
    example: 'OPERATIONAL',
  })
  status: 'OPERATIONAL' | 'DELAYED';

  @ApiProperty({
    description:
      'Effective minimum price for this operator (max of configured currency price and provider minimum, rounded up)',
    example: 50.0,
  })
  price: number;

  @ApiProperty({
    description:
      'Maximum price multiple allowed (floor of maxPrice / price, capped at 100)',
    example: 100,
  })
  maxMultiple: number;
}

export class PaymentCountryDto {
  @ApiProperty({
    description: 'ISO 3166-1 alpha-3 country code',
    example: 'ZMB',
  })
  countryCode: string;

  @ApiProperty({
    description: 'Country name',
    example: 'Zambia',
  })
  countryName: string;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'ZMW',
  })
  currency: string;

  @ApiProperty({
    description: 'Available payment operators in this country',
    type: [PaymentOperatorDto],
  })
  operators: PaymentOperatorDto[];
}
