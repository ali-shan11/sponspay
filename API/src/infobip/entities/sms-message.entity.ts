import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../creator/entities/user.entity';
import { Account } from '../../accounts/entities/account.entity';
import { AccountVerification } from '../../accounts/entities/account-verification.entity';

@Entity('sms_messages')
export class SmsMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32 })
  to: string;

  @Column({ type: 'varchar', length: 160 })
  text: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  providerMessageId: string | null;

  @Column({ type: 'varchar', length: 64 })
  status: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  statusDescription: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  statusCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @ManyToOne(() => User, { nullable: true })
  user?: User | null;

  @ManyToOne(() => Account, { nullable: true })
  account?: Account | null;

  @ManyToOne(() => AccountVerification, { nullable: true })
  verification?: AccountVerification | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
