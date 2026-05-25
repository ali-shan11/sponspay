import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user.enum';

export class CreatorOnboardingResponseDto {
  @ApiProperty({ description: 'Success status of the onboarding process' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({
    description: 'Whether the user has been onboarded as a creator',
  })
  isCreator: boolean;

  @ApiProperty({
    description: 'Whether a co-admin has already been added to the channel',
  })
  isCoAdmin: boolean;

  @ApiProperty({
    description: 'Whether the user has accepted any terms and conditions',
  })
  hasAcceptedTerms: boolean;

  @ApiProperty({ description: 'Onboarding data', required: false })
  data?: {
    userId: string;
    youtubeChannelId: string;
    telegramChannelHandle: string;
    role: UserRole;
  };
}
