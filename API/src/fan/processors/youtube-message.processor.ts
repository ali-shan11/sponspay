import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { YouTubeMessageService } from '../../youtube-message/youtube-message.service';
import { FAN_YOUTUBE_MESSAGE_QUEUE } from '../../queue/queue.constants';

export interface YouTubeMessageJobData {
  transactionId: string;
}

@Processor(FAN_YOUTUBE_MESSAGE_QUEUE)
export class YouTubeMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(YouTubeMessageProcessor.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly youtubeMessageService: YouTubeMessageService,
  ) {
    super();
  }

  async process(job: Job<YouTubeMessageJobData>): Promise<void> {
    const { transactionId } = job.data;
    this.logger.log(
      `Processing YouTube message for transaction ${transactionId} (attempt ${job.attemptsMade + 1})`,
    );

    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
      relations: [
        'currency',
        'youtubeChannel',
        'youtubeChannel.userChannels',
        'youtubeChannel.userChannels.user',
      ],
    });

    if (!transaction) {
      this.logger.error(`Transaction ${transactionId} not found`);
      return;
    }

    await this.youtubeMessageService.sendThankYouMessage(transaction);

    this.logger.log(`YouTube message sent for transaction ${transactionId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<YouTubeMessageJobData>, error: Error): void {
    const maxAttempts = job.opts.attempts ?? 2;
    if (job.attemptsMade >= maxAttempts) {
      this.logger.warn(
        `YouTube message permanently failed for transaction ${job.data.transactionId} after ${job.attemptsMade} attempts: ${error?.message}`,
      );
    } else {
      this.logger.warn(
        `YouTube message attempt ${job.attemptsMade} failed for transaction ${job.data.transactionId}: ${error?.message}. Will retry.`,
      );
    }
  }
}
