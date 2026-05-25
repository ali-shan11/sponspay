import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../creator/entities/user.entity';

@Entity('youtube_oauth_tokens')
export class YouTubeOAuthToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  userId: string; // FK to User

  @Column({ type: 'varchar', nullable: true })
  @Index()
  channelId: string | null; // YouTube channel ID this token is authorized for

  @Column({ type: 'text' })
  encryptedRefreshToken: string; // Format: "iv:authTag:ciphertext" (AES-256-GCM)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
