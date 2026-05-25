import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { ZohoSalesIQService } from '@services/zoho-salesiq.service';
import { ZohoPageSenseService } from '@services/zoho-pagesense.service';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';
import { AlertService } from '@services/alert.service';
import { LoaderComponent } from "@components/loader/loader.component";
import { AlertComponent } from "@components/alert/alert.component";

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, LoaderComponent, AlertComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
    private zohoSalesIQService = inject(ZohoSalesIQService);
    private zohoPageSenseService = inject(ZohoPageSenseService);
    // Injected to ensure AuthService initializes early (session restore, auth state)
    private authService = inject(AuthService);
    private route = inject(ActivatedRoute);
    private youtubeOAuthService = inject(YouTubeOAuthService);
    private alertService = inject(AlertService);

    async ngOnInit(): Promise<void> {
        this.zohoSalesIQService.initializeTracking()
            .then(() => {
                console.log('App: Zoho SalesIQ tracking ready');
            })
            .catch((error) => {
                console.warn('App: Zoho SalesIQ tracking failed to initialize:', error);
            });

        this.zohoPageSenseService.initializeTracking()
            .then(() => {
                console.log('App: Zoho PageSense tracking ready');
                this.authService.user$.subscribe(user => {
                    if (user?.email) {
                        this.zohoPageSenseService.identifyUser(user.email, {
                            displayName: user.displayName || '',
                            uid: user.uid
                        });
                    }
                });
            })
            .catch((error) => {
                console.warn('App: Zoho PageSense tracking failed to initialize:', error);
            });

        // Check for YouTube OAuth callback
        this.route.queryParams.subscribe(params => {
            if (params['youtube_connected'] || params['youtube_error']) {
                this.handleYouTubeOAuthCallback(params);
            }
        });
    }

    /**
     * Handle YouTube OAuth callback after user returns from Google consent screen
     */
    private handleYouTubeOAuthCallback(params: Params): void {
        const status = this.youtubeOAuthService.checkOAuthCallback(params);

        if (status.connected) {
            this.alertService.success(
                'YouTube Connected',
                'Your YouTube channel is now connected! You can now send thank-you messages to your supporters.'
            );
        } else if (status.error === 'denied') {
            this.alertService.info(
                'Connection Cancelled',
                'You declined the YouTube connection. You can connect later from Settings.'
            );
        } else if (status.error === 'no_channel') {
            this.alertService.error(
                'No YouTube Channel',
                'This Google account doesn\'t have a YouTube channel. Please try again with an account that has a channel.'
            );
        } else if (status.error === 'failed') {
            this.alertService.error(
                'Connection Failed',
                'Failed to connect your YouTube account. Please try again or contact support if the issue persists.'
            );
        }
    }
}
