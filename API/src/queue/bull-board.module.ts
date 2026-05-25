import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import {
  FAN_MESSAGE_DELIVERY_QUEUE,
  FAN_YOUTUBE_MESSAGE_QUEUE,
  FAN_REFUND_QUEUE,
} from './queue.constants';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature(
      {
        name: FAN_MESSAGE_DELIVERY_QUEUE,
        adapter: BullMQAdapter,
      },
      {
        name: FAN_YOUTUBE_MESSAGE_QUEUE,
        adapter: BullMQAdapter,
      },
      {
        name: FAN_REFUND_QUEUE,
        adapter: BullMQAdapter,
      },
    ),
  ],
})
export class BullBoardConfigModule {}
