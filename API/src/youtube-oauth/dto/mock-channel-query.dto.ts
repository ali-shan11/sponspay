import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumberString,
  IsBooleanString,
} from 'class-validator';

export class MockChannelQueryDto {
  @ApiPropertyOptional({
    description: 'Enable mock YouTube channel data (non-production only)',
    example: 'true',
  })
  @IsOptional()
  @IsBooleanString()
  mock?: string;

  @ApiPropertyOptional({
    description: 'Mock channel title',
    example: 'African Creator Channel',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Mock subscriber count',
    example: '75000',
  })
  @IsOptional()
  @IsNumberString()
  subscriberCount?: string;

  @ApiPropertyOptional({
    description: 'Mock view count',
    example: '2500000',
  })
  @IsOptional()
  @IsNumberString()
  viewCount?: string;

  @ApiPropertyOptional({
    description: 'Mock video count',
    example: '120',
  })
  @IsOptional()
  @IsNumberString()
  videoCount?: string;
}
