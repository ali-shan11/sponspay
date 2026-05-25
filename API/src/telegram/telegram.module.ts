import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { InternalTelegramController } from './internal-telegram.controller';
import { TelegramGateway } from './telegram.gateway';
import { TelegramAdapterService } from './telegram-adapter.service';
import { User } from '../creator/entities/user.entity';
import { PawapayModule } from '../pawapay/pawapay.module';
import { MailModule } from '../mail/mail.module';
import { FanModule } from '../fan/fan.module';
import { RedisModule } from '../redis/redis.module';
import { TelegramConfig } from './config/telegram.config';
import { TelegramChannelService } from './services/telegram-channel.service';
import { TelegramCoAdminService } from './services/telegram-co-admin.service';
import { TelegramMessageService } from './services/telegram-message.service';
import { TelegramNotificationService } from './services/telegram-notification.service';
import { TelegramRefundService } from './services/telegram-refund.service';
import { InternalApiKeyGuard } from '../auth/internal-api-key.guard';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    forwardRef(() => PawapayModule),
    forwardRef(() => FanModule),
    MailModule,
    RedisModule,
  ],
  providers: [
    // Adapter service (replaces direct GramJS TelegramClient)
    TelegramAdapterService,

    // Internal services
    TelegramConfig,
    TelegramChannelService,
    TelegramCoAdminService,
    TelegramMessageService,
    TelegramNotificationService,
    TelegramRefundService,

    // Main orchestrator
    TelegramService,

    // Gateway
    TelegramGateway,

    // Guards
    InternalApiKeyGuard,
  ],
  controllers: [TelegramController, InternalTelegramController],
  exports: [
    TelegramService,
    TelegramGateway,
    TelegramAdapterService,
    TelegramMessageService,
    TelegramRefundService,
  ],
})
export class TelegramModule {}
