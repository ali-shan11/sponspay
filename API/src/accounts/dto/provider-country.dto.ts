import { ApiProperty } from '@nestjs/swagger';

export class ProviderCountryDto {
  @ApiProperty({
    description: 'Human-readable country name for the payment provider',
    example: 'Kenya',
  })
  country!: string;

  @ApiProperty({
    description:
      'ISO 3166-1 alpha-3 country code associated with the payment provider',
    example: 'KEN',
  })
  countryCode!: string;
}
