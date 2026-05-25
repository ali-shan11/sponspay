import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsUUID,
} from 'class-validator';

export class AccountStatisticsQueryDto {
  @ApiProperty({
    description: 'YouTube channel ID (UUID) to scope statistics to',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  channelId: string;

  @ApiProperty({
    required: false,
    description: 'Account ID to retrieve statistics for',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiProperty({
    required: false,
    description: 'Country name corresponding to the payment provider',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    required: false,
    description: 'ISO 3166-1 alpha-3 country code of the payment provider',
  })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({
    required: false,
    description: 'Number of days to include (ending today). Default 30.',
    minimum: 1,
    maximum: 365,
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;
}
