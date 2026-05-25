import { Injectable, effect, inject, signal } from '@angular/core';
import { Auth, User, GoogleAuthProvider, authState, signInWithPopup } from '@angular/fire/auth';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { NavigationEnd, Router } from '@angular/router';
import { SessionStorageService } from '@services/session-storage.service';
import { OnboardingService } from '@services/onboarding.service';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';
import { LoadingStateService } from '@services/loading-state.service';
import { CreatorSignInBody, CreatorSignInResponse } from '@app-types/onboarding';
import { CUSTOM_REQUEST_CONTEXT } from '../auth/interceptor/http-context.tokens';
import { DashboardService } from '@services/dashboard.service';
import { TokenService } from '@services/token.service';
import { ZohoPageSenseService } from '@services/zoho-pagesense.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private httpClient: HttpClient = inject(HttpClient);
  private sessionStorageService = inject(SessionStorageService);
  private youtubeOAuthService = inject(YouTubeOAuthService);
  private onboardingService = inject(OnboardingService);
  private loadingStateService = inject(LoadingStateService);
  private router = inject(Router);
  private dashboardService = inject(DashboardService);
  private tokenService = inject(TokenService);
  private zohoPageSenseService = inject(ZohoPageSenseService);

  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  private creatorSignInSubject = new BehaviorSubject<CreatorSignInResponse | null>(null);

  // Use Angular Fire's authState observable directly
  public user$ = authState(this.auth);
  public accessToken$ = this.accessTokenSubject.asObservable();
  public creatorSignInResponse$ = this.creatorSignInSubject.asObservable();

  public triggerGoogleAuth = signal(false);

  private signingIn = false;
  private restoringSession = false;

  private lastRoute: string | null = null;

  constructor() {
    // Watch for programmatic Google Auth triggers (e.g. from emitGoogleAuthTrigger)
    effect(() => {
      if (this.triggerGoogleAuth()) {
        this.initiateAuthentication();
      }
    });



    // avoid fan page to restore session.
    if (!location.pathname.startsWith('/fan/')) {
      // Restore session from stored tokens.
      this.restoreSession();
    }

    // Cypress e2e test bypass: inject auth state without real Google login
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cypressBypass = (window as Record<string, any>)['__CYPRESS_AUTH_BYPASS__'];
    if (cypressBypass) {
      const bypass = cypressBypass;
      this.accessTokenSubject.next(bypass.accessToken || 'mock-token');
      this.creatorSignInSubject.next(bypass.signInResponse);
      // Set a valid JWT test token so authGuard and headerTokenInterceptor don't redirect
      this.tokenService.setTestToken(bypass.accessToken || 'mock-token');
      // Store in localStorage so ensureValidToken() / getStoredToken() works
      this.storeToken(bypass.accessToken || 'mock-token');
      if (!bypass.skipNavigation) {
        this.onboardingService.propagateUser(bypass.signInResponse);
      }

      // If YouTube is connected, populate channel data so the Estimator step can load
      if (bypass.signInResponse?.youtubeConnected) {
        this.youtubeOAuthService.setConnectionStatus({ connected: true, error: null });
        this.youtubeOAuthService.fetchAndSetChannelData();
      }
    }

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.lastRoute = event.urlAfterRedirects;
      }
    });

  }


  async getCurrentUser(): Promise<User | null> {
    return firstValueFrom(this.user$);
  }

  getCurrentAccessToken(): string | null {
    return this.accessTokenSubject.value;
  }

  async processAuthResult(accessToken: string, signInContext?: string): Promise<boolean> {
    this.accessTokenSubject.next(accessToken);
    this.storeToken(accessToken);

    await this.registerWithBackend(signInContext).catch((error: unknown) => {
      console.error('Failed to sign in:', error);
    });

    const signInResponse = this.creatorSignInSubject.value;
    if (signInResponse?.youtubeConnected) {
      await this.youtubeOAuthService.fetchAndSetChannelData();
    } else {
      this.youtubeOAuthService.setChannelStatus('not_found');
    }

    return true;
  }

  // Token persistence methods

  /**
   * Store access token in localStorage with expiration
   * @param accessToken The access token to store
   * @param expiresIn Token expiration time in seconds (default 1 hour)
   */
  storeToken(accessToken: string, expiresIn = 3600): void {
    const expirationTime = Date.now() + (expiresIn * 1000);

    this.sessionStorageService.setLocalItem('youtube_access_token', accessToken);
    this.sessionStorageService.setLocalItem('youtube_token_expires', expirationTime.toString());
  }

  emitGoogleAuthTrigger() {
    this.triggerGoogleAuth.set(true);
    setTimeout(() => this.triggerGoogleAuth.set(false), 0);
  }

  getStoredToken(): string | null {
    const token = this.sessionStorageService.getLocalItem('youtube_access_token');
    const expires = this.sessionStorageService.getLocalItem('youtube_token_expires');

    if (!token || !expires) {
      return null;
    }

    if (Date.now() > parseInt(expires)) {
      // Token expired, clean up
      console.log('Stored token expired, cleaning up');
      this.clearStoredToken();
      return null;
    }

    console.log('Retrieved valid stored token');
    return token;
  }

  /**
   * Clear stored token from localStorage
   */
  clearStoredToken(): void {
    this.sessionStorageService.removeLocalItem('youtube_access_token');
    this.sessionStorageService.removeLocalItem('youtube_token_expires');
  }

  /**
   * Restore session from stored tokens on app initialization
   */
  private async restoreSession(): Promise<void> {
    try {
      this.restoringSession = true;
      const currentUser = await firstValueFrom(this.user$);

      if (currentUser) {
        const storedToken = this.getStoredToken();

        if (storedToken) {
          console.log('Restoring session with stored token for user:', currentUser.email);
          await this.processAuthResult(storedToken, 'session_restore');
        } else {
          console.log('User authenticated but no valid stored token found');
        }
      }
      this.restoringSession = false;
    } catch (error) {
      this.restoringSession = false;
      console.error('Error restoring session:', error);
    }
  }

  /**
   * Attempt to refresh the access token silently using Firebase ID token
   * @param user The current Firebase user
   * @returns Promise<string | null> New access token or null if failed
   */
  async silentTokenRefresh(user: User): Promise<string | null> {
    try {
      console.log('Attempting silent token refresh for user:', user.email);

      const provider = new GoogleAuthProvider();
      const customParams: { prompt: string; login_hint?: string } = {
        prompt: 'none' // Silent authentication - no user interaction
      };
      if (user.email) {
        customParams.login_hint = user.email;
      }
      provider.setCustomParameters(customParams);

      const result = await signInWithPopup(this.auth, provider);

      if (result?.user) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          console.log('Silent token refresh successful');
          return credential.accessToken;
        }
      }

      console.warn('Silent refresh completed but no access token received');
      return null;
    } catch (error: unknown) {
      // Silent auth can fail for various reasons (user interaction required, etc.)
      // This is normal and we fall back to re-authentication
      console.log('Silent authentication failed:', (error as { code: string }).code);
      return null;
    }
  }

  /**
   * Ensures a valid access token is available, refreshing if necessary
   * @returns Promise<string | null> Valid access token or null if authentication required
   */
  async ensureValidToken(): Promise<string | null> {
    try {
      // Check if current stored token is valid
      const currentToken = this.getStoredToken();
      if (currentToken) {
        console.log('Using valid stored token');
        return currentToken;
      }

      console.log('No valid stored token found, attempting refresh...');

      // No valid token - try to refresh silently
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        console.log('No authenticated user found');
        return null;
      }

      // Attempt silent token refresh
      const refreshedToken = await this.silentTokenRefresh(currentUser);
      if (refreshedToken) {
        console.log('Token refreshed successfully');
        // Store the new token with fresh expiration
        this.storeToken(refreshedToken);
        // Update the current access token in memory
        this.accessTokenSubject.next(refreshedToken);
        return refreshedToken;
      }

      console.log('Silent token refresh failed, re-authentication required');
      return null;

    } catch (error) {
      console.error('Error ensuring valid token:', error);
      return null;
    }
  }

  /**
   * Sign out the user and clear all stored data
   */
  async signOut(options?: { skipNavigation?: boolean }): Promise<void> {
    try {
      // Clear stored tokens
      this.clearStoredToken();

      // Clear in-memory state
      this.creatorSignInSubject.next(null);
      this.accessTokenSubject.next(null);
      this.signingIn = false;

      this.lastRoute = null;

      // Clear all service state to prevent data leaking between accounts
      this.youtubeOAuthService.resetChannelState();
      this.youtubeOAuthService.setConnectionStatus({ connected: false, error: null });
      this.onboardingService.resetOnboarding();
      this.dashboardService.reset();
      this.loadingStateService.clear();
      this.tokenService.clearToken();
      this.zohoPageSenseService.resetIdentity();

      // Sign out from Firebase
      await this.auth.signOut();

      if (!options?.skipNavigation) {
        this.router.navigate(['/']);
      }

      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Registers the authenticated user with the backend API.
   * Creates/updates user record and returns onboarding status.
   */
  private async registerWithBackend(signInContext?: string): Promise<void> {
    try {
      if (!this.signingIn) {
        this.signingIn = true;

        const currentUser = await this.getCurrentUser();
        if (!currentUser) {
          this.signingIn = false;
          console.warn('No current user found, skipping sign-in');
          return;
        }

        const signInData: CreatorSignInBody = {
          displayName: currentUser.displayName || '',
          email: currentUser.email || '',
          firebaseUid: currentUser.uid,
          profilePictureUrl: currentUser.photoURL || undefined,
          locale: navigator.language || undefined,
          signInContext
        };

        const headerMap: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (environment.API_KEY) {
          headerMap['api-key'] = environment.API_KEY;
        }
        const headers = new HttpHeaders(headerMap);
        const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
          showLoader: true,
          skipAlert: true
        });

        const response = await firstValueFrom(
          this.httpClient.post<CreatorSignInResponse>(
            `${environment.API_BASE}/creator/sign-in`,
            signInData,
            { headers, context }
          )
        );
        this.signingIn = false;

        this.creatorSignInSubject.next(response);

        if (!this.restoringSession || this.lastRoute === '/onboarding') {
          this.onboardingService.propagateUser(response ?? null);
        }
        this.restoringSession = false;

        console.log('Sign-in completed successfully:', response);
      }
    } catch (error: unknown) {
      this.signingIn = false;
      console.error('Failed to sign in:', error);
    }
  }

  getSignInResponse(): CreatorSignInResponse | null {
    return this.creatorSignInSubject.value;
  }

  // ── Auth Flow Methods ──

  async onLoginClick(signInContext?: string): Promise<void> {
    this.loadingStateService.setLoading(true);

    try {
      await this.initiateSignIn(signInContext);
    } catch (error: unknown) {
      console.error('Sign-in flow failed:', error);

      // Set a fallback error if initiateAuthentication didn't already set one
      if (!this.loadingStateService.getCurrentError()) {
        this.loadingStateService.setError('Authentication failed. Please try again.');
      }
    }
  }

  /**
   * Initiates the complete sign-in flow.
   * Checks for existing auth/tokens, refreshes if needed, or starts interactive login.
   */
  async initiateSignIn(signInContext?: string): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();

      if (currentUser) {
        console.log('User already authenticated:', currentUser.email);

        const storedToken = this.getStoredToken();

        if (storedToken) {
          console.log('Using valid stored token');
          await this.completeAuthentication(storedToken, signInContext);
          return;
        }

        console.log('No stored token found, ensuring valid token...');
        const validToken = await this.ensureValidToken();

        if (validToken) {
          console.log('Valid token obtained, completing authentication');
          await this.completeAuthentication(validToken, signInContext);
          return;
        } else {
          console.log('Token validation/refresh failed, proceeding with re-authentication...');
        }
      }

      await this.initiateAuthentication(signInContext);

    } catch (error: unknown) {
      console.error('Sign-in flow failed:', error);

      if ((error as { code: string }).code === 'auth/popup-closed-by-user') {
        console.log('Google Sign-In popup was closed by user.');
        this.loadingStateService.clear();
      } else if ((error as { code: string }).code === 'auth/cancelled-popup-request') {
        console.log('Google Sign-In was cancelled.');
        this.loadingStateService.clear();
      } else {
        throw error;
      }
    }
  }

  /**
   * Handles authentication via Google popup
   */
  private async initiateAuthentication(signInContext?: string): Promise<void> {
    console.log('Initiating authentication flow for user...');

    const provider = this.createLoginAuthProvider();

    try {
      const result = await signInWithPopup(this.auth, provider);

      if (result.user) {
        console.log('Popup authentication successful:', result.user.email);

        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          await this.completeAuthentication(credential.accessToken, signInContext);
        } else {
          throw new Error('No access token received from popup authentication');
        }
      } else {
        throw new Error('No user received from popup authentication');
      }
    } catch (error: unknown) {
      console.error('Popup authentication failed:', error);

      const code = (error as { code: string }).code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User cancelled intentionally — no error to display
      } else if (code === 'auth/popup-blocked') {
        this.loadingStateService.setError('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      } else if (code === 'auth/network-request-failed') {
        this.loadingStateService.setError('Network error. Please check your connection and try again.');
      } else {
        this.loadingStateService.setError('Authentication failed. Please try again.');
      }

      throw error;
    }
  }

  /**
   * Creates Google Auth Provider for interactive login (forces account selection)
   */
  private createLoginAuthProvider(): GoogleAuthProvider {
    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: 'select_account'
    });

    return provider;
  }

  private async completeAuthentication(accessToken: string | null, signInContext?: string) {
    if (accessToken) {
      await this.processAuthResult(accessToken, signInContext);
    }

    this.loadingStateService.clear();
  }
}
