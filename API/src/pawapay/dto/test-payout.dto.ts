import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  ValidateNested,
  IsOptional,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TestMobilePartyDto, TestMetadataDto } from './test-deposit.dto';

/**
 * v2 Payout Request DTO
 * @see https://docs.pawapay.io/v2/api-reference/payouts/initiate-payout
 */
export class TestPayoutDto {
  @ApiProperty({
    description:
      'Recipient mobile money details (v2 structure with nested provider)',
    type: TestMobilePartyDto,
  })
  @ValidateNested()
  @Type(() => TestMobilePartyDto)
  recipient: TestMobilePartyDto;

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
    example: 'Test payout',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerMessage?: string;

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
