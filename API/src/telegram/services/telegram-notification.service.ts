import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { TelegramGateway } from '../telegram.gateway';
import { FanGateway } from '../../fan/fan.gateway';
import { MailService } from '../../mail/mail.service';
import { TelegramChannel } from '../../creator/entities/telegram-channel.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { TelegramConfig } from '../config/telegram.config';

/**
 * Handles outbound notifications for Telegram operations.
 * Responsible for WebSocket events and management email alerts.
 */
@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);

  constructor(
    private readonly telegramGateway: TelegramGateway,
    @Inject(forwardRef(() => FanGateway))
    private readonly fanGateway: FanGateway,
    private readonly mailService: MailService,
    private readonly telegramConfig: TelegramConfig,
  ) {}

  /**
   * Notify creator via WebSocket that they've been promoted to co-admin.
   * Emits 'coAdminAdded' event to the user's room.
   *
   * @param firebaseUid - Creator's Firebase UID
   * @param channelHandle - Channel handle for the promotion
   */
  notifyCoAdminAdded(firebaseUid: string, channelHandle: string): void {
    try {
      this.telegramGateway.notifyCoAdminAdded(firebaseUid, channelHandle);
      this.logger.log(
        `WebSocket notification sent to user ${firebaseUid} for channel ${channelHandle}`,
      );
    } catch (error: any) {
      // Don't fail the entire promotion if WebSocket notification fails
      this.logger.error(
        'Failed to send WebSocket notification:',
        error?.message || error,
      );
    }
  }

  /**
   * Send management alert email when co-admin promotion fails after all retries.
   * This is called when automatic promotion fails permanently and requires manual intervention.
   *
   * @param channel - Telegram channel entity
   * @param userId - User ID (Telegram) that failed to promote
   * @param error - Error message from promotion failure
   */
  async sendPromotionFailureAlert(
    channel: TelegramChannel,
    userId: string,
    error: string,
  ): Promise<void> {
    try {
      const managementEmail = this.telegramConfig.managementEmail;
      const fromEmail = this.telegramConfig.fromEmail;

      if (!managementEmail || !fromEmail) {
        this.logger.warn(
          'Management email or from email not configured. Skipping alert email.',
        );
        return;
      }

      // Construct the Telegram channel link for manual intervention
      const channelLink = `https://t.me/${channel.channelHandle}`;

      // Build the alert email
      const subject = `⚠️ Telegram Co-Admin Promotion Failed - Manual Intervention Required`;
      const html = `
        <h2>Telegram Co-Admin Promotion Failed</h2>
        <p>Automatic co-admin promotion has failed after all retry attempts. Manual intervention is required.</p>

        <h3>Channel Details</h3>
        <ul>
          <li><strong>Channel Handle:</strong> ${channel.channelHandle}</li>
          <li><strong>Channel ID:</strong> ${channel.channelId || 'N/A'}</li>
          <li><strong>Channel Link:</strong> <a href="${channelLink}">${channelLink}</a></li>
          <li><strong>Database ID:</strong> ${channel.id}</li>
        </ul>

        <h3>User Details</h3>
        <ul>
          <li><strong>User ID (Telegram):</strong> ${userId}</li>
          <li><strong>Joined User ID (Database):</strong> ${channel.joinedUserId || 'N/A'}</li>
          <li><strong>Creator Firebase UID:</strong> ${channel.youtubeChannel?.userChannels?.find((uc) => uc.role === 'owner')?.user?.firebaseUid || 'N/A'}</li>
        </ul>

        <h3>Error Details</h3>
        <ul>
          <li><strong>Retry Attempts:</strong> ${channel.promotionAttempts} / ${this.telegramConfig.maxRetryAttempts}</li>
          <li><strong>Last Error:</strong> ${error}</li>
        </ul>

        <h3>Action Required</h3>
        <p>Please manually promote user <strong>${userId}</strong> to co-admin of channel <strong>${channel.channelHandle}</strong> with the following restricted rights:</p>
        <ul>
          <li>✅ Post messages</li>
          <li>✅ Edit messages</li>
          <li>✅ Delete messages</li>
          <li>❌ All other permissions disabled</li>
        </ul>

        <p>After manual promotion, update the database to mark <code>coAdminAdded = true</code> for channel ID ${channel.id}.</p>

        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated alert from the Telegram Co-Admin Auto-Promotion system.
          <br>Timestamp: ${new Date().toISOString()}
        </p>
      `;

      // Send the email
      await this.mailService.sendEmail({
        to: managementEmail,
        from: fromEmail,
        subject,
        html,
      });

      this.logger.log(
        `Management alert sent to ${managementEmail} for failed promotion of user ${userId} on channel ${channel.channelHandle}`,
      );
    } catch (error: any) {
      this.logger.error(
        'Error sending management alert email:',
        error?.message || error,
      );
      // Don't throw - we don't want email failures to crash the application
    }
  }

  /**
   * Notify fan via WebSocket about message delivery status.
   * Emits 'messageDelivery' event to the fan's session room.
   *
   * @param fanSessionId - Fan's session ID for room targeting
   * @param status - Delivery status ('delivered' or 'failed')
   * @param messageId - Telegram message ID (if delivered)
   * @param error - Error message (if failed)
   * @param refunded - Whether a refund was initiated (if failed)
   */
  notifyMessageDelivery(
    fanSessionId: string,
    payload: {
      status: 'delivered' | 'failed';
      messageId: string | null;
      error?: string;
      refunded?: boolean;
    },
  ): void {
    try {
      this.fanGateway.notifyMessageDelivery(fanSessionId, payload);
      this.logger.log(
        `Fan notification sent for session ${fanSessionId}: message ${payload.status}`,
      );
    } catch (error: any) {
      this.logger.error(
        'Failed to send WebSocket notification to fan:',
        error?.message || error,
      );
      // Don't throw - notification failure shouldn't break delivery flow
    }
  }

  /**
   * Send management alert email when message delivery fails after all retries.
   *
   * @param transaction - Transaction entity with message details
   * @param error - Error message from delivery failure
   */
  async sendMessageDeliveryFailureAlert(
    transaction: Transaction,
    error: string,
  ): Promise<void> {
    try {
      const managementEmail = this.telegramConfig.managementEmail;
      const fromEmail = this.telegramConfig.fromEmail;

      if (!managementEmail || !fromEmail) {
        this.logger.warn('Management email not configured');
        return;
      }

      const subject = `⚠️ Telegram Message Delivery Failed - Transaction ${transaction.id}`;
      const html = `
        <h2>Telegram Message Delivery Failed</h2>
        <p>A fan message could not be delivered after all retry attempts.</p>

        <h3>Transaction Details</h3>
        <ul>
          <li><strong>Transaction ID:</strong> ${transaction.id}</li>
          <li><strong>Deposit ID:</strong> ${transaction.depositId}</li>
          <li><strong>Fan Session ID:</strong> ${transaction.fanSessionId}</li>
          <li><strong>Amount:</strong> ${transaction.amount} ${transaction.currency.shortCode}</li>
        </ul>

        <h3>Message Details</h3>
        <ul>
          <li><strong>From:</strong> ${transaction.payerFullName}</li>
          <li><strong>Content:</strong> ${transaction.messageContent}</li>
        </ul>

        <h3>Delivery Attempts</h3>
        <ul>
          <li><strong>Attempts:</strong> ${transaction.messageDeliveryAttempts} / ${this.telegramConfig.maxRetryAttempts}</li>
          <li><strong>Last Error:</strong> ${error}</li>
        </ul>

        <h3>Refund Status</h3>
        <p>Automatic refund has been initiated. Please verify refund completion in PawaPay dashboard.</p>

        <h3>Action Required</h3>
        <p>Please manually post this message to the creator's Telegram channel if the refund succeeds.</p>

        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated alert from the Fan Payment system.
          <br>Timestamp: ${new Date().toISOString()}
        </p>
      `;

      await this.mailService.sendEmail({
        to: managementEmail,
        from: fromEmail,
        subject,
        html,
      });

      this.logger.log(
        `Message delivery failure alert sent for transaction ${transaction.id}`,
      );
    } catch (error: any) {
      this.logger.error(
        'Failed to send message delivery failure alert:',
        error?.message || error,
      );
    }
  }
}
