import { ApiProperty } from '@nestjs/swagger';

export class SignInResponseDto {
  @ApiProperty({
    description: 'Indicates whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Human-readable message about the operation result',
    example: 'Contact created or updated successfully in ZohoCRM',
  })
  message: string;

  @ApiProperty({
    description:
      'User database ID. Returned when user is created or found in the database. ' +
      'Only included if Firebase UID was provided during sign-in.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  userId?: string;

  @ApiProperty({
    description:
      'Whether the user has been onboarded as a creator (has Creator or Admin role). ' +
      'Only included if user exists in the database.',
    example: true,
    required: false,
  })
  isCreator?: boolean;

  @ApiProperty({
    description:
      "Whether a co-admin has been added to the creator's Telegram channel. " +
      'Only included if user exists in the database.',
    example: false,
    required: false,
  })
  isCoAdmin?: boolean;

  @ApiProperty({
    description:
      'Whether the creator has accepted the platform terms and conditions. ' +
      'Only included if user exists in the database.',
    example: false,
    required: false,
  })
  hasAcceptedTerms?: boolean;

  @ApiProperty({
    description:
      'Whether the user has connected their YouTube channel via OAuth. ' +
      'Only included if user exists in the database.',
    example: false,
    required: false,
  })
  youtubeConnected?: boolean;
}
