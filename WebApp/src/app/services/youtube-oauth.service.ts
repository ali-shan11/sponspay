import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenService } from './token.service';
import { YouTubeConnectionStatus } from '../types/youtube';
import { CUSTOM_REQUEST_CONTEXT } from '../auth/interceptor/http-context.tokens';
import { ChannelInfo, YouTubeAnalyticsReportResponse, YouTubeAPIErrorResponse } from '@app-types/youtube-analytics';
import { SubscriberDurationInMonths } from '@utils/constants';

@Injectable({ providedIn: 'root' })
export class YouTubeOAuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);

  // Observable for connection status
  private connectionStatus$ = new BehaviorSubject<YouTubeConnectionStatus>({
    connected: false,
    error: null,
  });

  public readonly status$ = this.connectionStatus$.asObservable();

  // YouTube channel state
  private channelStatusSubject = new BehaviorSubject<'unknown' | 'found' | 'not_found'>('unknown');
  private availableChannelsSubject = new BehaviorSubject<ChannelInfo[]>([]);
  public channelStatus$ = this.channelStatusSubject.asObservable();
  public availableChannels$ = this.availableChannelsSubject.asObservable();
  public selectedChannel: ChannelInfo | null = null;

  /**
   * Initiate YouTube OAuth flow using popup window
   * Opens OAuth consent in a popup for better security (no token in URL)
   */
  async connectYouTube(): Promise<void> {
    // Get current Firebase ID token (required for backend authentication)
    const firebaseToken = await this.tokenService.getToken();

    if (!firebaseToken) {
      throw new Error('User must be authenticated to connect YouTube');
    }

    // Capture return URL to redirect back after OAuth completes
    const returnUrl = window.location.pathname + window.location.search;

    try {
      // Get OAuth URL from backend (authenticated request with header)
      const response = await firstValueFrom(
        this.http.get<{ authUrl: string }>(
          `${environment.API_BASE}/creator/youtube/auth-url`,
          { params: { returnUrl } }
        )
      );

      // Open OAuth URL in a centered popup window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        response.authUrl,
        'youtube-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
      );

      if (!popup) {
        throw new Error('Failed to open popup. Please allow popups for this site.');
      }

      // Listen for OAuth callback result via postMessage
      let messageHandled = false;

      const messageHandler = (event: MessageEvent) => {
        // Verify message origin matches our API base
        const apiOrigin = new URL(environment.API_BASE).origin;
        if (event.origin !== apiOrigin && event.origin !== window.location.origin) {
          return;
        }

        if (event.data?.type === 'youtube-oauth-result') {
          messageHandled = true;
          window.removeEventListener('message', messageHandler);
          popup.close();

          if (event.data.success) {
            this.connectionStatus$.next({ connected: true, error: null });
          } else {
            this.connectionStatus$.next({
              connected: false,
              error: event.data.error || 'failed'
            });
          }
        }
      };

      window.addEventListener('message', messageHandler);

      // Clean up listener if popup is closed manually (without completing OAuth)
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          // Only emit if the message handler didn't already handle it
          if (!messageHandled) {
            this.connectionStatus$.next({ connected: false, error: null });
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to initiate YouTube OAuth:', error);
      this.connectionStatus$.next({
        connected: false,
        error: 'failed'
      });
      throw error;
    }
  }

  /**
   * Check if YouTube OAuth callback parameters are present
   * Call this on app initialization or route change
   */
  checkOAuthCallback(params: {
    youtube_connected?: string;
    youtube_error?: string;
  }): YouTubeConnectionStatus {
    if (params.youtube_connected === 'true') {
      const status = { connected: true, error: null };
      this.connectionStatus$.next(status);

      // Clear query params and restore return URL
      this.cleanupOAuthCallback();
      return status;
    }

    if (params.youtube_error) {
      const status = {
        connected: false,
        error: params.youtube_error as 'denied' | 'failed' | 'no_channel',
      };
      this.connectionStatus$.next(status);

      // Clear query params
      this.cleanupOAuthCallback();
      return status;
    }

    return { connected: false, error: null };
  }

  /**
   * Clean up OAuth callback query params
   */
  private cleanupOAuthCallback(): void {
    // Just remove query params from current URL
    const url = new URL(window.location.href);
    url.searchParams.delete('youtube_connected');
    url.searchParams.delete('youtube_error');
    window.history.replaceState({}, document.title, url.pathname);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): YouTubeConnectionStatus {
    return this.connectionStatus$.value;
  }

  /**
   * Set connection status explicitly
   * Used when the backend confirms connection state (e.g., sign-in response, auto-sync)
   */
  setConnectionStatus(status: YouTubeConnectionStatus): void {
    this.connectionStatus$.next(status);
  }

  /**
   * Get YouTube channel data for revenue estimator
   * Returns channel info if YouTube is connected, or connection status if not
   */
  async getChannelDataForEstimator(): Promise<{
    connected: boolean;
    channels?: {
      id: string;
      title: string;
      subscriberCount: string;
      viewCount: string;
      videoCount: string;
      thumbnailUrl: string;
    }[];
    error?: string;
  }> {
    const firebaseToken = await this.tokenService.getToken();

    if (!firebaseToken) {
      throw new Error('User must be authenticated');
    }

    const params: Record<string, string> = {};
    if (environment.mockYouTubeOnboarding) {
      params['mock'] = 'false';
    }

    const response = await firstValueFrom(
      this.http.get<{
        connected: boolean;
        channels?: {
          id: string;
          title: string;
          subscriberCount: string;
          viewCount: string;
          videoCount: string;
          thumbnailUrl: string;
        }[];
        error?: string;
      }>(`${environment.API_BASE}/creator/youtube/channel-data`, { params })
    );

    return response || { connected: false, error: 'Request failed' };
  }

  /**
   * Sync YouTube channel data
   * Uses existing OAuth token to fetch and store channel info in backend
   * Returns requiresAuth: true if token doesn't exist (need to authorize)
   */
  async syncChannelData(): Promise<{
    success: boolean;
    channelId?: string;
    channelName?: string;
    error?: string;
    requiresAuth?: boolean;
  }> {
    const firebaseToken = await this.tokenService.getToken();

    if (!firebaseToken) {
      throw new Error('User must be authenticated');
    }

    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
      skipAlert: true
    });

    return await firstValueFrom(
      this.http.post<{
        success: boolean;
        channelId?: string;
        channelName?: string;
        error?: string;
        requiresAuth?: boolean;
      }>(`${environment.API_BASE}/creator/youtube/sync`, {}, { context })
    );
  }

  /**
   * Get YouTube Analytics report for a channel
   * Fetches subscriber and view data by country for revenue estimation
   */
  async getAnalyticsReport(
    channelId: string,
    durationMonths = 12
  ): Promise<unknown> {
    const firebaseToken = await this.tokenService.getToken();

    if (!firebaseToken) {
      throw new Error('User must be authenticated');
    }

    const params: Record<string, string> = { channelId, durationMonths: durationMonths.toString() };
    if (environment.mockYouTubeOnboarding) {
      params['mock'] = 'true';
    }

    return await firstValueFrom(
      this.http.get(`${environment.API_BASE}/creator/youtube/analytics-report`, { params })
    );
  }

  // --- Channel state management (moved from AuthService) ---

  getCurrentChannelStatus(): 'unknown' | 'found' | 'not_found' {
    return this.channelStatusSubject.value;
  }

  getCurrentAvailableChannels(): ChannelInfo[] {
    return this.availableChannelsSubject.value;
  }

  setChannelStatus(status: 'unknown' | 'found' | 'not_found'): void {
    this.channelStatusSubject.next(status);
  }

  async fetchAndSetChannelData(): Promise<void> {
    try {
      const channelData = await this.getChannelDataForEstimator();

      if (channelData.connected && channelData.channels && channelData.channels.length > 0) {
        console.log('YouTube channels fetched from backend:', channelData.channels.length);

        const channels: ChannelInfo[] = channelData.channels.map(ch => ({
          id: ch.id,
          title: ch.title,
          thumbnail: ch.thumbnailUrl,
          role: 'owner' as const,
          subscriberCount: parseInt(ch.subscriberCount, 10)
        }));

        this.availableChannelsSubject.next(channels);
        this.channelStatusSubject.next('found');
      } else {
        this.channelStatusSubject.next('not_found');
        this.connectionStatus$.next({ connected: false, error: 'no_channel' });
      }
    } catch (error) {
      console.error('Error fetching YouTube channel data from backend:', error);
      this.channelStatusSubject.next('not_found');
      this.connectionStatus$.next({ connected: false, error: 'failed' });
    }
  }

  async getChannelMembersReportForChannel(channelId: string): Promise<YouTubeAnalyticsReportResponse | undefined> {
    try {
      const report = await this.getAnalyticsReport(channelId, SubscriberDurationInMonths);
      console.log(`YouTube Analytics - Channel Report for ${channelId}:`, report);
      return report as YouTubeAnalyticsReportResponse;
    } catch (errorResponse: unknown) {
      console.error(`Error fetching YouTube Analytics report for channel ${channelId}:`, errorResponse);
      const typedError = errorResponse as YouTubeAPIErrorResponse;
      if (typedError.error && typedError.error.error) {
        console.error('Google API Error Details:', typedError.error.error);
        if (typedError.error.error.message) {
          console.error('Google API Error Message:', typedError.error.error.message);
        }
        if (typedError.error.error.errors) {
          console.error('Google API Specific Errors:', typedError.error.error.errors);
        }
      } else if (typedError.error) {
        console.error('API Error (root level):', typedError.error);
      }
      throw errorResponse;
    }
  }

  /**
   * Disconnect YouTube channel
   * Calls API to remove OAuth token and channel junction, then resets local state
   */
  async disconnectYouTube(): Promise<void> {
    await firstValueFrom(
      this.http.delete<{ success: boolean }>(
        `${environment.API_BASE}/creator/youtube/disconnect`,
      ),
    );

    this.connectionStatus$.next({ connected: false, error: null });
    this.resetChannelState();
  }

  resetChannelState(): void {
    this.channelStatusSubject.next('unknown');
    this.availableChannelsSubject.next([]);
    this.selectedChannel = null;
  }
}
