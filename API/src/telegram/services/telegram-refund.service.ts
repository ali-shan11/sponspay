import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { PawapayService } from '../../pawapay/pawapay.service';
import {
  PawapayRejectionException,
  PawapayDuplicateException,
} from '../../pawapay/pawapay.exceptions';
import { TelegramNotificationService } from './telegram-notification.service';

/**
 * Handles refund processing for failed message deliveries.
 * Responsible for initiating refunds via PawaPay and sending failure alerts.
 */
@Injectable()
export class TelegramRefundService {
  private readonly logger = new Logger(TelegramRefundService.name);

  constructor(
    private readonly pawapayService: PawapayService,
    private readonly dataSource: DataSource,
    private readonly notificationService: TelegramNotificationService,
  ) {}

  /**
   * Initiate an automatic refund when message delivery fails.
   * Handles PawaPay refund creation, database updates, and management alerts.
   *
   * @param transaction - Transaction entity for the failed delivery
   */
  async initiateRefund(transaction: Transaction): Promise<void> {
    try {
      if (!transaction.depositId) {
        this.logger.error(
          `Cannot refund transaction ${transaction.id}: no depositId found`,
        );
        return;
      }

      const refundId = randomUUID();
      this.logger.log(
        `Initiating refund ${refundId} for transaction ${transaction.id} due to message delivery failure`,
      );

      // Store refundId in transaction before initiating
      await this.dataSource.getRepository(Transaction).update(transaction.id, {
        pawapayRefundId: refundId,
        pawapayRefundStatus: 'processing',
        updatedAt: new Date(),
      });

      try {
        await this.pawapayService.createRefund({
          refundId,
          depositId: transaction.depositId,
          amount: transaction.amount,
          currency: transaction.currency.shortCode,
          clientReferenceId: transaction.id,
          metadata: [
            {
              reason: 'message_delivery_failed',
              isPII: false,
            },
            {
              transactionId: transaction.id,
              isPII: false,
            },
          ],
        });

        this.logger.log(
          `Refund ${refundId} initiated successfully for transaction ${transaction.id}`,
        );
      } catch (refundError: any) {
        // Handle business-level rejections from PawaPay
        if (refundError instanceof PawapayRejectionException) {
          // PawaPay explicitly rejected the refund
          await this.dataSource
            .getRepository(Transaction)
            .update(transaction.id, {
              pawapayRefundStatus: 'failed',
              updatedAt: new Date(),
            });
          this.logger.error(
            `Refund ${refundId} rejected by PawaPay for transaction ${transaction.id}: ${JSON.stringify(refundError.rejectionReason)}`,
          );
        } else if (refundError instanceof PawapayDuplicateException) {
          // Refund was already submitted (duplicate refundId)
          this.logger.warn(
            `Refund ${refundId} ignored by PawaPay as duplicate for transaction ${transaction.id}`,
          );
        } else {
          // Network failures, timeouts, 5xx errors, etc.
          await this.dataSource
            .getRepository(Transaction)
            .update(transaction.id, {
              pawapayRefundStatus: 'failed',
              updatedAt: new Date(),
            });
          this.logger.error(
            `Failed to initiate refund ${refundId} for transaction ${transaction.id}:`,
            refundError?.message || refundError,
          );
        }
      }

      // Send management alert regardless of refund outcome
      await this.notificationService.sendMessageDeliveryFailureAlert(
        transaction,
        transaction.messageDeliveryError || 'Unknown error',
      );
    } catch (error: any) {
      this.logger.error(
        `Error during refund process for transaction ${transaction.id}:`,
        error?.message || error,
      );
      // Don't throw - we still want to send the management alert
    }
  }
}
