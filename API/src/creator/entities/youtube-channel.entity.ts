import { IsNotEmpty, IsString } from 'class-validator';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ChannelSnapshot } from './channel-snapshot.entity';
import { TelegramChannel } from './telegram-channel.entity';
import { UserChannel } from './user-channel.entity';

@Entity('youtube_channels')
export class YouTubeChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  channelId: string; // YouTube channel ID (unique across platform)

  @Column()
  @IsNotEmpty()
  @IsString()
  channelName: string;

  // Fee percentage charged on transactions (e.g., 15.00 = 15%)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: '15.00' })
  feePercentage: string;

  @OneToMany(() => ChannelSnapshot, (snapshot) => snapshot.channel)
  snapshots: ChannelSnapshot[];

  @OneToMany(() => UserChannel, (uc) => uc.youtubeChannel)
  userChannels: UserChannel[];

  @OneToOne(() => TelegramChannel, (tc) => tc.youtubeChannel)
  telegramChannel: TelegramChannel;

  @CreateDateColumn()
  createdAt: Date;
}
