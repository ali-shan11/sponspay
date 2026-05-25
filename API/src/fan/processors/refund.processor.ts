import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { TelegramRefundService } from '../../telegram/services/telegram-refund.service';
import { FAN_REFUND_QUEUE } from '../../queue/queue.constants';

export interface RefundJobData {
  transactionId: string;
}

@Processor(FAN_REFUND_QUEUE)
export class RefundProcessor extends WorkerHost {
  private readonly logger = new Logger(RefundProcessor.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly refundService: TelegramRefundService,
  ) {
    super();
  }

  async process(job: Job<RefundJobData>): Promise<void> {
    const { transactionId } = job.data;
    this.logger.log(
      `Processing refund for transaction ${transactionId} (attempt ${job.attemptsMade + 1})`,
    );

    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
      relations: [
        'currency',
        'youtubeChannel',
        'youtubeChannel.telegramChannel',
      ],
    });

    if (!transaction) {
      this.logger.error(`Transaction ${transactionId} not found`);
      return;
    }

    await this.refundService.initiateRefund(transaction);

    this.logger.log(`Refund initiated for transaction ${transactionId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<RefundJobData>, error: Error): void {
    const maxAttempts = job.opts.attempts ?? 3;
    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(
        `Refund permanently failed for transaction ${job.data.transactionId} after ${job.attemptsMade} attempts: ${error?.message}`,
      );
    } else {
      this.logger.warn(
        `Refund attempt ${job.attemptsMade} failed for transaction ${job.data.transactionId}: ${error?.message}. Will retry.`,
      );
    }
  }
}
