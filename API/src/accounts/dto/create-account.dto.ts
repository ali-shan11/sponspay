import {
  IsString,
  IsNotEmpty,
  IsPhoneNumber,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Phone number for the account',
    example: '+1234567890',
  })
  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({
    description: 'Full name of the account holder',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiPropertyOptional({
    description: 'Optional nickname for the account',
    example: 'My Main Account',
  })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({
    description: 'Payment provider name (e.g., MTN_MOMO_KEN, AIRTEL_UGA)',
    example: 'MTN_MOMO_KEN',
  })
  @IsNotEmpty()
  @IsString()
  providerName: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-3 country code',
    example: 'KEN',
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 3, { message: 'Country code must be exactly 3 characters' })
  @Matches(/^[A-Z]{3}$/, {
    message: 'Country code must be 3 uppercase letters (ISO 3166-1 alpha-3)',
  })
  countryCode: string;
}
