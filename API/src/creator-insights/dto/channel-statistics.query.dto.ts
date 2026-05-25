import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChannelStatisticsQueryDto {
  @ApiProperty({
    description: 'YouTube channel ID (UUID) to scope statistics',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsUUID()
  channelId: string;

  @ApiPropertyOptional({
    description: 'Number of days to include (ending today)',
    example: 30,
    minimum: 1,
    maximum: 365,
    default: 30,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}
