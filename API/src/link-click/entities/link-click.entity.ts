import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Column,
  Index,
} from 'typeorm';
import { TelegramChannel } from '../../creator/entities/telegram-channel.entity';

@Entity('link_clicks')
export class LinkClick {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TelegramChannel, { nullable: false })
  @JoinColumn({ name: 'telegram_channel_id' })
  telegramChannel: TelegramChannel;

  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true })
  referralSource: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  referralMedium: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  referralCampaign: string | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  referrerUrl: string | null;

  @Index()
  @Column({ type: 'varchar', length: 32, nullable: true })
  referrerNetwork: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
