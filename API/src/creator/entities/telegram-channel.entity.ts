import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { YouTubeChannel } from './youtube-channel.entity';

@Entity('telegram_channels')
export class TelegramChannel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'channel_handle',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  channelHandle: string;

  @Column({ name: 'channel_id', type: 'varchar', length: 255, nullable: true })
  channelId?: string;

  // YouTube channel this Telegram channel is paired with
  @Column({ name: 'youtube_channel_id', type: 'uuid', nullable: true })
  youtubeChannelId: string | null;

  @OneToOne(() => YouTubeChannel, { nullable: true })
  @JoinColumn({ name: 'youtube_channel_id' })
  youtubeChannel: YouTubeChannel | null;

  @Column({ name: 'co_admin_added', type: 'boolean', default: false })
  coAdminAdded: boolean;

  @Column({ name: 'invite_link', type: 'varchar', length: 500, nullable: true })
  inviteLink?: string;

  @Column({
    name: 'fan_invite_link',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  fanInviteLink?: string;

  @Column({
    name: 'joined_user_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  joinedUserId?: string;

  @Column({ name: 'promotion_attempts', type: 'int', default: 0 })
  promotionAttempts: number;

  @Column({ name: 'last_promotion_error', type: 'text', nullable: true })
  lastPromotionError?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
