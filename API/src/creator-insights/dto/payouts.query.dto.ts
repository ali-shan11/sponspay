import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  IsISO31661Alpha2,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PayoutsQueryDto {
  @ApiProperty({
    description: 'YouTube channel ID (UUID) to scope payouts to',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  channelId: string;

  @ApiPropertyOptional({
    description: 'Country name of the payment provider',
    example: 'Kenya',
  })
  @ValidateIf((o) => !o.countryCode)
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'ISO 3166-1 alpha-2 country code of the payment provider',
    example: 'KE',
  })
  @ValidateIf((o) => !o.country)
  @IsISO31661Alpha2()
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Search by transaction id or beneficiary phone number',
    example: 'KJ-9JVB2K0H3',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort order by payout timestamp',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
