import { Injectable, Logger } from '@nestjs/common';
import { youtube_v3 } from 'googleapis';

@Injectable()
export class YouTubeVideoInfoService {
  private readonly logger = new Logger(YouTubeVideoInfoService.name);

  /**
   * Get live chat ID from video ID
   * Returns null if not a livestream or if livestream has ended
   */
  async getLiveChatId(
    videoId: string,
    youtube: youtube_v3.Youtube,
  ): Promise<string | null> {
    try {
      const response = await youtube.videos.list({
        part: ['liveStreamingDetails'],
        id: [videoId],
      });

      const video = response.data.items?.[0];
      if (!video) {
        this.logger.warn(`No video found with ID ${videoId}`);
        return null;
      }

      const liveChatId = video.liveStreamingDetails?.activeLiveChatId || null;

      if (!liveChatId) {
        this.logger.debug(
          `Video ${videoId} is not an active livestream or has no active chat`,
        );
      }

      return liveChatId;
    } catch (error: any) {
      this.logger.error(
        `Failed to get live chat ID for video ${videoId}: ${error?.message}`,
      );
      return null;
    }
  }
}
