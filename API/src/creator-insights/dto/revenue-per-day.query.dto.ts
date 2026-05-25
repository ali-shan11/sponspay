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

export class RevenuePerDayQueryDto {
  @ApiProperty({
    description: 'YouTube channel ID (UUID) to scope revenue data',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsUUID()
  channelId: string;

  @ApiPropertyOptional({
    description: 'Number of local days to include (ending today)',
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

  @ApiPropertyOptional({
    description:
      'Timezone offset in minutes; local time = UTC + tzOffsetMinutes. Example: New York (EDT) = -240, India = +330',
    example: -240,
    minimum: -720,
    maximum: 840,
    default: 0,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-720)
  @Max(840)
  tzOffsetMinutes?: number;
}
