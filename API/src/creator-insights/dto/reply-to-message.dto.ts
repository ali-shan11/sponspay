import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyToMessageDto {
  @ApiProperty({
    description: 'The reply message text',
    example: 'Thank you for your message!',
    maxLength: 4096,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  text!: string;

  @ApiProperty({
    description: 'YouTube channel ID to scope the reply',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  channelId!: string;
}
