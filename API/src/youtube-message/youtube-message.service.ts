import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transaction/entities/transaction.entity';
import { MessageType } from '../transaction/entities/message-type.enum';
import { YouTubeTokenService } from './services/youtube-token.service';
import { YouTubeCommentService } from './services/youtube-comment.service';
import { YouTubeChatService } from './services/youtube-chat.service';
import { YouTubeVideoInfoService } from './services/youtube-video-info.service';

@Injectable()
export class YouTubeMessageService {
  private readonly logger = new Logger(YouTubeMessageService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly tokenService: YouTubeTokenService,
    private readonly commentService: YouTubeCommentService,
    private readonly chatService: YouTubeChatService,
    private readonly videoInfoService: YouTubeVideoInfoService,
  ) {}

  /**
   * Send thank you message to YouTube after successful payment
   * Routes to comment service (video) or chat service (livestream)
   * All errors are swallowed - graceful degradation (payment already processed)
   */
  async sendThankYouMessage(transaction: Transaction): Promise<void> {
    try {
      // Skip if no YouTube video ID
      if (!transaction.youtubeVideoId) {
        this.logger.debug(
          `Skipping YouTube message - no video ID for transaction ${transaction.id}`,
        );
        return;
      }

      // Ensure transaction has required relations loaded
      if (!transaction.currency || !transaction.youtubeChannel) {
        const reloaded = await this.transactionRepo.findOne({
          where: { id: transaction.id },
          relations: [
            'currency',
            'youtubeChannel',
            'youtubeChannel.userChannels',
            'youtubeChannel.userChannels.user',
          ],
        });
        if (!reloaded) {
          this.logger.error(
            `Transaction ${transaction.id} not found when reloading`,
          );
          return;
        }
        transaction = reloaded;
      }

      // Find channel owner's user ID for YouTube API access
      const ownerId = transaction.youtubeChannel?.userChannels?.find(
        (uc) => uc.role === 'owner',
      )?.user?.id;

      if (!ownerId) {
        this.logger.warn(
          `No channel owner found for transaction ${transaction.id} - skipping YouTube message`,
        );
        return;
      }

      // Get creator's YouTube client (auto-refreshes token)
      const youtube = await this.tokenService.getYouTubeClient(ownerId);
      if (!youtube) {
        this.logger.warn(
          `Creator ${ownerId} hasn't connected YouTube - skipping message`,
        );
        return; // Graceful degradation
      }

      // Route based on message type
      if (transaction.messageType === MessageType.Livestream) {
        await this.handleLivestream(transaction, youtube);
      } else {
        await this.commentService.postThankYouComment(transaction, youtube);
      }

      this.logger.log(
        `Posted YouTube ${transaction.messageType} message for transaction ${transaction.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to post YouTube message for transaction ${transaction.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      // CRITICAL: Don't throw - graceful degradation (payment already processed)
    }
  }

  /**
   * Handle livestream message posting with optional liveChatId resolution
   * @private
   */
  private async handleLivestream(
    transaction: Transaction,
    youtube: any,
  ): Promise<void> {
    // If liveChatId is already present, use it directly
    if (transaction.youtubeLiveChatId) {
      await this.chatService.postThankYouChatMessage(transaction, youtube);
      return;
    }

    // Optional fallback: try to resolve liveChatId from videoId
    this.logger.debug(
      `No liveChatId provided for transaction ${transaction.id} - attempting to resolve from videoId`,
    );

    const liveChatId = await this.videoInfoService.getLiveChatId(
      transaction.youtubeVideoId!,
      youtube,
    );

    if (!liveChatId) {
      this.logger.warn(
        `Could not resolve liveChatId for transaction ${transaction.id} - skipping chat message`,
      );
      return;
    }

    // Update transaction with resolved liveChatId
    await this.transactionRepo.update(transaction.id, {
      youtubeLiveChatId: liveChatId,
    });
    transaction.youtubeLiveChatId = liveChatId;

    // Now post the message
    await this.chatService.postThankYouChatMessage(transaction, youtube);
  }
}
