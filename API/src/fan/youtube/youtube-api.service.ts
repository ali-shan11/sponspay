import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, youtube_v3 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { RedisService } from '../../redis/redis.service';

export interface YouTubeVideoInfo {
  videoId: string;
  embedUrl: string;
  isLiveStream: boolean;
  title: string;
  description: string;
  thumbnailUrl: string;
}

@Injectable()
export class YouTubeApiService {
  private readonly logger = new Logger(YouTubeApiService.name);
  private youtube: youtube_v3.Youtube;
  private readonly CACHE_TTL = 300; // 5 minutes in seconds
  private readonly CACHE_KEY_PREFIX = 'youtube:live:';
  private readonly TITLE_CACHE_TTL = 86400; // 24 hours
  private readonly TITLE_CACHE_KEY_PREFIX = 'youtube:video:title:';

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    // Use Firebase service account credentials for YouTube API authentication
    const firebaseServiceAccount = this.configService.get<string>(
      'FIREBASE_SERVICE_ACCOUNT',
    );

    if (!firebaseServiceAccount) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT environment variable is required',
      );
    }

    // Parse the full service account JSON
    const credentials = JSON.parse(firebaseServiceAccount);

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
    });

    this.youtube = google.youtube({
      version: 'v3',
      auth: auth as any,
    });

    this.logger.log(
      'YouTube API service initialized with Firebase service account',
    );
  }

  /**
   * Checks if channel has active live stream.
   * If yes, returns the live stream info.
   * If no, returns the latest uploaded video.
   * Uses Redis cache with 5-minute TTL.
   */
  async getVideoInfo(
    youtubeChannelId: string,
  ): Promise<YouTubeVideoInfo | null> {
    try {
      // Check cache first
      const cached = await this.getCachedVideoInfo(youtubeChannelId);
      if (cached) {
        this.logger.log(`Cache hit for YouTube channel ${youtubeChannelId}`);
        return cached;
      }

      this.logger.log(
        `Cache miss for YouTube channel ${youtubeChannelId}, fetching from API`,
      );

      // 1. Check for active live streams
      const liveStreamInfo = await this.getActiveLiveStream(youtubeChannelId);
      if (liveStreamInfo) {
        await this.cacheVideoInfo(youtubeChannelId, liveStreamInfo);
        return liveStreamInfo;
      }

      // 2. Fallback to latest video
      const latestVideoInfo = await this.getLatestVideo(youtubeChannelId);
      if (latestVideoInfo) {
        await this.cacheVideoInfo(youtubeChannelId, latestVideoInfo);
      }

      return latestVideoInfo;
    } catch (error) {
      this.logger.error(
        `Failed to fetch YouTube video info for channel ${youtubeChannelId}`,
        error,
      );
      return null;
    }
  }

  async getVideoTitles(videoIds: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const unique = Array.from(new Set(videoIds.filter(Boolean)));
    if (unique.length === 0) return result;

    const redis = this.redisService.getPubClient();
    const uncached: string[] = [];

    for (const id of unique) {
      try {
        const cached = await redis.get(`${this.TITLE_CACHE_KEY_PREFIX}${id}`);
        if (cached !== null) {
          if (cached.length > 0) result.set(id, cached);
        } else {
          uncached.push(id);
        }
      } catch {
        uncached.push(id);
      }
    }

    if (uncached.length === 0) return result;

    try {
      const response = await this.youtube.videos.list({
        part: ['snippet'],
        id: uncached,
        maxResults: uncached.length,
      });

      const found = new Set<string>();
      for (const item of response.data.items ?? []) {
        const id = item.id;
        const title = item.snippet?.title;
        if (id && title) {
          result.set(id, title);
          found.add(id);
          try {
            await redis.setex(
              `${this.TITLE_CACHE_KEY_PREFIX}${id}`,
              this.TITLE_CACHE_TTL,
              title,
            );
          } catch {
            // Non-blocking
          }
        }
      }

      // Negative-cache missing videos with empty string so we don't refetch them repeatedly
      for (const id of uncached) {
        if (!found.has(id)) {
          try {
            await redis.setex(
              `${this.TITLE_CACHE_KEY_PREFIX}${id}`,
              this.TITLE_CACHE_TTL,
              '',
            );
          } catch {
            // Non-blocking
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch YouTube video titles for ids [${uncached.join(', ')}]`,
        error,
      );
    }

    return result;
  }

  private async getActiveLiveStream(
    channelId: string,
  ): Promise<YouTubeVideoInfo | null> {
    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        channelId,
        eventType: 'live',
        type: ['video'],
        maxResults: 1,
      });

      const liveStream = response.data.items?.[0];
      if (!liveStream || !liveStream.id?.videoId) {
        return null;
      }

      return {
        videoId: liveStream.id.videoId,
        embedUrl: `https://www.youtube.com/embed/${liveStream.id.videoId}`,
        isLiveStream: true,
        title: liveStream.snippet?.title || 'Live Stream',
        description: liveStream.snippet?.description || '',
        thumbnailUrl:
          liveStream.snippet?.thumbnails?.high?.url ||
          liveStream.snippet?.thumbnails?.default?.url ||
          '',
      };
    } catch (error) {
      this.logger.error(
        `Error checking for live stream on channel ${channelId}`,
        error,
      );
      return null;
    }
  }

  private async getLatestVideo(
    channelId: string,
  ): Promise<YouTubeVideoInfo | null> {
    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        channelId,
        order: 'date',
        type: ['video'],
        maxResults: 1,
      });

      const latestVideo = response.data.items?.[0];
      if (!latestVideo || !latestVideo.id?.videoId) {
        return null;
      }

      return {
        videoId: latestVideo.id.videoId,
        embedUrl: `https://www.youtube.com/embed/${latestVideo.id.videoId}`,
        isLiveStream: false,
        title: latestVideo.snippet?.title || 'Latest Video',
        description: latestVideo.snippet?.description || '',
        thumbnailUrl:
          latestVideo.snippet?.thumbnails?.high?.url ||
          latestVideo.snippet?.thumbnails?.default?.url ||
          '',
      };
    } catch (error) {
      this.logger.error(
        `Error fetching latest video for channel ${channelId}`,
        error,
      );
      return null;
    }
  }

  private async getCachedVideoInfo(
    channelId: string,
  ): Promise<YouTubeVideoInfo | null> {
    try {
      const redis = this.redisService.getPubClient();
      const cacheKey = `${this.CACHE_KEY_PREFIX}${channelId}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached) as YouTubeVideoInfo;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error reading from cache for channel ${channelId}`,
        error,
      );
      return null;
    }
  }

  private async cacheVideoInfo(
    channelId: string,
    info: YouTubeVideoInfo,
  ): Promise<void> {
    try {
      const redis = this.redisService.getPubClient();
      const cacheKey = `${this.CACHE_KEY_PREFIX}${channelId}`;
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(info));
      this.logger.log(
        `Cached YouTube video info for channel ${channelId} (TTL: ${this.CACHE_TTL}s)`,
      );
    } catch (error) {
      this.logger.error(
        `Error writing to cache for channel ${channelId}`,
        error,
      );
      // Non-blocking - continue even if cache write fails
    }
  }
}
