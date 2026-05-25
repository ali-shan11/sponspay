import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MessageUnitStatisticsQueryDto {
  @ApiProperty({
    description: 'YouTube channel ID (UUID) to scope message unit statistics',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsUUID()
  channelId: string;
}
