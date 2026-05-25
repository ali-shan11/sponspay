import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class PawapayAvailabilityQueryDto {
  @ApiProperty({
    description: 'ISO 3166-1 alpha-3 country code',
    example: 'KEN',
  })
  @IsString()
  @Length(3, 3)
  countryCode!: string;
}
