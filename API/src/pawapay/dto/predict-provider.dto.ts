import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class PredictProviderDto {
  @ApiProperty({
    description:
      'Phone number with country code. PawaPay sanitizes input (removes +, whitespace, non-numeric chars).',
    example: '260763456789',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @MaxLength(15)
  phoneNumber!: string;
}

export class PredictProviderResponseDto {
  @ApiProperty({
    description: 'ISO 3166-1 alpha-3 country code',
    example: 'ZMB',
  })
  country!: string;

  @ApiProperty({
    description: 'PawaPay provider identifier',
    example: 'MTN_MOMO_ZMB',
  })
  provider!: string;

  @ApiProperty({
    description: 'Formatted phone number for API use',
    example: '260763456789',
  })
  phoneNumber!: string;
}
