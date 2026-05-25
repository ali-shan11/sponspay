export interface YouTubeConnectionStatus {
  connected: boolean;
  error?: 'denied' | 'failed' | 'no_channel' | null;
}

export interface YouTubeOAuthCallbackParams {
  youtube_connected?: 'true' | 'false';
  youtube_error?: 'denied' | 'failed' | 'no_channel';
}
