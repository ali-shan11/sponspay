import { ApiProperty } from '@nestjs/swagger';

export class CoAdminStatusResponseDto {
  @ApiProperty({
    description: 'Whether the user has been promoted to co-admin',
    example: true,
  })
  coAdminAdded: boolean;

  @ApiProperty({
    description: 'The Telegram channel handle',
    example: 'mychannel',
  })
  channelHandle: string;

  @ApiProperty({
    description: 'The Telegram channel ID',
    example: '-1001234567890',
  })
  channelId: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when this status was last checked',
    example: '2025-11-02T14:30:15.000Z',
  })
  lastChecked: string;
}
