import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreatorInsightsController } from './creator-insights.controller';
import { CreatorInsightsService } from './creator-insights.service';
import { TransactionModule } from '../transaction/transaction.module';
import { AccountsModule } from '../accounts/accounts.module';
import { TelegramModule } from '../telegram/telegram.module';
import { TelegramChannel } from '../creator/entities/telegram-channel.entity';
import { UserChannel } from '../creator/entities/user-channel.entity';
import { User } from '../creator/entities/user.entity';
import { LinkClick } from '../link-click/entities/link-click.entity';

@Module({
  imports: [
    // Provides repositories for Transaction and related entities via exported TypeOrmModule
    TransactionModule,
    AccountsModule,
    TelegramModule,
    // Import TypeOrmModule for the additional entities we need
    TypeOrmModule.forFeature([TelegramChannel, UserChannel, User, LinkClick]),
  ],
  controllers: [CreatorInsightsController],
  providers: [CreatorInsightsService],
})
export class CreatorInsightsModule {}
