import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AcceptTermsDto {
  @ApiProperty({
    description:
      'The version number of the terms and conditions being accepted. Must be a valid, published version obtained from GET /terms/latest endpoint.',
    example: 1,
    minimum: 1,
    type: 'integer',
  })
  @IsInt()
  @Min(1)
  version: number;
}
