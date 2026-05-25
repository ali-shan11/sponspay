import { IsString, IsNotEmpty } from 'class-validator';

export class CheckChannelNameDTO {
  @IsString()
  @IsNotEmpty()
  channelName: string;
}
