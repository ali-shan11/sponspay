import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YouTubeOAuthController } from './youtube-oauth.controller';
import { YouTubeOAuthService } from './youtube-oauth.service';
import { YouTubeMessageModule } from '../youtube-message/youtube-message.module';
import { AuthModule } from '../auth/auth.module';
import { User } from '../creator/entities/user.entity';
import { YouTubeChannel } from '../creator/entities/youtube-channel.entity';
import { UserChannel } from '../creator/entities/user-channel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, YouTubeChannel, UserChannel]),
    YouTubeMessageModule,
    AuthModule,
  ],
  controllers: [YouTubeOAuthController],
  providers: [YouTubeOAuthService],
  exports: [YouTubeOAuthService],
})
export class YouTubeOAuthModule {}
