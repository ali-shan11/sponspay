import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmConfigService } from 'config/configuration';
import { HealthModule } from './health/health.module';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { MarketingModule } from './marketing/marketing.module';
import { SendgridModule } from './sendgrid/sendgrid.module';
import { MailModule } from './mail/mail.module';
import { FirebaseAdminModule } from './firebase/firebase-admin.module';
import { CreatorModule } from './creator/creator.module';
import { SharedModule } from './shared/shared.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { ZohoModule } from './zoho/zoho.module';
import { TelegramModule } from './telegram/telegram.module';
import { TermsModule } from './terms/terms.module';
import { TransactionModule } from './transaction/transaction.module';
import { CreatorInsightsModule } from './creator-insights/creator-insights.module';
import { AdminModule } from './admin/admin.module';
import { AccountsModule } from './accounts/accounts.module';
import { PawapayModule } from './pawapay/pawapay.module';
import { InfobipModule } from './infobip/infobip.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from './redis/redis.module';
import { FanModule } from './fan/fan.module';
import { YouTubeMessageModule } from './youtube-message/youtube-message.module';
import { YouTubeOAuthModule } from './youtube-oauth/youtube-oauth.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    RedisModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // Default limit for most endpoints
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development')
          .required(),
        NODE_PORT: Joi.number().default(3000),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        DB_SYNC: Joi.boolean().default(false),
        SERVICE_ACCOUNT: Joi.string().required(),
        SERVICE_ACCOUNT_PRIVATE_KEY: Joi.string().required(),
        SERVICE_ACCOUNT_USER: Joi.string().required(),
        API_KEY_ALLOWED_DOMAINS: Joi.string().required(),
        SENDGRID_API_KEY: Joi.string().required(),
        FROM_EMAIL: Joi.string().required().email(),
        CONTACT_US_EMAIL: Joi.string().required().email(),
        MANAGEMENT_EMAIL: Joi.string().required().email(),
        FIREBASE_SERVICE_ACCOUNT: Joi.string().required(),
        FIREBASE_CHECK_REVOKED: Joi.boolean().default(false),
        TIMEZONE_API_URL: Joi.string().required(),
        PHOTOS_BUCKET: Joi.string().required(),
        ZOHO_CLIENT_ID: Joi.string().required(),
        ZOHO_CLIENT_SECRET: Joi.string().required(),
        ZOHO_REDIRECT_URI: Joi.string().required(),
        ZOHO_REFRESH_TOKEN: Joi.string().optional(),
        ZOHO_ENVIRONMENT: Joi.string()
          .valid('production', 'sandbox')
          .default('production'),
        TELEGRAM_SERVICE_URL: Joi.string()
          .optional()
          .default('http://telegram-service'),
        INTERNAL_API_KEY: Joi.string().required(),
        TELEGRAM_RETRY_DELAYS: Joi.string()
          .optional()
          .default('1000,5000,15000')
          .description('Comma-separated retry delays in ms'),
        TELEGRAM_MAX_RETRY_ATTEMPTS: Joi.number().optional().default(3),
        TELEGRAM_REPLY_CACHE_TTL: Joi.number()
          .optional()
          .default(300)
          .description('Redis cache TTL for reply checks in seconds'),
        TELEGRAM_MAX_HISTORY_FETCH_LIMIT: Joi.number()
          .optional()
          .default(500)
          .description('Max messages to fetch when checking history'),
        PAWAPAY_BASE_URL: Joi.string().uri().required(),
        PAWAPAY_API_TOKEN: Joi.string().required(),
        PAWAPAY_CALLBACK_AUTHORITY: Joi.string().required(),
        PAWAPAY_SKIP_SIGNATURE_VERIFICATION: Joi.string()
          .valid('true', 'false')
          .default('false')
          .description('SECURITY: Should ONLY be "true" in local development'),
        INFOBIP_BASE_URL: Joi.string().uri().required(),
        INFOBIP_API_KEY: Joi.string().required(),
        INFOBIP_SENDER: Joi.string().required(),
        ANONYMIZATION_SALT: Joi.string().min(32).required(),
        EXCHANGE_RATE_API_KEY: Joi.string().required(),
        EXCHANGE_RATE_BASE_URL: Joi.string()
          .uri()
          .default('https://v6.exchangerate-api.com/v6'),
        YOUTUBE_TOKEN_ENCRYPTION_KEY: Joi.string()
          .length(64)
          .required()
          .description(
            'AES-256 encryption key (64 hex chars) for YouTube refresh tokens',
          ),
        GOOGLE_OAUTH_CLIENT_ID: Joi.string()
          .required()
          .description('Google OAuth Client ID for YouTube API access'),
        GOOGLE_OAUTH_CLIENT_SECRET: Joi.string()
          .required()
          .description('Google OAuth Client Secret for YouTube API access'),
        GOOGLE_OAUTH_REDIRECT_URI: Joi.string()
          .uri()
          .required()
          .description('OAuth callback URL for YouTube connection'),
        FRONTEND_URL: Joi.string()
          .uri()
          .required()
          .description('Frontend URL for post-OAuth redirects'),
        REDIS_URL: Joi.string().uri().default('redis://localhost:6379'),
      }),
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    HealthModule,
    SendgridModule,
    MailModule,
    MarketingModule,
    AuthModule,
    ApiKeyModule,
    FirebaseAdminModule,
    CreatorModule,
    SharedModule,
    FileUploadModule,
    ZohoModule,
    TelegramModule,
    TermsModule,
    TransactionModule,
    AccountsModule,
    CreatorInsightsModule,
    AdminModule,
    PawapayModule,
    InfobipModule,
    FanModule,
    YouTubeMessageModule,
    YouTubeOAuthModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor() {}
}
