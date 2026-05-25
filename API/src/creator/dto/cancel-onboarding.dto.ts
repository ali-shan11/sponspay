import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelOnboardingDto {
  @ApiProperty({
    description:
      'Optional reason for cancelling the onboarding process. This can help understand drop-off points in the funnel.',
    example: 'Changed my mind about monetization',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    description:
      'Whether the user wants to receive updates about new features and availability. Defaults to false if not provided.',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  wantsUpdates?: boolean;
}
