import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { YouTubeChannel } from './youtube-channel.entity';

export enum UserChannelRole {
  Owner = 'owner',
  Manager = 'manager',
}

@Entity('user_channels')
@Unique(['userId', 'youtubeChannelId'])
export class UserChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.userChannels, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  youtubeChannelId: string;

  @ManyToOne(() => YouTubeChannel, (ch) => ch.userChannels, {
    nullable: false,
  })
  @JoinColumn({ name: 'youtubeChannelId' })
  youtubeChannel: YouTubeChannel;

  @Column({
    type: 'enum',
    enum: UserChannelRole,
    default: UserChannelRole.Owner,
  })
  role: UserChannelRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
