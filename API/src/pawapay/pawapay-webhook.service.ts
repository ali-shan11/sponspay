import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { Transaction } from '../transaction/entities/transaction.entity';
import { TransactionStatus } from '../transaction/entities/transaction-status.entity';
import { TransactionFee } from '../transaction/entities/transaction-fee.entity';
import { Payout } from '../transaction/entities/payout.entity';
import { FanGateway } from '../fan/fan.gateway';
import {
  PawapayCallback,
  PawapayDepositCallback,
  PawapayPayoutCallback,
  PawapayRefundCallback,
  isDepositCallback,
  isPayoutCallback,
  isRefundCallback,
} from './interfaces/pawapay.interfaces';
import { PAWAPAY_STATUS_MAP, PawapayCallbackStatus } from './pawapay.constants';
import {
  FAN_MESSAGE_DELIVERY_QUEUE,
  FAN_YOUTUBE_MESSAGE_QUEUE,
} from '../queue/queue.constants';

@Injectable()
export class PawapayWebhookService {
  private readonly logger = new Logger(PawapayWebhookService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly fanGateway: FanGateway,
    private readonly configService: ConfigService,
    @InjectQueue(FAN_MESSAGE_DELIVERY_QUEUE)
    private readonly messageDeliveryQueue: Queue,
    @InjectQueue(FAN_YOUTUBE_MESSAGE_QUEUE)
    private readonly youtubeMessageQueue: Queue,
  ) {}

  async processCallback(callback: PawapayCallback): Promise<void> {
    // Discriminate callback type and route to appropriate handler
    if (isDepositCallback(callback)) {
      await this.processDepositCallback(callback);
    } else if (isPayoutCallback(callback)) {
      await this.processPayoutCallback(callback);
    } else if (isRefundCallback(callback)) {
      await this.processRefundCallback(callback);
    } else {
      this.logger.warn(`Unknown callback type: ${JSON.stringify(callback)}`);
    }
  }

  private async processDepositCallback(
    callback: PawapayDepositCallback,
  ): Promise<void> {
    const depositId = callback.depositId;

    this.logger.log(
      `Processing deposit callback: depositId=${depositId}, status=${callback.status}, ` +
        `provider=${callback.payer.accountDetails.provider}, providerTxId=${callback.providerTransactionId || 'N/A'}`,
    );

    // Variables to store data for post-transaction operations
    let processedTransaction: Transaction | null = null;
    let statusCode: string | null = null;
    let failureReason: string | undefined;

    // Use a transaction with pessimistic lock to prevent race conditions
    await this.dataSource.transaction(async (manager) => {
      // Find transaction by depositId with pessimistic write lock
      // Note: Pessimistic locking cannot be combined with LEFT JOINs in PostgreSQL
      // So we query first with lock, then load relations separately
      const transaction = await manager
        .createQueryBuilder(Transaction, 'transaction')
        .where('transaction.depositId = :depositId', { depositId })
        .setLock('pessimistic_write')
        .getOne();

      if (!transaction) {
        this.logger.warn(`No transaction found for depositId: ${depositId}`);
        return;
      }

      // Load relations separately after acquiring the lock
      const loadedTransaction = await manager
        .getRepository(Transaction)
        .createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.youtubeChannel', 'youtubeChannel')
        .leftJoinAndSelect(
          'youtubeChannel.telegramChannel',
          'ytTelegramChannel',
        )
        .leftJoinAndSelect('transaction.status', 'status')
        .leftJoinAndSelect('transaction.currency', 'currency')
        .where('transaction.id = :id', { id: transaction.id })
        .getOne();

      if (loadedTransaction) {
        Object.assign(transaction, loadedTransaction);
      }

      // Check if already processed (idempotency)
      if (
        transaction.status.code === 'succeeded' ||
        transaction.status.code === 'failed'
      ) {
        this.logger.log(
          `Transaction ${transaction.id} already processed with status: ${transaction.status.code}`,
        );
        return;
      }

      // Map PawaPay status to transaction status
      statusCode = this.mapPawapayStatus(callback.status);
      const newStatus = await manager.findOne(TransactionStatus, {
        where: { code: statusCode },
      });

      if (!newStatus) {
        this.logger.error(
          `Transaction status "${statusCode}" not found in database`,
        );
        return;
      }

      // Update transaction with provider data
      await manager.update(Transaction, transaction.id, {
        status: newStatus,
        pawapayCorrespondent: callback.payer.accountDetails.provider,
        pawapayFinancialTxId: callback.providerTransactionId || null,
        updatedAt: new Date(),
      });

      this.logger.log(
        `Updated transaction ${transaction.id} status to ${statusCode}`,
      );

      // Calculate and record fee for successful payments
      if (statusCode === 'succeeded') {
        const transactionAmount = parseFloat(transaction.amount);
        const feePercentage = parseFloat(
          transaction.youtubeChannel?.feePercentage ?? '15.00',
        );
        const feeAmount = ((transactionAmount * feePercentage) / 100).toFixed(
          2,
        );

        // Create transaction fee record
        const transactionFee = manager.create(TransactionFee, {
          transaction: transaction,
          percentage: transaction.youtubeChannel?.feePercentage ?? '15.00',
          amount: feeAmount,
          usdEstimatedValue: null, // Skip USD estimation for now
        });
        await manager.save(TransactionFee, transactionFee);

        // Update transaction totalFees
        await manager.update(Transaction, transaction.id, {
          totalFees: feeAmount,
        });

        this.logger.log(
          `Created transaction fee for ${transaction.id}: ` +
            `${feePercentage}% of ${transactionAmount} = ${feeAmount} ${transaction.currency.shortCode}`,
        );
      }

      // Extract failure details if present
      failureReason = callback.failureReason
        ? `${callback.failureReason.failureCode}${callback.failureReason.failureMessage ? ': ' + callback.failureReason.failureMessage : ''}`
        : undefined;

      // Store transaction for post-commit operations with updated status
      // Create a shallow copy to avoid mutating the original transaction object (important for tests)
      processedTransaction = { ...transaction, status: newStatus };
    });

    // Transaction committed - webhook acknowledged at this point
    // Now perform async operations that shouldn't block the webhook response

    if (!processedTransaction || !statusCode) {
      // Transaction not found or already processed - nothing to do
      return;
    }

    // TypeScript needs explicit type assertion after the null check
    const transaction = processedTransaction as Transaction;
    const finalStatusCode = statusCode as string;

    // TEST MODE ONLY: Simulate slow payment processing for timeout UI testing
    // Trigger: Use subject "Delay me" (case-insensitive) to delay WebSocket events
    // Configure delay via TEST_DELAY_SECONDS env var (defaults to 720s / 12 min)
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (
      nodeEnv !== 'production' &&
      transaction.subject &&
      transaction.subject.trim().toLowerCase() === 'delay me'
    ) {
      const delaySec =
        parseInt(
          this.configService.get<string>('TEST_DELAY_SECONDS') ?? '720',
          10,
        ) || 720;
      this.logger.warn(
        `TEST MODE: Delaying webhook processing by ${delaySec}s for transaction ${transaction.id} (subject: "Delay me")`,
      );
      await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
    }

    // Notify fan via WebSocket (fire-and-forget)
    this.notifyFan(transaction.fanSessionId, {
      status: finalStatusCode,
      depositId,
      transactionId: transaction.id,
      reason: failureReason,
    });

    // If successful, enqueue durable jobs for message delivery and YouTube
    if (finalStatusCode === 'succeeded') {
      this.logger.log(
        `Payment succeeded for transaction ${transaction.id}. Enqueuing message delivery...`,
      );

      await this.messageDeliveryQueue.add(
        'deliver',
        { transactionId: transaction.id },
        { jobId: `msg-${transaction.id}` },
      );

      if (transaction.youtubeVideoId) {
        this.logger.log(
          `Enqueuing YouTube message for transaction ${transaction.id}...`,
        );

        await this.youtubeMessageQueue.add(
          'send',
          { transactionId: transaction.id },
          { jobId: `yt-${transaction.id}` },
        );
      }
    }

    // If failed, notify fan with reason
    if (finalStatusCode === 'failed') {
      this.logger.log(
        `Payment failed for transaction ${transaction.id}: ${failureReason || 'Unknown reason'}`,
      );
      this.notifyFan(transaction.fanSessionId, {
        status: 'failed',
        reason: failureReason || 'Payment failed',
        depositId,
        transactionId: transaction.id,
      });
    }
  }

  private async processPayoutCallback(
    callback: PawapayPayoutCallback,
  ): Promise<void> {
    const payoutId = callback.payoutId;

    this.logger.log(
      `Processing payout callback: payoutId=${payoutId}, status=${callback.status}, ` +
        `provider=${callback.recipient.accountDetails.provider}, providerTxId=${callback.providerTransactionId || 'N/A'}`,
    );

    await this.dataSource.transaction(async (manager) => {
      // Find payout by payoutId with pessimistic write lock
      // Note: Pessimistic locking cannot be combined with LEFT JOINs in PostgreSQL
      // So we query first with lock, then load relations separately
      const payout = await manager
        .createQueryBuilder(Payout, 'payout')
        .where('payout.pawapayPayoutId = :payoutId', { payoutId })
        .setLock('pessimistic_write')
        .getOne();

      if (!payout) {
        this.logger.warn(`No payout found for payoutId: ${payoutId}`);
        return;
      }

      // Load relations separately after acquiring the lock
      const loadedPayout = await manager
        .getRepository(Payout)
        .createQueryBuilder('payout')
        .leftJoinAndSelect('payout.beneficiary', 'beneficiary')
        .leftJoinAndSelect('payout.status', 'status')
        .where('payout.id = :id', { id: payout.id })
        .getOne();

      if (loadedPayout) {
        Object.assign(payout, loadedPayout);
      }

      // Check idempotency
      if (
        payout.status.code === 'succeeded' ||
        payout.status.code === 'failed'
      ) {
        this.logger.log(
          `Payout ${payout.id} already processed with status: ${payout.status.code}`,
        );
        return;
      }

      // Map status
      const statusCode = this.mapPawapayStatus(callback.status);
      const newStatus = await manager.findOne(TransactionStatus, {
        where: { code: statusCode },
      });

      if (!newStatus) {
        this.logger.error(
          `Transaction status "${statusCode}" not found in database`,
        );
        return;
      }

      // Update payout with provider data
      await manager.update(Payout, payout.id, {
        status: newStatus,
        pawapayProviderTxId: callback.providerTransactionId || null,
        pawapayRecipientProvider: callback.recipient.accountDetails.provider,
        pawapayRecipientPhone: callback.recipient.accountDetails.phoneNumber,
        updatedAt: new Date(),
      });

      this.logger.log(`Updated payout ${payout.id} status to ${statusCode}`);

      // Extract failure details if present
      if (callback.failureReason) {
        const failureReason = `${callback.failureReason.failureCode}${callback.failureReason.failureMessage ? ': ' + callback.failureReason.failureMessage : ''}`;
        this.logger.error(`Payout ${payout.id} failed: ${failureReason}`);
      }
    });
  }

  private async processRefundCallback(
    callback: PawapayRefundCallback,
  ): Promise<void> {
    const refundId = callback.refundId;

    this.logger.log(
      `Processing refund callback: refundId=${refundId}, status=${callback.status}, ` +
        `amount=${callback.amount}, provider=${callback.recipient.accountDetails.provider}, ` +
        `providerTxId=${callback.providerTransactionId || 'N/A'}`,
    );

    // Refund callbacks do NOT include depositId - we must query by pawapayRefundId
    // (stored when we initiated the refund in telegram.service.ts)
    await this.dataSource.transaction(async (manager) => {
      // Find transaction by refundId with pessimistic write lock
      // Note: Pessimistic locking cannot be combined with LEFT JOINs in PostgreSQL
      // So we query first with lock, then load relations separately if needed
      const transaction = await manager
        .createQueryBuilder(Transaction, 'transaction')
        .where('transaction.pawapayRefundId = :refundId', { refundId })
        .setLock('pessimistic_write')
        .getOne();

      if (!transaction) {
        this.logger.warn(
          `No transaction found for refundId: ${refundId}. ` +
            `This refund was likely not initiated through our system.`,
        );
        return;
      }

      // Store refund result information in transaction
      const statusCode = this.mapPawapayStatus(callback.status);

      await manager.update(Transaction, transaction.id, {
        pawapayRefundStatus: statusCode,
        pawapayRefundFinancialTxId: callback.providerTransactionId || null,
        updatedAt: new Date(),
      });

      this.logger.log(
        `Recorded refund ${refundId} for transaction ${transaction.id} with status ${statusCode}`,
      );

      // Extract failure details if present
      if (callback.failureReason) {
        const failureReason = `${callback.failureReason.failureCode}${callback.failureReason.failureMessage ? ': ' + callback.failureReason.failureMessage : ''}`;
        this.logger.error(`Refund ${refundId} failed: ${failureReason}`);
      }
    });
  }

  private mapPawapayStatus(pawapayStatus: PawapayCallbackStatus): string {
    const mapped = PAWAPAY_STATUS_MAP[pawapayStatus];
    if (!mapped) {
      this.logger.warn(
        `Unknown PawaPay status "${pawapayStatus}", defaulting to "pending"`,
      );
      return 'pending';
    }
    this.logger.debug(
      `Mapped PawaPay status "${pawapayStatus}" to "${mapped}"`,
    );
    return mapped;
  }

  private notifyFan(fanSessionId: string | null, payload: any): void {
    if (!fanSessionId) {
      this.logger.warn('No fanSessionId provided for notification');
      return;
    }

    try {
      this.fanGateway.notifyPaymentStatus(fanSessionId, payload);
      this.logger.log(
        `Fan notification sent for session ${fanSessionId}: ${payload.status}`,
      );
    } catch (error: any) {
      this.logger.error(
        'Failed to send WebSocket notification to fan:',
        error?.message || error,
      );
      // Don't throw - WebSocket failure shouldn't break webhook processing
    }
  }
}
