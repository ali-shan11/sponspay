import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('transaction_statuses')
export class TransactionStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Machine-friendly code, e.g., "succeeded", "pending", "failed"
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  // Human-friendly label, e.g., "Succeeded"
  @Column({ type: 'varchar', length: 64 })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
