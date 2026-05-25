import { Module } from '@nestjs/common';
import { CreatorController } from './creator.controller';
import { CreatorService } from './creator.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { YouTubeChannel } from './entities/youtube-channel.entity';
import { ChannelSnapshot } from './entities/channel-snapshot.entity';
import { TelegramChannel } from './entities/telegram-channel.entity';
import { UserChannel } from './entities/user-channel.entity';
import { LinkClick } from '../link-click/entities/link-click.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { ZohoModule } from '../zoho/zoho.module';
import { TelegramModule } from '../telegram/telegram.module';
import { AuthModule } from '../auth/auth.module';
import { YouTubeMessageModule } from '../youtube-message/youtube-message.module';
import { YouTubeOAuthModule } from '../youtube-oauth/youtube-oauth.module';
import { UserProfileBackfillService } from './user-profile-backfill.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      YouTubeChannel,
      ChannelSnapshot,
      TelegramChannel,
      UserChannel,
      LinkClick,
      Transaction,
    ]),
    ZohoModule,
    TelegramModule,
    AuthModule,
    YouTubeMessageModule,
    YouTubeOAuthModule,
  ],
  controllers: [CreatorController],
  providers: [CreatorService, UserProfileBackfillService],
})
export class CreatorModule {}
