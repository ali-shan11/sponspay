import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCreatorDto {
  @ApiProperty({
    description:
      'YouTube channel ID selected by user during onboarding. Backend fetches channel name and subscriber count via YouTube OAuth.',
  })
  @IsString()
  @IsNotEmpty()
  youtubeChannelId: string;

  @ApiProperty({ description: 'Telegram channel handle chosen by user' })
  @IsString()
  @IsNotEmpty()
  telegramHandle: string;

  @ApiProperty({
    description: 'Percentage of YouTube paying users (from revenue estimator)',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  youtubePayingUsersPercentage: number;

  @ApiProperty({
    description: 'Percentage of SponsPay paying users (from revenue estimator)',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  sponspayPayingUsersPercentage: number;
}
