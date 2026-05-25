import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ChannelMessagesQueryDto {
  @ApiPropertyOptional({
    description: 'Number of recent messages to fetch from Telegram channel',
    example: 5,
    minimum: 1,
    maximum: 20,
    default: 5,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 5;

  @ApiPropertyOptional({
    description:
      'Referral source (utm_source). Origin of the traffic such as "youtube", "instagram", "email".',
    example: 'youtube',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[a-zA-Z0-9_\-. ]+$/, {
    message: 'referralSource must be alphanumeric with -, _, ., or space',
  })
  referralSource?: string;

  @ApiPropertyOptional({
    description:
      'Referral medium (utm_medium). Marketing medium such as "social", "cpc", "organic".',
    example: 'social',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[a-zA-Z0-9_\-. ]+$/, {
    message: 'referralMedium must be alphanumeric with -, _, ., or space',
  })
  referralMedium?: string;

  @ApiPropertyOptional({
    description:
      'Referral campaign (utm_campaign). Campaign identifier such as "launch_promo".',
    example: 'launch_promo',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[a-zA-Z0-9_\-. ]+$/, {
    message: 'referralCampaign must be alphanumeric with -, _, ., or space',
  })
  referralCampaign?: string;

  @ApiPropertyOptional({
    description: 'Raw document.referrer URL from the browser.',
    example: 'https://www.youtube.com/watch?v=abc123',
    maxLength: 1024,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  referrer?: string;

  @ApiPropertyOptional({
    description:
      'Normalized referring network (derived client-side from document.referrer): ' +
      '"youtube", "instagram", "tiktok", "facebook", "x", "reddit", "telegram", "linkedin", "direct", "other".',
    example: 'youtube',
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^[a-z]+$/, {
    message: 'network must be lowercase letters only',
  })
  network?: string;
}
