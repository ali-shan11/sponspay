import { ApiProperty } from '@nestjs/swagger';

export class VerificationErrorResponseDto {
  @ApiProperty({
    example: 400,
    description: 'HTTP status code',
  })
  statusCode: number;

  @ApiProperty({
    examples: [
      'No verification code found. Please request a new verification code.',
      'Too many failed attempts. Please request a new verification code.',
      'Verification code has expired. Please request a new code.',
      'Invalid verification code. 2 attempts remaining.',
      'Invalid verification code. 1 attempt remaining.',
      'Invalid verification code. Too many failed attempts. Please request a new verification code.',
    ],
    description: 'Detailed error message explaining the verification failure',
  })
  message: string;

  @ApiProperty({
    example: 'Bad Request',
    description: 'Error type',
  })
  error: string;
}
