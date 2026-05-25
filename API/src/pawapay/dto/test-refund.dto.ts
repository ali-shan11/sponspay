import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TestMetadataDto } from './test-deposit.dto';

export class TestRefundDto {
  @ApiProperty({
    description: 'The depositId of the deposit to be refunded',
    example: 'f4401bd2-1568-4140-bf2d-eb77d2b2b639',
  })
  @IsString()
  @IsNotEmpty()
  depositId: string;

  @ApiProperty({
    description:
      'Refund amount as decimal string (0-2 decimals, REQUIRED in v2)',
    example: '15.00',
  })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: 'ISO 4217 currency code (REQUIRED in v2)',
    example: 'ZMW',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

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
