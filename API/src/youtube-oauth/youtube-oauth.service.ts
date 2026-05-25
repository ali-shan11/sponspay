import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google } from 'googleapis';
import { YouTubeTokenService } from '../youtube-message/services/youtube-token.service';
import { YouTubeChannel } from '../creator/entities/youtube-channel.entity';
import {
  UserChannel,
  UserChannelRole,
} from '../creator/entities/user-channel.entity';

@Injectable()
export class YouTubeOAuthService {
  private readonly logger = new Logger(YouTubeOAuthService.name);
  private oauth2Client: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly youtubeTokenService: YouTubeTokenService,
    @InjectRepository(YouTubeChannel)
    private readonly youtubeChannelRepo: Repository<YouTubeChannel>,
    @InjectRepository(UserChannel)
    private readonly userChannelRepo: Repository<UserChannel>,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_OAUTH_CLIENT_ID'),
      this.configService.get('GOOGLE_OAUTH_CLIENT_SECRET'),
      this.configService.get('GOOGLE_OAUTH_REDIRECT_URI'),
    );
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(userId: string, returnUrl?: string, loginHint?: string): string {
    const state = this.encodeState({
      userId,
      timestamp: Date.now(),
      returnUrl: returnUrl || '/settings',
    });

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // CRITICAL: Request refresh token
      scope: [
        'https://www.googleapis.com/auth/yt-analytics.readonly', // Analytics access
        'https://www.googleapis.com/auth/youtube.force-ssl', // Read channel data + post messages
      ],
      state,
      prompt: 'consent', // Force consent to guarantee refresh token
      include_granted_scopes: true,
      ...(loginHint && { login_hint: loginHint }),
    });
  }

  /**
   * Handle OAuth callback with authorization code
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{
    userId: string;
    success: boolean;
    returnUrl: string;
    error?: string;
  }> {
    // Validate state (CSRF protection)
    const stateData = this.decodeState(state);
    if (!stateData?.userId) {
      throw new BadRequestException('Invalid state parameter');
    }

    // Check state timestamp (prevent replay attacks, valid for 10 minutes)
    const age = Date.now() - stateData.timestamp;
    if (age > 10 * 60 * 1000) {
      throw new BadRequestException('State expired');
    }

    const returnUrl = stateData.returnUrl || '/settings';

    try {
      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        this.logger.error('No refresh token received from Google OAuth');
        return { userId: stateData.userId, success: false, returnUrl };
      }

      // Fetch channel data FIRST (using the fresh access token) to get channelId
      let channelId: string | undefined;
      try {
        // Use the access token to fetch channel data immediately
        this.oauth2Client.setCredentials(tokens);
        const youtube = google.youtube({
          version: 'v3',
          auth: this.oauth2Client,
        });

        const response = await youtube.channels.list({
          part: ['snippet', 'statistics'],
          mine: true,
        });

        if (response.data.items && response.data.items.length > 0) {
          const channel = response.data.items[0];
          channelId = channel.id || undefined;

          // Store channel in database and link to user
          if (channelId) {
            await this.youtubeChannelRepo.upsert(
              {
                channelId: channelId,
                channelName: channel.snippet?.title || 'Unknown Channel',
              },
              ['channelId'],
            );

            // Create UserChannel junction so youtubeConnected flag is set
            const savedChannel = await this.youtubeChannelRepo.findOne({
              where: { channelId },
            });
            if (savedChannel) {
              await this.userChannelRepo.upsert(
                {
                  userId: stateData.userId,
                  youtubeChannelId: savedChannel.id,
                  role: UserChannelRole.Owner,
                },
                ['userId', 'youtubeChannelId'],
              );
              this.logger.log(
                `UserChannel (owner) created for user ${stateData.userId} and channel ${savedChannel.id}`,
              );
            }

            this.logger.log(
              `YouTube channel ${channel.snippet?.title} (${channelId}) stored for user ${stateData.userId}`,
            );
          }
        } else {
          this.logger.warn(
            `OAuth succeeded but no channels found for user ${stateData.userId} - not storing token`,
          );
          return {
            userId: stateData.userId,
            success: false,
            returnUrl,
            error: 'no_channel',
          };
        }
      } catch (error) {
        this.logger.error(
          `Failed to fetch/store channel data for user ${stateData.userId}: ${error.message}`,
          error.stack,
        );
        // Continue with token storage even if channel fetch fails
      }

      // Store refresh token WITH channelId (linking token to specific channel)
      await this.youtubeTokenService.upsertRefreshToken(
        stateData.userId,
        tokens.refresh_token,
        channelId,
      );

      this.logger.log(
        `YouTube refresh token stored for user ${stateData.userId}${channelId ? ` (channel: ${channelId})` : ''}`,
      );

      return { userId: stateData.userId, success: true, returnUrl };
    } catch (error) {
      this.logger.error(
        `OAuth token exchange failed: ${error.message}`,
        error.stack,
      );
      return { userId: stateData.userId, success: false, returnUrl };
    }
  }

  /**
   * Encode state parameter (simple Base64 encoding)
   * TODO: Consider JWT or encryption for production
   */
  private encodeState(data: {
    userId: string;
    timestamp: number;
    returnUrl: string;
  }): string {
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  /**
   * Decode state parameter
   */
  private decodeState(state: string): {
    userId: string;
    timestamp: number;
    returnUrl: string;
  } | null {
    try {
      return JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
  }

  /**
   * Revoke YouTube connection
   * Deletes UserChannel junction records and OAuth token for the user
   */
  async revokeConnection(userId: string): Promise<void> {
    await this.userChannelRepo.delete({ userId });
    this.logger.log(`Deleted UserChannel records for user ${userId}`);

    await this.youtubeTokenService.revokeToken(userId);
    this.logger.log(`YouTube connection revoked for user ${userId}`);
  }

  /**
   * Get YouTube channel data for revenue estimator
   * Returns channel info and basic analytics needed for onboarding calculations
   */
  async getChannelDataForEstimator(userId: string): Promise<{
    connected: boolean;
    channels?: Array<{
      id: string;
      title: string;
      subscriberCount: string;
      viewCount: string;
      videoCount: string;
      thumbnailUrl: string;
    }>;
    error?: string;
  }> {
    try {
      // Get authenticated YouTube client
      const youtube = await this.youtubeTokenService.getYouTubeClient(userId);

      if (!youtube) {
        this.logger.warn(
          `No YouTube client available for user ${userId} - not connected`,
        );
        return {
          connected: false,
          error: 'YouTube not connected',
        };
      }

      // Fetch user's YouTube channels
      const response = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true,
      });

      if (!response.data.items || response.data.items.length === 0) {
        this.logger.warn(`No YouTube channels found for user ${userId}`);
        return {
          connected: true,
          channels: [],
        };
      }

      // Format channel data
      const channels = response.data.items.map((channel) => ({
        id: channel.id || '',
        title: channel.snippet?.title || 'Unknown Channel',
        subscriberCount: channel.statistics?.subscriberCount || '0',
        viewCount: channel.statistics?.viewCount || '0',
        videoCount: channel.statistics?.videoCount || '0',
        thumbnailUrl:
          channel.snippet?.thumbnails?.default?.url ||
          channel.snippet?.thumbnails?.medium?.url ||
          '',
      }));

      this.logger.log(
        `Fetched ${channels.length} YouTube channels for user ${userId}`,
      );

      return {
        connected: true,
        channels,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch channel data for user ${userId}: ${error?.message}`,
        error.stack,
      );

      return {
        connected: false,
        error: 'Failed to fetch channel data',
      };
    }
  }

  /**
   * Get YouTube Analytics report for a channel
   * Fetches subscriber and view data by country for revenue estimation
   */
  async getAnalyticsReport(
    userId: string,
    channelId: string,
    durationMonths: number = 12,
  ): Promise<any> {
    try {
      // Get authenticated YouTube Analytics client
      const youtubeAnalytics =
        await this.youtubeTokenService.getYouTubeAnalyticsClient(userId);

      if (!youtubeAnalytics) {
        this.logger.warn(
          `No YouTube client available for user ${userId} - not connected`,
        );
        throw new Error('YouTube not connected');
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - durationMonths * 30); // Approximate months as 30 days

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // Fetch analytics report
      const response = await youtubeAnalytics.reports.query({
        ids: `channel==${channelId}`,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: 'country',
        metrics: 'views,subscribersGained',
      });

      this.logger.log(
        `Fetched YouTube Analytics report for channel ${channelId}, user ${userId}`,
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch analytics report for user ${userId}, channel ${channelId}: ${error?.message}`,
        error.stack,
      );

      throw new Error(
        `Failed to fetch analytics data: ${error?.message || 'Unknown error'}`,
        { cause: error },
      );
    }
  }

  /**
   * Sync channel data from YouTube API to database
   * Uses existing OAuth token to fetch and store channel info
   */
  async syncChannelData(userId: string): Promise<{
    success: boolean;
    channelId?: string;
    channelName?: string;
    error?: string;
    requiresAuth?: boolean;
  }> {
    try {
      // Fetch channel data using existing token
      const channelData = await this.getChannelDataForEstimator(userId);

      if (!channelData.connected) {
        return {
          success: false,
          error: 'No YouTube OAuth token found - please connect YouTube first',
          requiresAuth: true, // Flag indicating OAuth is needed
        };
      }

      if (!channelData.channels || channelData.channels.length === 0) {
        return {
          success: false,
          error: 'No YouTube channels found on this account',
        };
      }

      // Store the first channel (Google OAuth forces single channel selection)
      const channel = channelData.channels[0];

      // Upsert channel in database
      await this.youtubeChannelRepo.upsert(
        {
          channelId: channel.id,
          channelName: channel.title,
        },
        ['channelId'], // Conflict target: update if channelId already exists
      );

      // Update the OAuth token's channelId field (without re-storing the token)
      await this.youtubeTokenService.updateChannelId(userId, channel.id);

      this.logger.log(
        `Synced YouTube channel ${channel.title} (${channel.id}) for user ${userId}`,
      );

      return {
        success: true,
        channelId: channel.id,
        channelName: channel.title,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to sync channel data for user ${userId}: ${error?.message}`,
        error.stack,
      );

      return {
        success: false,
        error: error?.message || 'Failed to sync channel data',
      };
    }
  }

  /**
   * Generate mock YouTube channel data for testing (non-production only).
   * Returns realistic-looking data for an African content creator.
   */
  getMockChannelData(overrides?: {
    title?: string;
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
  }): {
    connected: boolean;
    channels: Array<{
      id: string;
      title: string;
      subscriberCount: string;
      viewCount: string;
      videoCount: string;
      thumbnailUrl: string;
    }>;
  } {
    const mockChannelId =
      'UCmock_' + Math.random().toString(36).substring(2, 15);

    const randomInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    const subscriberCount = randomInt(10_000, 500_000);
    const videoCount = randomInt(20, 500);
    const viewCount = subscriberCount * randomInt(10, 80);

    const channelNames = [
      'Nairobi Tech Weekly',
      'Lagos Beats Studio',
      'Accra Street Food',
      'Kampala Vlogs',
      'Dar es Salaam Daily',
      'Cape Town Creators',
      'Lusaka Life',
      'Kigali Connect',
    ];
    const randomTitle =
      channelNames[Math.floor(Math.random() * channelNames.length)];

    return {
      connected: true,
      channels: [
        {
          id: mockChannelId,
          title: overrides?.title ?? randomTitle,
          subscriberCount:
            overrides?.subscriberCount ?? String(subscriberCount),
          viewCount: overrides?.viewCount ?? String(viewCount),
          videoCount: overrides?.videoCount ?? String(videoCount),
          thumbnailUrl: 'https://placehold.co/88x88/FF0000/FFFFFF?text=YT',
        },
      ],
    };
  }

  /**
   * Generate mock YouTube Analytics report for testing (non-production only).
   * Returns per-country viewer/subscriber data weighted toward PawaPay-supported countries.
   */
  getMockAnalyticsReport(): {
    kind: string;
    columnHeaders: Array<{
      name: string;
      columnType: string;
      dataType: string;
    }>;
    rows: Array<[string, number, number]>;
  } {
    return {
      kind: 'youtubeAnalytics#resultTable',
      columnHeaders: [
        { name: 'country', columnType: 'DIMENSION', dataType: 'STRING' },
        { name: 'views', columnType: 'METRIC', dataType: 'INTEGER' },
        {
          name: 'subscribersGained',
          columnType: 'METRIC',
          dataType: 'INTEGER',
        },
      ],
      rows: this.generateMockCountryRows(),
    };
  }

  private generateMockCountryRows(): Array<[string, number, number]> {
    const randomInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    const countries = [
      'KE',
      'NG',
      'UG',
      'ZA',
      'TZ',
      'GH',
      'ZM',
      'RW',
      'CM',
      'SN',
      'US',
      'GB',
    ];

    return countries.map((code) => {
      const views = randomInt(2_000, 60_000);
      const subscribers = Math.round(views * (randomInt(1, 5) / 100));
      return [code, views, subscribers];
    });
  }
}
