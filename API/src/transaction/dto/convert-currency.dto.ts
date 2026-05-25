import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Matches } from 'class-validator';

export class ConvertCurrencyDto {
  @ApiProperty({
    description: 'Source currency code (ISO 4217)',
    example: 'EUR',
    pattern: '^[A-Z]{3}$',
  })
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency code must be a 3-letter uppercase ISO 4217 code',
  })
  from: string;

  @ApiProperty({
    description:
      'Target currency code (ISO 4217). Defaults to USD if not provided.',
    example: 'USD',
    pattern: '^[A-Z]{3}$',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency code must be a 3-letter uppercase ISO 4217 code',
  })
  to?: string;

  @ApiProperty({
    description: 'Amount to convert',
    example: 100,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;
}
