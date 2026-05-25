import { ApiProperty } from '@nestjs/swagger';

export class PawapayProviderAvailabilityDto {
  @ApiProperty({ description: 'Identifier of the payment provider' })
  id!: string;

  @ApiProperty({
    description: 'Display name for the provider',
    example: 'MTN MOMO GHA',
  })
  name!: string;

  @ApiProperty({
    description: 'Availability payload returned by PawaPay',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  availability!: Record<string, unknown> | null;
}
