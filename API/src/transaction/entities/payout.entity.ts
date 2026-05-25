import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { Account } from '../../accounts/entities/account.entity';
import { TransactionStatus } from './transaction-status.entity';

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => Transaction, (tx) => tx.payout)
  transactions: Transaction[];

  @ManyToOne(() => Account, { nullable: false })
  beneficiary: Account;

  // Payment provider information (denormalized)
  @Column({ type: 'varchar', length: 128 })
  providerName: string;

  @Index()
  @Column({ type: 'varchar', length: 3 })
  providerCountryCode: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  usdEstimatedValue: string;

  @ManyToOne(() => TransactionStatus, { nullable: false })
  status: TransactionStatus;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  invoiceId: string | null;

  // PawaPay payout tracking (from callbacks)
  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  pawapayPayoutId: string | null; // PawaPay's UUID for this payout

  @Column({ type: 'varchar', length: 128, nullable: true })
  pawapayProviderTxId: string | null; // Provider's transaction ID (flat field, not nested like deposits)

  @Column({ type: 'varchar', length: 64, nullable: true })
  pawapayRecipientProvider: string | null; // e.g., "MTN_MOMO_ZMB"

  @Column({ type: 'varchar', length: 32, nullable: true })
  pawapayRecipientPhone: string | null; // Recipient phone number

  @CreateDateColumn({ name: 'initiatedAt' })
  initiatedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
