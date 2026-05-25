import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { YouTubeChannel } from '../../creator/entities/youtube-channel.entity';
import { Currency } from './currency.entity';
import { TransactionStatus } from './transaction-status.entity';
import { TransactionFee } from './transaction-fee.entity';
import { MessageType } from './message-type.enum';
import { Payout } from './payout.entity';
import { RevenueStatus } from './revenue-status.enum';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Monetary amount; use decimal for precision
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  // Rough USD estimate; nullable and not authoritative for accounting
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  usdEstimatedValue: string | null;

  // Price multiplier chosen by fan (1-100x base price)
  @Column({ type: 'integer', default: 1 })
  multiplier: number;

  @ManyToOne(() => Currency, { nullable: false })
  currency: Currency;

  // Telegram message id; store as string to avoid int overflow and remain flexible
  @Index()
  @Column({ type: 'varchar', length: 64 })
  messageId: string;

  // Telegram message content (the actual message text)
  @Column({ type: 'text', nullable: true })
  messageContent: string | null;

  // Subject/title for the message (optional)
  @Column({ type: 'varchar', length: 200, nullable: true })
  subject: string | null;

  // The YouTube channel this transaction belongs to
  @Index()
  @Column({ type: 'uuid', nullable: true })
  youtubeChannelId: string | null;

  @ManyToOne(() => YouTubeChannel, { nullable: true })
  @JoinColumn({ name: 'youtubeChannelId' })
  youtubeChannel: YouTubeChannel | null;

  // Payer contact information
  @Column({ type: 'varchar', length: 128 })
  payerFullName: string;

  @Column({ type: 'varchar', length: 32 })
  payerPhone: string;

  // Payment provider information (denormalized)
  @Column({ type: 'varchar', length: 128 })
  providerName: string;

  @Index()
  @Column({ type: 'varchar', length: 3 })
  providerCountryCode: string;

  @ManyToOne(() => TransactionStatus, { nullable: false })
  status: TransactionStatus;

  @OneToMany(() => TransactionFee, (fee) => fee.transaction)
  fees: TransactionFee[];

  // Associated payout if one has been initiated
  @ManyToOne(() => Payout, (payout) => payout.transactions, {
    nullable: true,
  })
  @JoinColumn({ name: 'payoutId' })
  payout: Payout | null;

  // Timestamp when this transaction was paid out
  @Column({ type: 'timestamp', nullable: true })
  payoutAt: Date | null;

  // Type of premium message that generated this transaction
  @Column({
    type: 'enum',
    enum: MessageType,
    nullable: true,
  })
  messageType: MessageType | null;

  // Livestream identifier if the transaction originated from a livestream
  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  livestreamId: string | null;

  // YouTube message tracking
  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  youtubeVideoId: string | null; // Video or livestream ID

  @Column({ type: 'varchar', length: 128, nullable: true })
  youtubeLiveChatId: string | null; // Live chat ID for livestreams

  @Column({ type: 'varchar', length: 64, nullable: true })
  youtubeCommentId: string | null; // Posted comment ID (audit trail)

  @Column({ type: 'varchar', length: 64, nullable: true })
  youtubeMessageId: string | null; // Posted chat message ID (audit trail)

  @Column({ type: 'timestamp', nullable: true })
  youtubeMessagePostedAt: Date | null;

  // Sum of all fees charged for this transaction in local currency
  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0' })
  totalFees: string;

  // Net payout after fees; computed automatically by the database
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    asExpression: '"amount" - "totalFees"',
    generatedType: 'STORED',
  })
  totalPayout: string;

  // PawaPay deposit tracking
  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  depositId: string | null;

  // PawaPay deposit reconciliation fields (from v2 callbacks)
  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  pawapayCorrespondent: string | null; // Provider code from callback (e.g., "MTN_MOMO_ZMB")

  @Column({ type: 'varchar', length: 128, nullable: true })
  pawapayFinancialTxId: string | null; // Provider's transaction ID (providerTransactionId from callback)

  // PawaPay refund tracking
  @Column({ type: 'varchar', length: 64, nullable: true })
  pawapayRefundId: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  pawapayRefundStatus: string | null; // 'succeeded', 'failed', 'processing'

  @Column({ type: 'varchar', length: 128, nullable: true })
  pawapayRefundFinancialTxId: string | null;

  // Fan session for WebSocket notifications (anonymous fans)
  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  fanSessionId: string | null;

  // Client-generated idempotency key to prevent duplicate payments
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 36, nullable: true })
  idempotencyKey: string | null;

  // Referral tracking for marketing analytics
  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true })
  referralSource: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  referralMedium: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  referralCampaign: string | null;

  // Message delivery status tracking
  @Column({
    type: 'enum',
    enum: ['pending', 'delivered', 'failed'],
    nullable: true,
  })
  messageDeliveryStatus: 'pending' | 'delivered' | 'failed' | null;

  @Column({ type: 'timestamp', nullable: true })
  messageDeliveredAt: Date | null;

  @Column({ type: 'text', nullable: true })
  messageDeliveryError: string | null;

  @Column({ type: 'int', default: 0 })
  messageDeliveryAttempts: number;

  // Revenue tracking - indicates if creator has earned this revenue
  @Column({
    type: 'enum',
    enum: RevenueStatus,
    default: RevenueStatus.AwaitingReply,
  })
  revenueStatus: RevenueStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
