import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { FanController } from './fan.controller';
import { FanService } from './fan.service';
import { FanGateway } from './fan.gateway';
import { YouTubeApiService } from './youtube/youtube-api.service';
import { MessageDeliveryProcessor } from './processors/message-delivery.processor';
import { YouTubeMessageProcessor } from './processors/youtube-message.processor';
import { RefundProcessor } from './processors/refund.processor';
import { LinkClick } from '../link-click/entities/link-click.entity';
import { TelegramChannel } from '../creator/entities/telegram-channel.entity';
import { YouTubeChannel } from '../creator/entities/youtube-channel.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { TransactionStatus } from '../transaction/entities/transaction-status.entity';
import { Currency } from '../transaction/entities/currency.entity';
import { Country } from '../transaction/entities/country.entity';
import { CountryPrice } from '../transaction/entities/country-price.entity';
import { User } from '../creator/entities/user.entity';
import { PawapayModule } from '../pawapay/pawapay.module';
import { TelegramModule } from '../telegram/telegram.module';
import { TransactionModule } from '../transaction/transaction.module';
import { YouTubeMessageModule } from '../youtube-message/youtube-message.module';
import {
  FAN_MESSAGE_DELIVERY_QUEUE,
  FAN_YOUTUBE_MESSAGE_QUEUE,
  FAN_REFUND_QUEUE,
} from '../queue/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TelegramChannel,
      YouTubeChannel,
      Transaction,
      TransactionStatus,
      Currency,
      Country,
      CountryPrice,
      User,
      LinkClick,
    ]),
    ConfigModule,
    BullModule.registerQueue(
      { name: FAN_MESSAGE_DELIVERY_QUEUE },
      { name: FAN_YOUTUBE_MESSAGE_QUEUE },
      { name: FAN_REFUND_QUEUE },
    ),
    forwardRef(() => PawapayModule),
    forwardRef(() => TelegramModule),
    forwardRef(() => TransactionModule),
    YouTubeMessageModule,
  ],
  controllers: [FanController],
  providers: [
    FanService,
    YouTubeApiService,
    FanGateway,
    MessageDeliveryProcessor,
    YouTubeMessageProcessor,
    RefundProcessor,
  ],
  exports: [FanGateway],
})
export class FanModule {}
