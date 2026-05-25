import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { youtube_v3 } from 'googleapis';
import { Transaction } from '../../transaction/entities/transaction.entity';

@Injectable()
export class YouTubeCommentService {
  private readonly logger = new Logger(YouTubeCommentService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  /**
   * Post thank you comment on YouTube video
   * Updates transaction with comment ID on success
   * Logs errors but doesn't throw (graceful degradation)
   */
  async postThankYouComment(
    transaction: Transaction,
    youtube: youtube_v3.Youtube,
  ): Promise<void> {
    try {
      const videoId = transaction.youtubeVideoId;
      if (!videoId) {
        this.logger.warn(
          `Cannot post comment - no video ID for transaction ${transaction.id}`,
        );
        return;
      }

      // Format thank you message
      const message = this.formatCommentMessage(transaction);

      // Post comment via YouTube API
      const response = await youtube.commentThreads.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            videoId,
            topLevelComment: {
              snippet: {
                textOriginal: message,
              },
            },
          },
        },
      });

      const commentId = response.data.id;
      if (!commentId) {
        this.logger.warn(
          `YouTube API returned success but no comment ID for transaction ${transaction.id}`,
        );
        return;
      }

      // Update transaction with comment ID
      await this.transactionRepo.update(transaction.id, {
        youtubeCommentId: commentId,
        youtubeMessagePostedAt: new Date(),
      });

      this.logger.log(
        `Posted YouTube comment ${commentId} for transaction ${transaction.id}`,
      );
    } catch (error: any) {
      await this.handleCommentError(transaction, error);
    }
  }

  /**
   * Format thank you message for video comment
   * @private
   */
  private formatCommentMessage(transaction: Transaction): string {
    return `Thank you for your support, ${transaction.payerFullName}! 💙\n\n---\nSent via SponsPay`;
  }

  /**
   * Handle YouTube API errors gracefully
   * @private
   */
  private async handleCommentError(
    transaction: Transaction,
    error: any,
  ): Promise<void> {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    const errorReason = error?.errors?.[0]?.reason;

    // Log different error types with appropriate severity
    if (errorCode === 403 && errorReason === 'commentsDisabled') {
      this.logger.warn(
        `Comments disabled on video for transaction ${transaction.id}`,
      );
    } else if (errorCode === 403) {
      this.logger.error(
        `Permission denied when posting comment for transaction ${transaction.id}. ` +
          `Creator may be missing youtube.force-ssl scope. Reason: ${errorReason}`,
      );
      // TODO: Send email to creator prompting scope upgrade
    } else if (errorCode === 400) {
      this.logger.error(
        `Invalid request when posting comment for transaction ${transaction.id}: ${errorMessage}`,
      );
    } else {
      this.logger.error(
        `Failed to post YouTube comment for transaction ${transaction.id}: ${errorMessage}`,
        error?.stack,
      );
    }

    // Graceful degradation - don't throw, just log
    // Payment is already processed, YouTube message is optional
  }
}
