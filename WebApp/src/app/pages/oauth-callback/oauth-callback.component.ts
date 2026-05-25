import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  template: `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
      <div style="text-align: center;">
        <p>{{ message }}</p>
        <p style="font-size: 14px; color: #666;">This window will close automatically...</p>
      </div>
    </div>
  `,
})
export class OAuthCallbackComponent implements OnInit {
  message = 'Processing OAuth callback...';

  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    // Get query parameters from the OAuth callback
    this.route.queryParams.subscribe((params) => {
      const youtubeConnected = params['youtube_connected'];
      const youtubeError = params['youtube_error'];

      let success = false;
      let error: string | null = null;

      if (youtubeConnected === 'true') {
        success = true;
        this.message = 'YouTube connected successfully!';
      } else if (youtubeError) {
        success = false;
        error = youtubeError;
        this.message = youtubeError === 'no_channel'
          ? 'This Google account does not have a YouTube channel.'
          : `Failed to connect YouTube: ${youtubeError}`;
      } else {
        success = false;
        error = 'unknown';
        this.message = 'Unknown OAuth result';
      }

      // Send result to parent window via postMessage
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'youtube-oauth-result',
            success,
            error,
          },
          window.location.origin
        );

        // Close popup after a short delay
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        this.message = 'Error: This page must be opened in a popup window.';
      }
    });
  }
}
