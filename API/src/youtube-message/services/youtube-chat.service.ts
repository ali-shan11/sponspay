import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { youtube_v3 } from 'googleapis';
import { Transaction } from '../../transaction/entities/transaction.entity';

@Injectable()
export class YouTubeChatService {
  private readonly logger = new Logger(YouTubeChatService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  /**
   * Post thank you message in YouTube livestream chat
   * Updates transaction with message ID on success
   * Logs errors but doesn't throw (graceful degradation)
   */
  async postThankYouChatMessage(
    transaction: Transaction,
    youtube: youtube_v3.Youtube,
  ): Promise<void> {
    try {
      const liveChatId = transaction.youtubeLiveChatId;
      if (!liveChatId) {
        this.logger.warn(
          `Cannot post chat message - no live chat ID for transaction ${transaction.id}`,
        );
        return;
      }

      // Format thank you message (concise for chat)
      const message = this.formatChatMessage(transaction);

      // Post message via YouTube API
      const response = await youtube.liveChatMessages.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            liveChatId,
            type: 'textMessageEvent',
            textMessageDetails: {
              messageText: message,
            },
          },
        },
      });

      const messageId = response.data.id;
      if (!messageId) {
        this.logger.warn(
          `YouTube API returned success but no message ID for transaction ${transaction.id}`,
        );
        return;
      }

      // Update transaction with message ID
      await this.transactionRepo.update(transaction.id, {
        youtubeMessageId: messageId,
        youtubeMessagePostedAt: new Date(),
      });

      this.logger.log(
        `Posted YouTube chat message ${messageId} for transaction ${transaction.id}`,
      );
    } catch (error: any) {
      await this.handleChatError(transaction, error);
    }
  }

  /**
   * Format thank you message for livestream chat (concise, 200 char limit)
   * @private
   */
  private formatChatMessage(transaction: Transaction): string {
    return `💙 Thank you for your support, ${transaction.payerFullName}!`;
  }

  /**
   * Handle YouTube API errors gracefully
   * @private
   */
  private async handleChatError(
    transaction: Transaction,
    error: any,
  ): Promise<void> {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    const errorReason = error?.errors?.[0]?.reason;

    // Log different error types with appropriate severity
    if (errorCode === 403 && errorReason === 'liveChatEnded') {
      this.logger.warn(
        `Livestream has ended for transaction ${transaction.id}`,
      );
    } else if (errorCode === 403 && errorReason === 'liveChatDisabled') {
      this.logger.warn(`Live chat disabled for transaction ${transaction.id}`);
    } else if (errorCode === 400 && errorReason === 'invalidLiveChatId') {
      this.logger.error(
        `Invalid live chat ID for transaction ${transaction.id}. ` +
          `Frontend may have provided wrong ID or chat may have ended.`,
      );
    } else if (errorCode === 403) {
      this.logger.error(
        `Permission denied when posting chat message for transaction ${transaction.id}. ` +
          `Creator may be missing youtube.force-ssl scope. Reason: ${errorReason}`,
      );
      // TODO: Send email to creator prompting scope upgrade
    } else if (errorCode === 400) {
      this.logger.error(
        `Invalid request when posting chat message for transaction ${transaction.id}: ${errorMessage}`,
      );
    } else {
      this.logger.error(
        `Failed to post YouTube chat message for transaction ${transaction.id}: ${errorMessage}`,
        error?.stack,
      );
    }

    // Graceful degradation - don't throw, just log
    // Payment is already processed, YouTube message is optional
  }
}
