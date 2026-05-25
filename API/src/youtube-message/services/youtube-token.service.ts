import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google, youtube_v3 } from 'googleapis';
import * as crypto from 'crypto';
import { RedisService } from '../../redis/redis.service';
import { YouTubeOAuthToken } from '../entities/youtube-oauth-token.entity';

@Injectable()
export class YouTubeTokenService {
  private readonly logger = new Logger(YouTubeTokenService.name);
  private readonly CACHE_TTL = 3000; // 50 minutes in seconds (safer than 60-minute expiry)
  private readonly CACHE_KEY_PREFIX = 'youtube:access_token:';

  constructor(
    @InjectRepository(YouTubeOAuthToken)
    private readonly tokenRepo: Repository<YouTubeOAuthToken>,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Store or update YouTube refresh token for a creator
   * Note: Token must have youtube.force-ssl scope for posting messages
   */
  async upsertRefreshToken(
    userId: string,
    refreshToken: string,
    channelId?: string,
  ): Promise<void> {
    try {
      const encryptedRefreshToken = this.encryptToken(refreshToken);

      // Upsert pattern (one token per creator)
      await this.tokenRepo.upsert(
        {
          userId,
          channelId: channelId || null,
          encryptedRefreshToken,
        },
        ['userId'], // Conflict target
      );

      this.logger.log(
        `Stored YouTube refresh token for user ${userId}${channelId ? ` (channel: ${channelId})` : ''}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to upsert YouTube token for user ${userId}: ${error?.message}`,
      );
      throw error;
    }
  }

  /**
   * Update the channelId for an existing token
   * Used when syncing channel data after token was already stored
   */
  async updateChannelId(userId: string, channelId: string): Promise<void> {
    try {
      await this.tokenRepo.update({ userId }, { channelId });
      this.logger.log(`Updated channelId to ${channelId} for user ${userId}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to update channelId for user ${userId}: ${error?.message}`,
      );
      throw error;
    }
  }

  /**
   * Get authenticated YouTube client for a creator
   * Returns null if no token or error
   */
  async getYouTubeClient(userId: string): Promise<youtube_v3.Youtube | null> {
    try {
      const accessToken = await this.getFreshAccessToken(userId);
      if (!accessToken) return null;

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      return google.youtube({
        version: 'v3',
        auth: oauth2Client,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to get YouTube client for user ${userId}: ${error?.message}`,
      );
      return null;
    }
  }

  /**
   * Get authenticated YouTube Analytics client for a creator
   * Returns null if no token or error
   */
  async getYouTubeAnalyticsClient(userId: string): Promise<any | null> {
    try {
      const accessToken = await this.getFreshAccessToken(userId);
      if (!accessToken) return null;

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      return google.youtubeAnalytics({
        version: 'v2',
        auth: oauth2Client,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to get YouTube Analytics client for user ${userId}: ${error?.message}`,
      );
      return null;
    }
  }

  /**
   * Get fresh access token (from cache or refresh)
   * Returns null if no token found or error
   */
  async getFreshAccessToken(userId: string): Promise<string | null> {
    try {
      // Check Redis cache first
      const redis = this.redisService.getPubClient();
      const cacheKey = `${this.CACHE_KEY_PREFIX}${userId}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        this.logger.debug(`Cache hit for YouTube access token: ${userId}`);
        return cached;
      }

      // Cache miss - get refresh token from database
      const tokenRecord = await this.tokenRepo.findOne({
        where: { userId },
      });

      if (!tokenRecord) {
        this.logger.warn(
          `No YouTube token found for user ${userId} - creator hasn't connected YouTube`,
        );
        return null;
      }

      // Decrypt refresh token
      const decryptedRefreshToken = this.decryptToken(
        tokenRecord.encryptedRefreshToken,
      );

      // Exchange refresh token for new access token
      const accessToken = await this.refreshAccessToken(decryptedRefreshToken);

      // Cache for 50 minutes
      await redis.setex(cacheKey, this.CACHE_TTL, accessToken);

      this.logger.log(`Refreshed YouTube access token for user ${userId}`);
      return accessToken;
    } catch (error: any) {
      this.logger.error(
        `Failed to get fresh access token for user ${userId}: ${error?.message}`,
      );
      return null;
    }
  }

  /**
   * Revoke token (delete from database and cache)
   */
  async revokeToken(userId: string): Promise<void> {
    try {
      // Delete from database
      await this.tokenRepo.delete({ userId });

      // Evict from Redis cache
      const redis = this.redisService.getPubClient();
      const cacheKey = `${this.CACHE_KEY_PREFIX}${userId}`;
      await redis.del(cacheKey);

      this.logger.log(`Revoked YouTube token for user ${userId}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to revoke token for user ${userId}: ${error?.message}`,
      );
      throw error;
    }
  }

  /**
   * Refresh access token from stored refresh token
   * @private
   */
  private async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get('GOOGLE_OAUTH_CLIENT_ID'),
        this.configService.get('GOOGLE_OAUTH_CLIENT_SECRET'),
        this.configService.get('GOOGLE_OAUTH_REDIRECT_URI'),
      );

      oauth2Client.setCredentials({ refresh_token: refreshToken });

      // This automatically refreshes the access token
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('No access token returned from Google OAuth');
      }

      return credentials.access_token;
    } catch (error: any) {
      this.logger.error(`Failed to refresh access token: ${error?.message}`);
      throw new Error(
        `Token refresh failed - creator may need to reconnect YouTube: ${error?.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Encrypt token using AES-256-GCM
   * Format: "iv:authTag:ciphertext" (all hex-encoded)
   * @private
   */
  private encryptToken(plaintext: string): string {
    try {
      const keyHex = this.configService.get<string>(
        'YOUTUBE_TOKEN_ENCRYPTION_KEY',
      );
      if (!keyHex || keyHex.length !== 64) {
        throw new Error('Invalid encryption key - must be 64 hex characters');
      }

      const key = Buffer.from(keyHex, 'hex');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      const encrypted =
        cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error: any) {
      this.logger.error(`Encryption failed: ${error?.message}`);
      throw error;
    }
  }

  /**
   * Decrypt token using AES-256-GCM
   * With tamper detection via auth tag
   * @private
   */
  private decryptToken(encryptedToken: string): string {
    try {
      const [ivHex, authTagHex, ciphertext] = encryptedToken.split(':');
      if (!ivHex || !authTagHex || !ciphertext) {
        throw new Error('Invalid encrypted token format');
      }

      const keyHex = this.configService.get<string>(
        'YOUTUBE_TOKEN_ENCRYPTION_KEY',
      );
      if (!keyHex || keyHex.length !== 64) {
        throw new Error('Invalid encryption key - must be 64 hex characters');
      }

      const key = Buffer.from(keyHex, 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ivHex, 'hex'),
      );

      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

      const decrypted =
        decipher.update(ciphertext, 'hex', 'utf8') + decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      this.logger.error(
        `Decryption failed (possible tampering): ${error?.message}`,
      );
      throw new Error(
        'Token decryption failed - creator may need to reconnect YouTube',
        { cause: error },
      );
    }
  }
}
