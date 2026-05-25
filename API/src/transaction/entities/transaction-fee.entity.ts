import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('transaction_fees')
export class TransactionFee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Transaction, (transaction) => transaction.fees, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  transaction: Transaction;

  // Percentage of the transaction amount charged as fee
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: string;

  // Actual fee amount in transaction's local currency
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  // Approximate USD value of the fee
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  usdEstimatedValue: string | null;

  // Timestamp when the fee was charged
  @CreateDateColumn()
  chargedAt: Date;
}
