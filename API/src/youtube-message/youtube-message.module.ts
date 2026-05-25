import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YouTubeOAuthToken } from './entities/youtube-oauth-token.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { YouTubeMessageService } from './youtube-message.service';
import { YouTubeTokenService } from './services/youtube-token.service';
import { YouTubeCommentService } from './services/youtube-comment.service';
import { YouTubeChatService } from './services/youtube-chat.service';
import { YouTubeVideoInfoService } from './services/youtube-video-info.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([YouTubeOAuthToken, Transaction]),
    RedisModule,
  ],
  providers: [
    YouTubeMessageService,
    YouTubeTokenService,
    YouTubeCommentService,
    YouTubeChatService,
    YouTubeVideoInfoService,
  ],
  exports: [YouTubeMessageService, YouTubeTokenService],
})
export class YouTubeMessageModule {}
