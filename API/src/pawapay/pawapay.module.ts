import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Transaction } from '../transaction/entities/transaction.entity';
import { TransactionStatus } from '../transaction/entities/transaction-status.entity';
import { TransactionFee } from '../transaction/entities/transaction-fee.entity';
import { Currency } from '../transaction/entities/currency.entity';
import { Country } from '../transaction/entities/country.entity';
import { CountryPrice } from '../transaction/entities/country-price.entity';
import { PawapayController } from './pawapay.controller';
import { PawapayService } from './pawapay.service';
import { PawapayWebhookService } from './pawapay-webhook.service';
import { ProviderCacheService } from './provider-cache.service';
import { PaymentCountryService } from './payment-country.service';
import { RedisModule } from '../redis/redis.module';
import { FanModule } from '../fan/fan.module';
import { TransactionModule } from '../transaction/transaction.module';
import {
  FAN_MESSAGE_DELIVERY_QUEUE,
  FAN_YOUTUBE_MESSAGE_QUEUE,
} from '../queue/queue.constants';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Transaction,
      TransactionStatus,
      TransactionFee,
      Currency,
      Country,
      CountryPrice,
    ]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 0,
    }),
    RedisModule,
    BullModule.registerQueue(
      { name: FAN_MESSAGE_DELIVERY_QUEUE },
      { name: FAN_YOUTUBE_MESSAGE_QUEUE },
    ),
    forwardRef(() => FanModule),
    forwardRef(() => TransactionModule),
  ],
  controllers: [PawapayController],
  providers: [
    PawapayService,
    PawapayWebhookService,
    ProviderCacheService,
    PaymentCountryService,
  ],
  exports: [
    PawapayService,
    PawapayWebhookService,
    ProviderCacheService,
    PaymentCountryService,
  ],
})
export class PawapayModule {}
