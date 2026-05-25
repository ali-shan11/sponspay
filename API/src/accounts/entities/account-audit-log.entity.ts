import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Account } from './account.entity';
import { User } from '../../creator/entities/user.entity';

export enum AuditEventType {
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_UPDATED = 'ACCOUNT_UPDATED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  ACCOUNT_RESTORED = 'ACCOUNT_RESTORED',
  ACCOUNT_ANONYMIZED = 'ACCOUNT_ANONYMIZED',
  ACCOUNT_TAKEOVER = 'ACCOUNT_TAKEOVER',
  VERIFICATION_SENT = 'VERIFICATION_SENT',
  VERIFICATION_ATTEMPTED = 'VERIFICATION_ATTEMPTED',
  VERIFICATION_SUCCESS = 'VERIFICATION_SUCCESS',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  VERIFICATION_EXPIRED = 'VERIFICATION_EXPIRED',
  VERIFICATION_RESENT = 'VERIFICATION_RESENT',
}

@Entity('account_audit_logs')
@Index(['accountId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
export class AccountAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id' })
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({
    type: 'enum',
    enum: AuditEventType,
  })
  action: AuditEventType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
