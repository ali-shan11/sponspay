import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { YouTubeChannel } from './youtube-channel.entity';

@Entity('channel_snapshots')
export class ChannelSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  channelId: string; // FK to YouTubeChannel

  @Column('bigint')
  @IsNumber()
  totalSubscribers: number;

  @Column('jsonb')
  @IsObject()
  countryAnalysis: object; // Store the country data as JSON

  @Column('decimal', { precision: 5, scale: 2 })
  @IsNumber()
  @Min(0)
  @Max(100)
  youtubePayingUsersPercentage: number;

  @Column('decimal', { precision: 5, scale: 2 })
  @IsNumber()
  @Min(0)
  @Max(100)
  sponspayPayingUsersPercentage: number;

  @ManyToOne(() => YouTubeChannel, (channel) => channel.snapshots)
  @JoinColumn({ name: 'channelId' })
  channel: YouTubeChannel;

  @CreateDateColumn()
  createdAt: Date;
}
