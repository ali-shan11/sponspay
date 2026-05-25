import { ApiProperty } from '@nestjs/swagger';

export class ChannelInviteInfoResponseDto {
  @ApiProperty({
    description: 'The Telegram channel handle (username)',
    example: 'johns_channel',
  })
  channelHandle: string;

  @ApiProperty({
    description:
      'The actual Telegram invite link from the database (null for old channels created before invite link generation was implemented)',
    example: 'https://t.me/joinchat/AaBbCcDdEeFfGgHh',
    nullable: true,
  })
  inviteLink: string | null;

  @ApiProperty({
    description: 'The Telegram channel ID (if available)',
    example: '1234567890',
    required: false,
  })
  channelId?: string;

  @ApiProperty({
    description: 'Whether a co-admin has been added to the channel',
    example: false,
  })
  coAdminAdded: boolean;
}
