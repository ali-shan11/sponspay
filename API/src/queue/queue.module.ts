import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  FAN_MESSAGE_DELIVERY_QUEUE,
  FAN_YOUTUBE_MESSAGE_QUEUE,
  FAN_REFUND_QUEUE,
} from './queue.constants';
import { BullBoardConfigModule } from './bull-board.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl =
          configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port, 10) || 6379,
          },
        };
      },
    }),
    BullModule.registerQueue(
      {
        name: FAN_MESSAGE_DELIVERY_QUEUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      },
      {
        name: FAN_YOUTUBE_MESSAGE_QUEUE,
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'fixed', delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      },
      {
        name: FAN_REFUND_QUEUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      },
    ),
    BullBoardConfigModule,
  ],
  exports: [BullModule],
})
export class QueueModule {}
