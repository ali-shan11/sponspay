import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { skip, Subject, takeUntil } from 'rxjs';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';
import { AlertService } from '@services/alert.service';
import { YouTubeConnectionStatus } from '@app-types/youtube';
import { ButtonComponent } from '@components/button/button.component';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-youtube-channel-selector',
  imports: [ButtonComponent, InlineSvgComponent],
  templateUrl: './youtube-channel-selector.component.html',
  styleUrl: './youtube-channel-selector.component.scss'
})
export class YoutubeChannelSelectorComponent implements OnInit, OnDestroy {
  private youtubeOAuthService: YouTubeOAuthService = inject(YouTubeOAuthService);
  private alertService: AlertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  public svgIcon = SvgIcons;
  public youtubeConnectionStatus: YouTubeConnectionStatus = { connected: false, error: null };
  public isConnectingYouTube = false;

  async ngOnInit(): Promise<void> {
    // Initialize connection status from backend's sign-in response
    // This ensures we respect the backend's validation (token + channel)
    const backendStatus = this.youtubeOAuthService.getConnectionStatus();
    this.youtubeConnectionStatus = backendStatus;

    // Subscribe to YouTube connection status changes
    this.youtubeOAuthService.status$.pipe(
      skip(1), // Skip BehaviorSubject replay — initial status is already captured above
      takeUntil(this.destroy$)
    ).subscribe(status => {
      this.youtubeConnectionStatus = status;
      this.isConnectingYouTube = false;

      // If YouTube connected, fetch channel data so the Estimator step has it
      if (status.connected) {
        this.youtubeOAuthService.fetchAndSetChannelData();
        this.alertService.success(
          'Success',
          'YouTube channel connected successfully! You can now proceed to the next step.'
        );
      }
    });

    // Auto-sync on load: Try to sync channel data in case token exists but channel missing
    // Only attempt if backend says we're not already connected
    if (!backendStatus.connected) {
      await this.attemptAutoSync();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Attempt to sync channel data automatically
   * If token exists but channel missing, this will sync it
   * If token doesn't exist, will show connect button (no error)
   */
  private async attemptAutoSync(): Promise<void> {
    try {
      const result = await this.youtubeOAuthService.syncChannelData();

      if (result.success) {
        // Channel synced successfully! Update service status (drives onboarding Continue button)
        // and fetch channel data for the Estimator
        this.youtubeOAuthService.setConnectionStatus({ connected: true, error: null });
        this.youtubeOAuthService.fetchAndSetChannelData();
        console.log('Auto-synced YouTube channel:', result.channelName);
      } else if (result.requiresAuth) {
        // Token doesn't exist - user needs to connect (this is expected for new users)
        console.log('YouTube not connected yet - showing connect button');
      } else {
        // Other error - log but don't show to user (they can manually connect)
        console.warn('Auto-sync failed:', result.error);
      }
    } catch (error) {
      // Silent failure - user can manually connect if needed
      console.warn('Auto-sync error:', error);
    }
  }

  /**
   * Connect YouTube account via OAuth
   * Redirects to backend OAuth flow
   */
  async connectYouTube(): Promise<void> {
    try {
      this.isConnectingYouTube = true;
      await this.youtubeOAuthService.connectYouTube();
      // Will redirect to backend, then to Google, then back to frontend
    } catch (error) {
      console.error('Failed to initiate YouTube OAuth:', error);
      this.isConnectingYouTube = false;
      this.alertService.error('Connection Error', 'Failed to start YouTube connection. Please try again.');
    }
  }

}
