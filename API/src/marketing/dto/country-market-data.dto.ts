import { ApiProperty } from '@nestjs/swagger';

export class CountryMarketDataDto {
  @ApiProperty({
    description: 'ISO 3166-1 alpha-3 country code',
    example: 'KEN',
  })
  iso3Code: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'KE',
  })
  iso2Code: string;

  @ApiProperty({
    description: 'Country name',
    example: 'Kenya',
  })
  name: string;

  @ApiProperty({
    description: 'Credit card penetration percentage (0-100)',
    example: 4.4,
  })
  creditCardPenetration: number;

  @ApiProperty({
    description: 'Mobile phone penetration percentage (0-100)',
    example: 92.7,
  })
  mobilePenetration: number;
}
