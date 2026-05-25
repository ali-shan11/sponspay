import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TestMobilePartyDto {
  @ApiProperty({
    description: 'MSISDN in international format without the leading +',
    example: '260763456789',
  })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({
    description: 'Payment provider code (e.g., MTN_MOMO_ZMB)',
    example: 'MTN_MOMO_ZMB',
  })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-3 country code',
    example: 'ZMB',
  })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({
    description: 'Optional account alias',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  alias?: string;
}

/**
 * PawaPay metadata accepts flexible key-value objects.
 * This is a minimal validation DTO - actual metadata can have any keys.
 *
 * @example { "orderId": "ORD-123", "isPII": false }
 * @example { "transactionId": "uuid", "isPII": true }
 */
export class TestMetadataDto {
  // Allow any properties - PawaPay supports flexible metadata structure
  [key: string]: unknown;
}

/**
 * v2 Deposit Request DTO
 * @see https://docs.pawapay.io/v2/api-reference/deposits/initiate-deposit
 */
export class TestDepositDto {
  @ApiProperty({
    description:
      'Payer mobile money details (v2 structure with nested provider)',
    type: TestMobilePartyDto,
  })
  @ValidateNested()
  @Type(() => TestMobilePartyDto)
  payer: TestMobilePartyDto;

  @ApiProperty({
    description: 'Decimal string amount (0-2 decimals)',
    example: '15.00',
  })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: 'ISO 4217 currency code',
    example: 'ZMW',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Optional customer message (4-22 alphanumeric characters)',
    example: 'Test deposit',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerMessage?: string;

  @ApiProperty({
    description: 'Optional pre-authorization code',
    example: 'AUTH123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  preAuthorisationCode?: string;

  @ApiProperty({
    description: 'Optional metadata array',
    type: [TestMetadataDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestMetadataDto)
  metadata?: TestMetadataDto[];
}
