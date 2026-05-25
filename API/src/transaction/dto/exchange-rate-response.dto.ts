import { ApiProperty } from '@nestjs/swagger';

export class ExchangeRateResponseDto {
  @ApiProperty({
    description: 'Result status',
    example: 'success',
    enum: ['success', 'error'],
  })
  result: string;

  @ApiProperty({
    description: 'API documentation URL',
    example: 'https://www.exchangerate-api.com/docs',
  })
  documentation: string;

  @ApiProperty({
    description: 'Terms of use URL',
    example: 'https://www.exchangerate-api.com/terms',
  })
  terms_of_use: string;

  @ApiProperty({
    description: 'Unix timestamp of last rate update',
    example: 1585267200,
  })
  time_last_update_unix: number;

  @ApiProperty({
    description: 'UTC timestamp of last rate update',
    example: 'Fri, 27 Mar 2020 00:00:00 +0000',
  })
  time_last_update_utc: string;

  @ApiProperty({
    description: 'Unix timestamp of next rate update',
    example: 1585270800,
  })
  time_next_update_unix: number;

  @ApiProperty({
    description: 'UTC timestamp of next rate update',
    example: 'Sat, 28 Mar 2020 01:00:00 +0000',
  })
  time_next_update_utc: string;

  @ApiProperty({
    description: 'Source currency code',
    example: 'EUR',
  })
  base_code: string;

  @ApiProperty({
    description: 'Target currency code',
    example: 'GBP',
  })
  target_code: string;

  @ApiProperty({
    description: 'Conversion rate from base to target currency',
    example: 0.8412,
  })
  conversion_rate: number;

  @ApiProperty({
    description:
      'Converted amount (only present when amount is provided in request)',
    example: 5.8884,
    required: false,
  })
  conversion_result?: number;
}

export class ExchangeRateErrorResponseDto {
  @ApiProperty({
    description: 'Result status',
    example: 'error',
  })
  result: string;

  @ApiProperty({
    description: 'Error type',
    example: 'unsupported-code',
    enum: [
      'unsupported-code',
      'malformed-request',
      'invalid-key',
      'inactive-account',
      'quota-reached',
    ],
  })
  'error-type': string;
}
