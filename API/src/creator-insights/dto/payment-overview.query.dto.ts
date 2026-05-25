import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentOverviewQueryDto {
  @ApiProperty({
    description: 'YouTube channel ID (UUID) to scope statistics to',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  channelId: string;

  @ApiPropertyOptional({
    description: 'Number of days to include (ending today). Default 30.',
    minimum: 1,
    maximum: 365,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}
