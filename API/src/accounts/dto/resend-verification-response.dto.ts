import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationResponseDto {
  @ApiProperty({
    description: 'Whether the account is already verified',
    example: false,
  })
  alreadyVerified: boolean;

  @ApiProperty({
    description: 'Message describing the result of the operation',
    example: 'Verification code sent successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Whether a new verification code was sent',
    example: true,
  })
  codeSent: boolean;
}
