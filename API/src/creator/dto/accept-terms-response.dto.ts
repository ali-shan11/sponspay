import { ApiProperty } from '@nestjs/swagger';

export class AcceptTermsResponseDto {
  @ApiProperty({
    description: 'Indicates whether the terms acceptance was successful',
    example: true,
    type: 'boolean',
  })
  success: boolean;

  @ApiProperty({
    description:
      'Human-readable message describing the result of the operation',
    example: 'Terms and conditions accepted successfully',
    type: 'string',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'The version number of the terms that were accepted',
    example: 1,
    type: 'integer',
    required: false,
  })
  acceptedVersion?: number;

  @ApiProperty({
    description: 'Timestamp when the terms were accepted (ISO 8601 format)',
    example: '2025-01-09T21:58:00.000Z',
    type: 'string',
    format: 'date-time',
    required: false,
  })
  acceptedAt?: string;
}
