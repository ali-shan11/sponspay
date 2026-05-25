# YouTube Thank You Messages - OAuth Flow Fix

## Critical Issue Discovered

**Status**: Backend implementation is COMPLETE and DEPLOYED. Frontend integration is BLOCKED.

**Problem**: The frontend developer correctly identified that **Firebase Authentication does NOT provide YouTube refresh tokens** to client-side applications. The current Firebase Auth flow only provides:
- Firebase ID tokens (for backend auth)
- Google access tokens (1-hour expiration, no refresh capability)

**Impact**: The backend infrastructure expects `youtubeRefreshToken` via `POST /creator/sign-in` and `POST /creator/onboard`, but the frontend cannot obtain it through Firebase Auth.

## Investigation Summary

### Current Frontend Implementation
**Location**: `/home/filip/WebApp/src/app/services/auth.service.ts`

**Current Flow**:
```typescript
// Firebase Auth with Google (lines 93-98)
const credential = GoogleAuthProvider.credentialFromResult(result);
const accessToken = credential?.accessToken; // ✓ Available (1-hour expiration)
const refreshToken = credential?.refreshToken; // ✗ UNDEFINED (not provided by Firebase)
```

**Scopes Currently Requested**:
- `https://www.googleapis.com/auth/youtube.readonly` (read-only)
- `https://www.googleapis.com/auth/yt-analytics.readonly` (analytics)
- **Missing**: `youtube.force-ssl` (required for posting messages)

### Backend Implementation (Already Complete)
**Status**: ✅ Fully implemented, tested, and deployed

**Components**:
- `YouTubeOAuthToken` entity (AES-256-GCM encrypted storage)
- `YouTubeTokenService` (token refresh, caching)
- `YouTubeMessageService` (orchestrator)
- `YouTubeCommentService` (video comments)
- `YouTubeChatService` (livestream chat)
- Integration with PawaPay webhooks

**Waiting For**: YouTube refresh tokens from frontend

---

## Solution Options

### Option A: Backend-Initiated OAuth Flow (SELECTED)
**Complexity**: Medium | **Security**: High | **UX**: Good

Implement a server-side OAuth flow where the backend handles the token exchange.

**Flow**:
1. Frontend initiates OAuth by redirecting user to backend endpoint
2. Backend redirects to Google OAuth consent screen
3. User grants permissions (including `youtube.force-ssl`)
4. Google redirects back to backend with authorization code
5. Backend exchanges code for refresh token (server-to-server)
6. Backend stores encrypted refresh token in database
7. Backend redirects user back to frontend with success/failure

**Pros**:
- ✅ Refresh token never exposed to client
- ✅ Backend has full control over token storage
- ✅ Standard OAuth 2.0 flow (well-documented)
- ✅ Can request `offline_access` to guarantee refresh token

**Cons**:
- ⚠️ Requires new backend endpoints (`/creator/youtube/connect`, `/creator/youtube/callback`)
- ⚠️ Requires frontend redirect flow (interrupts user experience)

**Implementation**:
- **Backend**: Add OAuth controller with Google OAuth client setup
- **Frontend**: Redirect to backend OAuth endpoint
- **Estimated effort**: 1-2 days backend, 0.5 days frontend

---

### Option B: Frontend OAuth with Backend Token Exchange
**Complexity**: Low | **Security**: Medium | **UX**: Good

Use Google OAuth in the frontend, but exchange the authorization code on the backend.

**Flow**:
1. Frontend initiates Google OAuth popup/redirect with `youtube.force-ssl` scope
2. Frontend receives authorization code (NOT tokens)
3. Frontend sends authorization code to backend: `POST /creator/youtube/exchange-token`
4. Backend exchanges code for refresh token (server-to-server)
5. Backend stores encrypted refresh token

**Pros**:
- ✅ Simpler frontend implementation
- ✅ No redirect flow (can use popup)
- ✅ Refresh token only exists on backend

**Cons**:
- ⚠️ Requires separate OAuth flow (not integrated with Firebase)
- ⚠️ Authorization code is short-lived (must be exchanged quickly)
- ⚠️ Requires new backend endpoint

---

### Option C: Hybrid - Firebase Auth + Separate YouTube OAuth
**Complexity**: High | **Security**: High | **UX**: Fair

Keep Firebase Auth for general authentication, add separate YouTube OAuth for creators.

**Flow**:
1. User signs in with Firebase (existing flow)
2. User clicks "Connect YouTube" button in settings
3. Triggers Option A or B flow specifically for YouTube
4. Backend stores refresh token linked to Firebase user ID

**Pros**:
- ✅ Doesn't disrupt existing Firebase Auth flow
- ✅ YouTube connection is optional (progressive enhancement)
- ✅ Can be added post-launch

**Cons**:
- ⚠️ Requires extra user action (not seamless)
- ⚠️ Two OAuth flows to maintain
- ⚠️ Users may skip YouTube connection step

---

## Selected Approach: Option A - Backend-Initiated OAuth Flow

### Why Option A?
1. **Security**: Refresh token never leaves backend
2. **Standard**: Well-documented OAuth 2.0 server-side flow
3. **Flexibility**: Easy to add scope upgrades or re-authentication later
4. **Separation of Concerns**: Firebase handles general auth, YouTube OAuth is separate

---

## Implementation Plan

### Phase 1: Backend OAuth Setup

#### 1.1 Environment Configuration

**Files to Modify**:
- `.env` (local)
- `docker-compose.yaml` (local)
- `k8s/base/deployment.yaml` (production)
- `k8s/base/secrets.yaml` (production, create if missing)

**Environment Variables to Add**:
```bash
# Google OAuth Credentials (for YouTube API access)
GOOGLE_OAUTH_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<your-google-oauth-client-secret>
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/creator/youtube/callback  # Dev
GOOGLE_OAUTH_REDIRECT_URI=https://api.sponspay.io/creator/youtube/callback  # Prod

# Frontend URLs for post-OAuth redirects
FRONTEND_URL=http://localhost:4200  # Dev
FRONTEND_URL=https://app.sponspay.io  # Prod
```

**Steps**:
1. Obtain Google OAuth credentials from Google Cloud Console
2. Configure authorized redirect URIs in Google Console:
   - `http://localhost:3000/creator/youtube/callback` (development)
   - `https://api.sponspay.io/creator/youtube/callback` (production)
3. Add credentials to `.env` file
4. Add to Kubernetes secrets: `kubectl create secret generic google-oauth --from-literal=client-id=... --from-literal=client-secret=...`

---

#### 1.2 Create YouTubeOAuthModule

**New File**: `src/youtube-oauth/youtube-oauth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { YouTubeOAuthController } from './youtube-oauth.controller';
import { YouTubeOAuthService } from './youtube-oauth.service';
import { YouTubeMessageModule } from '../youtube-message/youtube-message.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [YouTubeMessageModule, AuthModule],
  controllers: [YouTubeOAuthController],
  providers: [YouTubeOAuthService],
  exports: [YouTubeOAuthService],
})
export class YouTubeOAuthModule {}
```

**Import in AppModule**:
```typescript
// src/app.module.ts
imports: [
  // ... existing modules
  YouTubeOAuthModule,
],
```

---

#### 1.3 Create YouTubeOAuthService

**New File**: `src/youtube-oauth/youtube-oauth.service.ts`

**Core Methods**:

1. **`getAuthUrl(firebaseUid: string): Promise<string>`**
   - Generate Google OAuth URL
   - Include `access_type: 'offline'` to get refresh token
   - Use `prompt: 'consent'` to force consent screen
   - Encode user context in state parameter (JWT or encrypted)

2. **`handleCallback(code: string, state: string): Promise<{ userId: string; success: boolean }>`**
   - Validate state parameter (CSRF protection)
   - Exchange authorization code for tokens
   - Extract refresh token
   - Store encrypted token via `YouTubeTokenService`
   - Return user ID for redirect

3. **`revokeConnection(userId: string): Promise<void>`**
   - Delete stored refresh token
   - Optionally revoke token with Google

**Implementation**:
```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { YouTubeTokenService } from '../youtube-message/services/youtube-token.service';

@Injectable()
export class YouTubeOAuthService {
  private readonly logger = new Logger(YouTubeOAuthService.name);
  private oauth2Client: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly youtubeTokenService: YouTubeTokenService,
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
  getAuthUrl(userId: string): string {
    const state = this.encodeState({ userId, timestamp: Date.now() });

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // CRITICAL: Request refresh token
      scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
      state,
      prompt: 'consent', // Force consent to guarantee refresh token
      include_granted_scopes: true,
    });
  }

  /**
   * Handle OAuth callback with authorization code
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ userId: string; success: boolean }> {
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

    try {
      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        this.logger.error('No refresh token received from Google OAuth');
        return { userId: stateData.userId, success: false };
      }

      // Store encrypted refresh token
      await this.youtubeTokenService.upsertRefreshToken(
        stateData.userId,
        tokens.refresh_token,
      );

      this.logger.log(`YouTube refresh token stored for user ${stateData.userId}`);
      return { userId: stateData.userId, success: true };
    } catch (error) {
      this.logger.error(`OAuth token exchange failed: ${error.message}`, error.stack);
      return { userId: stateData.userId, success: false };
    }
  }

  /**
   * Encode state parameter (simple Base64 encoding)
   * TODO: Consider JWT or encryption for production
   */
  private encodeState(data: { userId: string; timestamp: number }): string {
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  /**
   * Decode state parameter
   */
  private decodeState(state: string): { userId: string; timestamp: number } | null {
    try {
      return JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
  }

  /**
   * Revoke YouTube connection
   */
  async revokeConnection(userId: string): Promise<void> {
    await this.youtubeTokenService.revokeToken(userId);
    this.logger.log(`YouTube connection revoked for user ${userId}`);
  }
}
```

---

#### 1.4 Create YouTubeOAuthController

**New File**: `src/youtube-oauth/youtube-oauth.controller.ts`

**Endpoints**:

1. **`GET /creator/youtube/connect`** - Initiate OAuth flow
   - Requires Firebase authentication
   - Redirects to Google OAuth consent screen

2. **`GET /creator/youtube/callback`** - Handle OAuth callback
   - Public endpoint (no auth required)
   - Validates code and state
   - Stores refresh token
   - Redirects back to frontend with success/failure

3. **`DELETE /creator/youtube/disconnect`** - Revoke connection
   - Requires Firebase authentication
   - Deletes stored refresh token

**Implementation**:
```typescript
import {
  Controller,
  Get,
  Delete,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { YouTubeOAuthService } from './youtube-oauth.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { GetUser } from '../decorators/get-user.decorator';
import { User } from '../creator/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('YouTube OAuth')
@Controller('creator/youtube')
export class YouTubeOAuthController {
  constructor(
    private readonly youtubeOAuthService: YouTubeOAuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initiate YouTube OAuth flow
   * Redirects user to Google consent screen
   */
  @Get('connect')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth('firebase')
  @ApiOperation({
    summary: 'Connect YouTube account',
    description: 'Initiates OAuth flow to connect creator YouTube account for thank-you messages',
  })
  async connect(@GetUser() user: User, @Res() res: Response) {
    const authUrl = this.youtubeOAuthService.getAuthUrl(user.id);
    return res.redirect(authUrl);
  }

  /**
   * Handle OAuth callback from Google
   * Exchanges code for refresh token and redirects back to frontend
   */
  @Get('callback')
  @ApiOperation({
    summary: 'OAuth callback endpoint',
    description: 'Handles OAuth callback from Google, exchanges code for tokens',
  })
  @ApiQuery({ name: 'code', description: 'Authorization code from Google' })
  @ApiQuery({ name: 'state', description: 'State parameter for CSRF protection' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get('FRONTEND_URL');

    // Handle user denial
    if (error === 'access_denied') {
      return res.redirect(`${frontendUrl}/settings?youtube_error=denied`);
    }

    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter');
    }

    const result = await this.youtubeOAuthService.handleCallback(code, state);

    // Redirect back to frontend with result
    if (result.success) {
      return res.redirect(`${frontendUrl}/settings?youtube_connected=true`);
    } else {
      return res.redirect(`${frontendUrl}/settings?youtube_error=failed`);
    }
  }

  /**
   * Disconnect YouTube account
   */
  @Delete('disconnect')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth('firebase')
  @ApiOperation({
    summary: 'Disconnect YouTube account',
    description: 'Revokes YouTube connection and deletes stored refresh token',
  })
  async disconnect(@GetUser() user: User) {
    await this.youtubeOAuthService.revokeConnection(user.id);
    return { success: true, message: 'YouTube connection removed' };
  }
}
```

---

### Phase 2: Frontend Integration (WebApp)

**Base Directory**: `../WebApp/`

---

#### 2.1 Create YouTube OAuth Service

**New File**: `src/app/services/youtube-oauth.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenService } from './token.service';

export interface YouTubeConnectionStatus {
  connected: boolean;
  error?: 'denied' | 'failed' | null;
}

@Injectable({ providedIn: 'root' })
export class YouTubeOAuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);

  // Observable for connection status
  private connectionStatus$ = new BehaviorSubject<YouTubeConnectionStatus>({
    connected: false,
    error: null
  });

  public readonly status$ = this.connectionStatus$.asObservable();

  /**
   * Initiate YouTube OAuth flow
   * Redirects user to backend OAuth endpoint which handles the entire flow
   */
  async connectYouTube(): Promise<void> {
    // Get current Firebase ID token (required for backend authentication)
    const firebaseToken = await this.tokenService.getToken();

    if (!firebaseToken) {
      throw new Error('User must be authenticated to connect YouTube');
    }

    // Store return URL to redirect back after OAuth completes
    const returnUrl = window.location.pathname + window.location.search;
    sessionStorage.setItem('youtube_oauth_return_url', returnUrl);

    // Redirect to backend OAuth endpoint
    // Backend will redirect to Google, then back to frontend with query params
    window.location.href = `${environment.API_BASE}/creator/youtube/connect`;
  }

  /**
   * Disconnect YouTube account
   */
  async disconnectYouTube(): Promise<void> {
    const firebaseToken = await this.tokenService.getToken();

    if (!firebaseToken) {
      throw new Error('User must be authenticated');
    }

    await this.http.delete(
      `${environment.API_BASE}/creator/youtube/disconnect`
    ).toPromise();

    // Update connection status
    this.connectionStatus$.next({ connected: false, error: null });
  }

  /**
   * Check if YouTube OAuth callback parameters are present
   * Call this on app initialization or route change
   */
  checkOAuthCallback(params: { youtube_connected?: string; youtube_error?: string }): YouTubeConnectionStatus {
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
        error: params.youtube_error as 'denied' | 'failed'
      };
      this.connectionStatus$.next(status);

      // Clear query params
      this.cleanupOAuthCallback();
      return status;
    }

    return { connected: false, error: null };
  }

  /**
   * Clean up OAuth callback query params and restore original URL
   */
  private cleanupOAuthCallback(): void {
    const returnUrl = sessionStorage.getItem('youtube_oauth_return_url');
    sessionStorage.removeItem('youtube_oauth_return_url');

    if (returnUrl) {
      // Navigate back to original URL without query params
      window.history.replaceState({}, document.title, returnUrl);
    } else {
      // Just remove query params from current URL
      const url = new URL(window.location.href);
      url.searchParams.delete('youtube_connected');
      url.searchParams.delete('youtube_error');
      window.history.replaceState({}, document.title, url.pathname);
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): YouTubeConnectionStatus {
    return this.connectionStatus$.value;
  }
}
```

---

#### 2.2 Update App Component (OAuth Callback Handler)

**File**: `src/app/app.component.ts`

**Modifications**:

Add YouTube OAuth callback detection in `ngOnInit()`:

```typescript
import { YouTubeOAuthService } from './services/youtube-oauth.service';
import { AlertService } from './services/alert.service';
import { ActivatedRoute } from '@angular/router';

export class AppComponent implements OnInit {
  private readonly youtubeOAuthService = inject(YouTubeOAuthService);
  private readonly alertService = inject(AlertService);
  private readonly route = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    // Existing auth flow handling
    this.authService.user$.subscribe(async (user) => {
      if (user) {
        await this.authFlowService.handlePostRedirectFlow(user);
      } else {
        await this.handleRedirectCancellation();
      }
    });

    // NEW: Check for YouTube OAuth callback
    this.route.queryParams.subscribe(params => {
      if (params['youtube_connected'] || params['youtube_error']) {
        this.handleYouTubeOAuthCallback(params);
      }
    });
  }

  /**
   * Handle YouTube OAuth callback
   */
  private handleYouTubeOAuthCallback(params: any): void {
    const status = this.youtubeOAuthService.checkOAuthCallback(params);

    if (status.connected) {
      this.alertService.success(
        'YouTube Connected',
        'Your YouTube channel is now connected for automatic thank-you messages!'
      );
    } else if (status.error === 'denied') {
      this.alertService.info(
        'Connection Cancelled',
        'YouTube connection was cancelled. You can connect later from Settings.'
      );
    } else if (status.error === 'failed') {
      this.alertService.error(
        'Connection Failed',
        'Failed to connect YouTube. Please try again or contact support.'
      );
    }
  }
}
```

---

#### 2.3 Update Settings - Social Links Component

**File**: `src/app/pages/content-creator/dashboard/settings/social/social.component.ts`

**Add YouTube Connection UI**:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { YouTubeOAuthService, YouTubeConnectionStatus } from '../../../../../services/youtube-oauth.service';
import { SvgIcons } from '../../../../../interfaces/icons';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social.component.html',
  styleUrls: ['./social.component.scss']
})
export class SocialComponent implements OnInit {
  private readonly youtubeOAuthService = inject(YouTubeOAuthService);

  public svgIcon = SvgIcons;
  public youtubeStatus: YouTubeConnectionStatus = { connected: false, error: null };
  public isConnecting = false;

  ngOnInit(): void {
    // Subscribe to YouTube connection status
    this.youtubeOAuthService.status$.subscribe(status => {
      this.youtubeStatus = status;
    });
  }

  /**
   * Initiate YouTube OAuth flow
   */
  async connectYouTube(): Promise<void> {
    try {
      this.isConnecting = true;
      await this.youtubeOAuthService.connectYouTube();
      // Will redirect to backend, then to Google, then back to frontend
    } catch (error) {
      console.error('Failed to initiate YouTube OAuth:', error);
      this.isConnecting = false;
      // Show error alert
    }
  }

  /**
   * Disconnect YouTube account
   */
  async disconnectYouTube(): Promise<void> {
    if (confirm('Are you sure you want to disconnect your YouTube account? Thank-you messages will stop working.')) {
      try {
        await this.youtubeOAuthService.disconnectYouTube();
        // Success handled by service updating status$
      } catch (error) {
        console.error('Failed to disconnect YouTube:', error);
        // Show error alert
      }
    }
  }
}
```

**Template**: `src/app/pages/content-creator/dashboard/settings/social/social.component.html`

```html
<div class="social-links-container">
  <h2>Social Connections</h2>

  <!-- YouTube Connection Card -->
  <div class="connection-card youtube-card">
    <div class="card-header">
      <img [src]="svgIcon.YouTube" alt="YouTube" class="platform-icon" />
      <div class="card-title">
        <h3>YouTube</h3>
        <p class="subtitle">Enable automatic thank-you messages on your videos</p>
      </div>
    </div>

    <div class="card-content">
      <!-- Not Connected State -->
      <div *ngIf="!youtubeStatus.connected" class="not-connected">
        <p class="description">
          Connect your YouTube account to automatically post thank-you comments
          when fans support you through videos and livestreams.
        </p>
        <button
          class="btn-connect"
          (click)="connectYouTube()"
          [disabled]="isConnecting">
          <span *ngIf="!isConnecting">Connect YouTube</span>
          <span *ngIf="isConnecting">Connecting...</span>
        </button>
      </div>

      <!-- Connected State -->
      <div *ngIf="youtubeStatus.connected" class="connected">
        <div class="status-badge">
          <span class="status-icon">✓</span>
          <span class="status-text">Connected</span>
        </div>
        <p class="connected-info">
          Your YouTube account is connected. Thank-you messages will be posted automatically.
        </p>
        <button class="btn-disconnect" (click)="disconnectYouTube()">
          Disconnect
        </button>
      </div>
    </div>
  </div>
</div>
```

---

#### 2.4 Add YouTube to Onboarding Integration Step

**File**: `src/app/pages/content-creator/onboarding/integration/integration.component.ts`

**Add after Telegram integration** (around line 300+):

```typescript
import { YouTubeOAuthService } from '../../../../services/youtube-oauth.service';

export class IntegrationComponent implements OnInit, OnDestroy {
  private readonly youtubeOAuthService = inject(YouTubeOAuthService);

  public youtubeConnectionStatus: YouTubeConnectionStatus = { connected: false, error: null };

  ngOnInit(): void {
    // Existing Telegram WebSocket initialization
    this.initializeWebSocket();

    // NEW: Subscribe to YouTube connection status
    this.youtubeOAuthService.status$.subscribe(status => {
      this.youtubeConnectionStatus = status;

      // If YouTube was just connected, show success message
      if (status.connected) {
        this.handleYouTubeConnected();
      }
    });
  }

  /**
   * Connect YouTube (similar to Telegram flow)
   */
  async connectYouTube(): Promise<void> {
    try {
      await this.youtubeOAuthService.connectYouTube();
      // Will redirect - user will come back with query params
    } catch (error) {
      console.error('YouTube connection failed:', error);
    }
  }

  /**
   * Handle successful YouTube connection
   */
  private handleYouTubeConnected(): void {
    // Could auto-advance to next step or just show success
    console.log('YouTube connected successfully in onboarding');
  }

  /**
   * Skip YouTube connection (optional step)
   */
  skipYouTube(): void {
    // Allow users to skip and connect later
    this.onboardingService.setCurrentStep(ONBOARDING_STEPS.FINISH);
  }
}
```

**Template Update**: `src/app/pages/content-creator/onboarding/integration/integration.component.html`

Add a new integration step (alongside Telegram):

```html
<!-- Step 3: YouTube Integration (Optional) -->
<div class="integration-step youtube-step" *ngIf="currentSubStep === 3">
  <h2>Connect Your YouTube Channel</h2>
  <p class="description">
    Enable automatic thank-you messages for fans who support you through
    video comments and livestream chat.
  </p>

  <div class="youtube-connect-container">
    <img src="assets/youtube-banner.svg" alt="YouTube" class="banner-image" />

    <button
      class="btn-primary connect-youtube"
      (click)="connectYouTube()"
      *ngIf="!youtubeConnectionStatus.connected">
      Connect YouTube Account
    </button>

    <div class="success-message" *ngIf="youtubeConnectionStatus.connected">
      <span class="checkmark">✓</span>
      <h3>YouTube Connected!</h3>
      <p>Thank-you messages will be posted automatically on your channel</p>
    </div>
  </div>

  <button class="btn-secondary skip" (click)="skipYouTube()">
    Skip for Now
  </button>
</div>
```

---

#### 2.5 Update Onboarding Service

**File**: `src/app/services/onboarding.service.ts`

**Add YouTube OAuth methods**:

```typescript
/**
 * Get YouTube connection status from backend
 */
getYouTubeConnectionStatus(): Observable<{ connected: boolean }> {
  return this.httpClient.get<{ connected: boolean }>(
    `${environment.API_BASE}/creator/youtube/status`
  );
}
```

**Note**: Backend would need to add this endpoint or return status in existing endpoints.

---

#### 2.6 Add YouTube to Settings Menu

**File**: `src/app/pages/content-creator/dashboard/settings/settings.component.ts`

**Update menu structure** (line ~30):

```typescript
tabMenu: MenuItem[] = [
  {
    label: 'PERSONAL SETTINGS',
    children: [
      { label: 'Account Settings', link: 'account' },
      { label: 'Social Links', link: 'social' },  // <-- YouTube is here
      { label: 'Notification', link: 'notification' }
    ]
  },
  // ... rest of menu
];
```

The "Social Links" route already exists, just needs the YouTube UI added (see 2.3).

---

#### 2.7 Environment Configuration

**Files**:
- `src/environments/environment.ts`
- `src/environments/environment.development.ts`
- `src/environments/environment.production.ts`

**No changes needed** - YouTube OAuth uses existing `API_BASE` URL.

The backend handles OAuth redirect URIs based on its own environment configuration.

---

#### 2.8 Add TypeScript Interfaces

**File**: `src/app/types/youtube.d.ts` (new file)

```typescript
export interface YouTubeConnectionStatus {
  connected: boolean;
  error?: 'denied' | 'failed' | null;
}

export interface YouTubeOAuthCallbackParams {
  youtube_connected?: 'true' | 'false';
  youtube_error?: 'denied' | 'failed';
}
```

---

### Phase 3: Deployment

#### 3.1 Google Cloud Console Setup

1. Navigate to: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/creator/youtube/callback`
     - `https://api.sponspay.io/creator/youtube/callback`
3. Copy Client ID and Client Secret
4. Enable YouTube Data API v3 in API Library

#### 3.2 Environment Variables

**Local (.env)**:
```bash
GOOGLE_OAUTH_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xyz123
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/creator/youtube/callback
FRONTEND_URL=http://localhost:4200
```

**Production (Kubernetes)**:
```bash
# Create secret
kubectl create secret generic google-oauth \
  --from-literal=client-id='123456789-abc.apps.googleusercontent.com' \
  --from-literal=client-secret='GOCSPX-xyz123' \
  -n sponspay-api-dev

# Update deployment.yaml
env:
  - name: GOOGLE_OAUTH_CLIENT_ID
    valueFrom:
      secretKeyRef:
        name: google-oauth
        key: client-id
  - name: GOOGLE_OAUTH_CLIENT_SECRET
    valueFrom:
      secretKeyRef:
        name: google-oauth
        key: client-secret
  - name: GOOGLE_OAUTH_REDIRECT_URI
    value: "https://api.sponspay.io/creator/youtube/callback"
  - name: FRONTEND_URL
    value: "https://app.sponspay.io"
```

---

## Verification Plan

### Backend Testing

1. **OAuth Initiation**:
   ```bash
   # With Firebase token
   curl -H "Authorization: Bearer $FIREBASE_TOKEN" \
     http://localhost:3000/creator/youtube/connect

   # Should redirect to Google OAuth consent screen
   ```

2. **Callback Handling** (manual test):
   - Grant permissions in browser
   - Observe redirect back to frontend
   - Check database: `SELECT * FROM youtube_oauth_tokens WHERE userId = '...'`
   - Verify encrypted format: `{iv}:{authTag}:{ciphertext}`

3. **Token Usage**:
   - Make a payment with YouTube URL
   - Check logs: "Posted YouTube Video message for transaction {id}"
   - Verify comment appears on YouTube video

4. **Disconnect**:
   ```bash
   curl -X DELETE -H "Authorization: Bearer $FIREBASE_TOKEN" \
     http://localhost:3000/creator/youtube/disconnect

   # Verify token deleted from database
   ```

### Frontend Testing

1. **OAuth Initiation**:
   - Click "Connect YouTube" button in Settings
   - Verify redirect to Google consent screen
   - Check that return URL is stored in sessionStorage

2. **OAuth Callback**:
   - Grant permissions in Google
   - Verify redirect back to frontend with query params
   - Check that success alert is shown
   - Verify connection status updates to "Connected"

3. **Disconnect Flow**:
   - Click "Disconnect" button
   - Confirm dialog appears
   - Verify backend DELETE request sent
   - Check connection status updates to "Not Connected"

4. **Error Handling**:
   - Deny permissions in Google → Check "denied" alert shown
   - Simulate backend failure → Check "failed" alert shown
   - Test without authentication → Check error handling

5. **UI States**:
   - Not connected state shows "Connect" button
   - Connected state shows "Connected" badge and "Disconnect" button
   - Loading state shows "Connecting..." during redirect

---

### Security Checks

- ✓ State parameter validated (no CSRF attacks)
- ✓ State expires after 10 minutes (prevents replay attacks)
- ✓ Refresh token encrypted at rest (AES-256-GCM)
- ✓ Refresh token never logged or exposed to frontend
- ✓ Redirect URI matches registered URI in Google Console
- ✓ HTTPS enforced in production
- ✓ Firebase ID token required to initiate OAuth
- ✓ Authorization header validated on disconnect endpoint

---

## Critical Files Summary

### Backend Files

**New Files**:
- `src/youtube-oauth/youtube-oauth.module.ts` - YouTube OAuth module
- `src/youtube-oauth/youtube-oauth.service.ts` - OAuth flow service (token exchange)
- `src/youtube-oauth/youtube-oauth.controller.ts` - OAuth endpoints (connect, callback, disconnect)

**Modified Files**:
- `src/app.module.ts` - Import YouTubeOAuthModule
- `.env` - Add Google OAuth credentials
- `docker-compose.yaml` - Pass OAuth env vars
- `k8s/base/deployment.yaml` - Add OAuth environment variables
- `k8s/base/secrets.yaml` - Create Google OAuth secret

### Frontend Files (../WebApp)

**New Files**:
- `src/app/services/youtube-oauth.service.ts` - YouTube OAuth service (connect, disconnect, status)
- `src/app/types/youtube.d.ts` - YouTube TypeScript interfaces

**Modified Files**:
- `src/app/app.component.ts` - Add OAuth callback handler in ngOnInit()
- `src/app/pages/content-creator/dashboard/settings/social/social.component.ts` - Add YouTube connection UI logic
- `src/app/pages/content-creator/dashboard/settings/social/social.component.html` - Add YouTube connection template
- `src/app/pages/content-creator/onboarding/integration/integration.component.ts` - Add YouTube step to onboarding
- `src/app/pages/content-creator/onboarding/integration/integration.component.html` - Add YouTube onboarding template
- `src/app/services/onboarding.service.ts` - Add getYouTubeConnectionStatus() method

---

## Success Criteria

### Backend Success Criteria

1. ✅ `GET /creator/youtube/connect` redirects to Google OAuth
2. ✅ `GET /creator/youtube/callback` exchanges code for refresh token
3. ✅ Refresh token stored encrypted in database (AES-256-GCM format)
4. ✅ `DELETE /creator/youtube/disconnect` removes token from database
5. ✅ State parameter validated (CSRF protection)
6. ✅ State expires after 10 minutes (replay attack prevention)
7. ✅ YouTube messages sent using stored refresh token
8. ✅ Access tokens cached in Redis (50-minute TTL)
9. ✅ Graceful handling of missing tokens (no payment failures)
10. ✅ Works in local, dev, and production environments

### Frontend Success Criteria

1. ✅ "Connect YouTube" button in Settings > Social Links
2. ✅ (Optional) "Connect YouTube" step in onboarding flow
3. ✅ Clicking button redirects to backend OAuth endpoint
4. ✅ User redirected to Google consent screen
5. ✅ After granting permissions, user redirected back to frontend
6. ✅ Success alert shown: "YouTube Connected"
7. ✅ Connection status updates to "Connected" with checkmark
8. ✅ "Disconnect" button functional and shows confirmation
9. ✅ Error handling for denials and failures
10. ✅ Works in local, dev, and production environments

### End-to-End Success Criteria

1. ✅ Creator connects YouTube during onboarding or in settings
2. ✅ Fan makes payment with YouTube video URL
3. ✅ Thank-you comment appears on YouTube video
4. ✅ Transaction updated with `youtubeCommentId` and `youtubeMessagePostedAt`
5. ✅ Payment succeeds even if YouTube API fails (graceful degradation)
6. ✅ Creator can disconnect YouTube and messages stop
7. ✅ No refresh tokens leaked in logs or client-side code
8. ✅ OAuth flow works across all browsers (Chrome, Firefox, Safari, Edge)

---

## Quick Reference Commands

### Backend

```bash
# Local development
docker-compose restart api
docker-compose logs -f api

# Check database for tokens
docker exec -it api-db-1 psql -U filip -d dev -c "SELECT id, userId, LEFT(encryptedRefreshToken, 50) FROM youtube_oauth_tokens;"

# Kubernetes dev
kubectl get pods -n sponspay-api-dev
kubectl logs -f deployment/sponspay-api -n sponspay-api-dev
kubectl describe secret google-oauth -n sponspay-api-dev

# Kubernetes prod
kubectl get pods -n sponspay-api-prod
kubectl logs -f deployment/sponspay-api -n sponspay-api-prod
```

### Frontend

```bash
# Local development
cd WebApp
ng serve --open

# Build for dev
ng build --configuration=development

# Build for production
ng build --configuration=production --optimization

# Check bundle size
ng build --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

### Testing OAuth Flow

```bash
# Test OAuth initiation (requires Firebase token)
curl -H "Authorization: Bearer $FIREBASE_TOKEN" \
  http://localhost:3000/creator/youtube/connect

# Test disconnect (requires Firebase token)
curl -X DELETE \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  http://localhost:3000/creator/youtube/disconnect

# Check YouTube connection status (backend would need this endpoint)
curl -H "Authorization: Bearer $FIREBASE_TOKEN" \
  http://localhost:3000/creator/youtube/status
```

### Debugging

```bash
# Backend logs with grep
kubectl logs -f deployment/sponspay-api -n sponspay-api-dev | grep -i youtube

# Check environment variables
kubectl exec -it deployment/sponspay-api -n sponspay-api-dev -- env | grep GOOGLE_OAUTH

# Frontend console debugging
# In browser console:
localStorage.getItem('youtube_access_token')
sessionStorage.getItem('youtube_oauth_return_url')
```

---

## Additional Resources

### Documentation Links
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [Angular Routing](https://angular.io/guide/router)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

### Related Implementation Docs
- `docs/integrations/youtube-frontend-integration.md` - Original frontend integration guide
- `docs/integrations/youtube-thank-you-messages-plan.md` - Original implementation plan
- `docs/integrations/youtube-frontend-quick-reference.md` - Quick reference for frontend devs

### Backend Source Code
- `src/youtube-message/` - YouTube message service (already implemented)
- `src/youtube-oauth/` - YouTube OAuth flow (to be implemented)
- `src/creator/` - Creator management
- `src/pawapay/` - Payment webhook integration

---

## Implementation Timeline

### Backend Work (1-2 days)

**Day 1 Morning**:
- Set up Google Cloud Console OAuth credentials
- Create environment variables (local, Docker, Kubernetes)
- Create `YouTubeOAuthService` with token exchange logic

**Day 1 Afternoon**:
- Create `YouTubeOAuthController` with 3 endpoints (connect, callback, disconnect)
- Create `YouTubeOAuthModule` and import in AppModule
- Test OAuth flow locally with curl/browser

**Day 2 Morning**:
- Deploy to dev environment
- Test end-to-end OAuth flow in dev
- Verify token encryption and storage

**Day 2 Afternoon**:
- Deploy to production
- Document frontend integration points
- Coordinate with frontend team

---

### Frontend Work (1-2 days)

**Day 1 Morning**:
- Create `YouTubeOAuthService` in WebApp
- Update `AppComponent` with OAuth callback handler
- Add TypeScript interfaces

**Day 1 Afternoon**:
- Update Settings > Social Links component with YouTube UI
- Add connect/disconnect buttons
- Implement connection status display

**Day 2 Morning**:
- Add YouTube step to onboarding flow (optional)
- Style YouTube connection cards/buttons
- Test OAuth flow end-to-end

**Day 2 Afternoon**:
- Handle edge cases (denials, errors, cancellations)
- Add loading states and animations
- Test in dev and production environments

---

**Total Implementation**: 2-4 days

- **Backend Only**: 1-2 days
- **Frontend Only**: 1-2 days
- **Backend + Frontend (Parallel)**: 2-3 days
- **Backend + Frontend (Sequential)**: 3-4 days

---

## Complete Deployment Checklist

### Pre-Deployment (Google Cloud Console)

- [ ] Create OAuth 2.0 Client ID in Google Cloud Console
- [ ] Add authorized redirect URIs:
  - `http://localhost:3000/creator/youtube/callback` (local dev)
  - `https://api-dev.sponspay.com/creator/youtube/callback` (dev)
  - `https://api.sponspay.io/creator/youtube/callback` (production)
- [ ] Enable YouTube Data API v3
- [ ] Copy Client ID and Client Secret
- [ ] Test OAuth consent screen configuration

### Backend Deployment

**Local Environment**:
- [ ] Add credentials to `.env`
- [ ] Add `FRONTEND_URL=http://localhost:4200` to `.env`
- [ ] Restart Docker Compose: `docker-compose restart api`
- [ ] Test OAuth flow with curl/browser

**Development Environment**:
- [ ] Create Kubernetes secret:
  ```bash
  kubectl create secret generic google-oauth \
    --from-literal=client-id='...' \
    --from-literal=client-secret='...' \
    -n sponspay-api-dev
  ```
- [ ] Update `k8s/base/deployment.yaml` with environment variables
- [ ] Apply Kubernetes manifests: `kubectl apply -k k8s/overlays/dev`
- [ ] Check pod logs: `kubectl logs -f deployment/sponspay-api -n sponspay-api-dev`
- [ ] Test OAuth endpoints: `/creator/youtube/connect`

**Production Environment**:
- [ ] Create production Kubernetes secret (same as dev)
- [ ] Update production deployment.yaml with prod URLs
- [ ] Apply Kubernetes manifests: `kubectl apply -k k8s/overlays/prod`
- [ ] Verify pods are running: `kubectl get pods -n sponspay-api-prod`
- [ ] Test OAuth flow end-to-end in production

### Frontend Deployment

**Local Environment**:
- [ ] Verify `API_BASE=http://localhost:3000` in `environment.ts`
- [ ] Run frontend: `ng serve` or `npm start`
- [ ] Test OAuth flow locally

**Development Environment**:
- [ ] Build frontend: `ng build --configuration=development`
- [ ] Deploy to dev hosting (Firebase/Netlify/Vercel/S3)
- [ ] Verify `API_BASE` points to dev backend
- [ ] Test OAuth flow in dev environment

**Production Environment**:
- [ ] Build frontend: `ng build --configuration=production`
- [ ] Deploy to production hosting
- [ ] Verify `API_BASE` points to production backend
- [ ] Test OAuth flow in production
- [ ] Monitor error logs for OAuth failures

---

## Troubleshooting Guide

### Issue: "No refresh token received from Google OAuth"

**Symptoms**: Backend logs show "No refresh token received"

**Causes**:
1. User previously granted permissions (Google won't return refresh token on re-auth)
2. Missing `access_type: 'offline'` parameter
3. Missing `prompt: 'consent'` parameter

**Solutions**:
1. Revoke app access in Google Account settings and re-authenticate
2. Verify OAuth2Client config has `access_type: 'offline'`
3. Verify `prompt: 'consent'` is set (forces consent screen)
4. Check Google Console OAuth consent screen is configured correctly

---

### Issue: "State expired" error

**Symptoms**: Backend returns 400 "State expired"

**Causes**:
1. User took >10 minutes to complete OAuth flow
2. Clock skew between server and client

**Solutions**:
1. Increase state expiration time (currently 10 minutes)
2. Sync server clocks (NTP)
3. User should retry OAuth flow immediately

---

### Issue: Redirect loop or "Invalid redirect URI"

**Symptoms**: OAuth fails with redirect URI mismatch

**Causes**:
1. Redirect URI in code doesn't match Google Console configuration
2. HTTP vs HTTPS mismatch
3. Trailing slash mismatch

**Solutions**:
1. Verify exact match in Google Console:
   - `https://api.sponspay.io/creator/youtube/callback` (no trailing slash)
2. Check environment variable: `GOOGLE_OAUTH_REDIRECT_URI`
3. Ensure HTTPS in production (not HTTP)

---

### Issue: Frontend doesn't detect OAuth callback

**Symptoms**: User redirects back but no alert shown

**Causes**:
1. Query params not being read correctly
2. `AppComponent` not subscribed to route params
3. `YouTubeOAuthService` not imported

**Solutions**:
1. Check `ActivatedRoute.queryParams` subscription in `AppComponent`
2. Verify query params in URL: `?youtube_connected=true`
3. Check browser console for errors
4. Verify `YouTubeOAuthService` is provided in root

---

### Issue: "User must be authenticated to connect YouTube"

**Symptoms**: Error when clicking "Connect YouTube"

**Causes**:
1. Firebase token expired or missing
2. User not logged in
3. Token refresh failed

**Solutions**:
1. Force Firebase token refresh: `user.getIdToken(true)`
2. Ensure user is authenticated before showing button
3. Check `AuthGuard` is protecting the route

---

### Issue: CORS errors on OAuth callback

**Symptoms**: CORS errors in browser console

**Causes**:
1. Backend CORS configuration doesn't allow frontend origin
2. OPTIONS preflight request failing

**Solutions**:
1. This shouldn't happen - OAuth uses redirects, not XHR
2. If it does, check NestJS CORS config in `main.ts`:
   ```typescript
   app.enableCors({
     origin: [process.env.FRONTEND_URL],
     credentials: true
   });
   ```

---

### Issue: YouTube messages not being sent

**Symptoms**: OAuth works but no messages appear on YouTube

**Causes**:
1. Payment doesn't include `youtubeVideoId`
2. Creator's YouTube token not found in database
3. YouTube API quota exceeded
4. Video has comments disabled

**Solutions**:
1. Verify frontend sends `youtubeUrl` in payment request
2. Check database: `SELECT * FROM youtube_oauth_tokens WHERE userId='...'`
3. Check Google Cloud Console quota usage
4. Check backend logs for YouTube API errors
5. Test with a video that allows comments

---

## Monitoring & Observability

### Backend Metrics to Track

1. **OAuth Success Rate**:
   - Total OAuth initiations vs successful token storage
   - Track failed token exchanges

2. **Token Refresh Rate**:
   - How often access tokens are refreshed
   - Failed refresh attempts (indicates revoked tokens)

3. **YouTube Message Success Rate**:
   - Messages sent vs messages failed
   - Error categories (disabled comments, quota, etc.)

### Frontend Metrics to Track

1. **OAuth Completion Rate**:
   - Users who click "Connect" vs users who complete OAuth
   - Denial rate vs success rate

2. **Connection Stability**:
   - How many users disconnect YouTube
   - Re-connection attempts

### Logging

**Backend**:
```typescript
this.logger.log(`YouTube OAuth initiated for user ${userId}`);
this.logger.log(`YouTube refresh token stored for user ${userId}`);
this.logger.error(`OAuth token exchange failed: ${error.message}`);
this.logger.warn(`No refresh token received for user ${userId}`);
```

**Frontend**:
```typescript
console.log('[YouTubeOAuth] Initiating OAuth flow');
console.log('[YouTubeOAuth] Callback received:', params);
console.error('[YouTubeOAuth] Connection failed:', error);
```

### Alert Thresholds

- **Critical**: >50% OAuth failures in 1 hour
- **Warning**: >20% message send failures in 1 hour
- **Info**: New YouTube connection established
