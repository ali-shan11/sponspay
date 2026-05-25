import {
  Processor,
  WorkerHost,
  OnWorkerEvent,
  InjectQueue,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, Queue } from 'bullmq';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { TelegramMessageService } from '../../telegram/services/telegram-message.service';
import {
  FAN_MESSAGE_DELIVERY_QUEUE,
  FAN_REFUND_QUEUE,
} from '../../queue/queue.constants';

export interface MessageDeliveryJobData {
  transactionId: string;
}

@Processor(FAN_MESSAGE_DELIVERY_QUEUE)
export class MessageDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageDeliveryProcessor.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly messageService: TelegramMessageService,
    @InjectQueue(FAN_REFUND_QUEUE)
    private readonly refundQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<MessageDeliveryJobData>): Promise<void> {
    const { transactionId } = job.data;

    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
      relations: [
        'youtubeChannel',
        'youtubeChannel.telegramChannel',
        'currency',
      ],
    });

    if (!transaction) {
      this.logger.error(`Transaction ${transactionId} not found`);
      return;
    }

    await this.messageService.deliver(transaction, job.attemptsMade + 1);
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<MessageDeliveryJobData>,
    error: Error,
  ): Promise<void> {
    const { transactionId } = job.data;
    const errorMessage = error?.message || String(error);

    // Check if this was the final attempt
    const maxAttempts = job.opts.attempts ?? 3;
    if (job.attemptsMade >= maxAttempts) {
      await this.messageService.handleDeliveryFailure(
        transactionId,
        job.attemptsMade,
        errorMessage,
      );

      await this.refundQueue.add(
        'refund',
        { transactionId },
        { jobId: `refund-${transactionId}` },
      );

      this.logger.log(`Refund job enqueued for transaction ${transactionId}`);
    } else {
      this.logger.warn(
        `Message delivery attempt ${job.attemptsMade} failed for transaction ${transactionId}: ${errorMessage}. Will retry.`,
      );
    }
  }
}
