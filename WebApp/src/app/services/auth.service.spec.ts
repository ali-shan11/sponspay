import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Auth } from '@angular/fire/auth';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { AuthService } from './auth.service';
import { YouTubeOAuthService } from './youtube-oauth.service';
import { OnboardingService } from './onboarding.service';
import { SessionStorageService } from './session-storage.service';
import { LoadingStateService } from './loading-state.service';
import { DashboardService } from './dashboard.service';
import { TokenService } from './token.service';
import { environment } from '../../environments/environment';

// Import Phase 1 testing utilities
import {
  MockFirebaseAuth,
  createMockFirebaseAuth,
  createMockUser,
} from '../../testing/mocks/firebase-auth.mock';

describe('AuthService', () => {
  let service: AuthService;
  let mockFirebaseAuth: MockFirebaseAuth;
  let httpMock: HttpTestingController;
  let mockSessionStorage: jasmine.SpyObj<SessionStorageService>;
  let mockYouTubeOAuthService: jasmine.SpyObj<YouTubeOAuthService>;
  let mockOnboardingService: jasmine.SpyObj<OnboardingService>;
  let mockLoadingStateService: jasmine.SpyObj<LoadingStateService>;
  let mockDashboardService: jasmine.SpyObj<DashboardService>;
  let mockTokenService: jasmine.SpyObj<TokenService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let routerEventsSubject: Subject<any>;

  // Test data fixtures
  const mockUser = createMockUser({
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    emailVerified: true
  });

  const mockSignInResponse = {
    success: true,
    message: 'Sign-in successful',
    userId: 'user-123',
    isCreator: true,
    isCoAdmin: true,
    hasAcceptedTerms: true,
    youtubeConnected: true
  };

  beforeEach(() => {
    // Create Firebase Auth mock
    mockFirebaseAuth = createMockFirebaseAuth();

    // Router events subject for testing NavigationEnd handling
    routerEventsSubject = new Subject<any>();

    // Create SessionStorage mock
    const sessionStorageSpy = jasmine.createSpyObj('SessionStorageService', [
      'setLocalItem',
      'getLocalItem',
      'removeLocalItem',
      'setBooleanItem',
      'getBooleanItem',
      'removeItem',
      'setItem',
      'getItem'
    ]);

    // Create LoadingStateService mock
    const loadingStateServiceSpy = jasmine.createSpyObj('LoadingStateService', [
      'setLoading',
      'setError',
      'clear',
      'getCurrentError',
      'isLoading'
    ]);

    // Create YouTubeOAuthService mock
    const youtubeOAuthServiceSpy = jasmine.createSpyObj('YouTubeOAuthService', [
      'fetchAndSetChannelData',
      'setChannelStatus',
      'resetChannelState',
      'getCurrentChannelStatus',
      'setConnectionStatus'
    ]);
    youtubeOAuthServiceSpy.fetchAndSetChannelData.and.returnValue(Promise.resolve());

    // Create OnboardingService mock
    const onboardingServiceSpy = jasmine.createSpyObj('OnboardingService', [
      'propagateUser',
      'resetOnboarding'
    ]);

    // Create DashboardService mock with spied BehaviorSubject-like objects
    const dashboardServiceSpy = {
      selectedDaysObservable: { next: jasmine.createSpy('selectedDaysObservable.next') },
      selectedChannelObservable: { next: jasmine.createSpy('selectedChannelObservable.next') },
      reset: jasmine.createSpy('reset'),
    };

    // Create TokenService mock
    const tokenServiceSpy = jasmine.createSpyObj('TokenService', ['clearToken']);

    // Create Router mock
    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      events: routerEventsSubject.asObservable(),
      url: '/'
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Auth, useValue: mockFirebaseAuth },
        { provide: SessionStorageService, useValue: sessionStorageSpy },
        { provide: YouTubeOAuthService, useValue: youtubeOAuthServiceSpy },
        { provide: OnboardingService, useValue: onboardingServiceSpy },
        { provide: LoadingStateService, useValue: loadingStateServiceSpy },
        { provide: DashboardService, useValue: dashboardServiceSpy },
        { provide: TokenService, useValue: tokenServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    mockSessionStorage = TestBed.inject(SessionStorageService) as jasmine.SpyObj<SessionStorageService>;
    mockYouTubeOAuthService = TestBed.inject(YouTubeOAuthService) as jasmine.SpyObj<YouTubeOAuthService>;
    mockOnboardingService = TestBed.inject(OnboardingService) as jasmine.SpyObj<OnboardingService>;
    mockLoadingStateService = TestBed.inject(LoadingStateService) as jasmine.SpyObj<LoadingStateService>;
    mockDashboardService = TestBed.inject(DashboardService) as jasmine.SpyObj<DashboardService>;
    mockTokenService = TestBed.inject(TokenService) as jasmine.SpyObj<TokenService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Reset mocks
    mockFirebaseAuth.resetMock();
    mockSessionStorage.setLocalItem.calls.reset();
    mockSessionStorage.getLocalItem.calls.reset();
    mockSessionStorage.removeLocalItem.calls.reset();
    mockYouTubeOAuthService.fetchAndSetChannelData.calls.reset();
    mockYouTubeOAuthService.setChannelStatus.calls.reset();
    mockYouTubeOAuthService.resetChannelState.calls.reset();
    mockOnboardingService.propagateUser.calls.reset();

    // Reset private flags that may be set from constructor or prior test leakage
    service['signingIn'] = false;
    service['restoringSession'] = false;
  });

  afterEach(() => {
    httpMock.verify();
  });

  // Helper: flush the registerWithBackend HTTP call and return the response
  function flushSignInRequest(response: any = mockSignInResponse): void {
    const req = httpMock.expectOne(`${environment.API_BASE}/creator/sign-in`);
    expect(req.request.method).toBe('POST');
    req.flush(response);
  }

  // Helper: call processAuthResult, wait for microtasks, flush HTTP, then await completion
  async function callProcessAuthResultAndFlush(
    token: string,
    response: any = mockSignInResponse,
    signInContext?: string
  ): Promise<boolean> {
    const promise = service.processAuthResult(token, signInContext);
    // Allow microtasks to resolve (firstValueFrom in getCurrentUser)
    await new Promise(resolve => setTimeout(resolve, 0));
    flushSignInRequest(response);
    return promise;
  }

  describe('Service Initialization & Firebase Integration', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default state', () => {
      expect(service.getCurrentAccessToken()).toBeNull();
    });

    it('should restore session from stored tokens', async () => {
      const testToken = 'stored-test-token';
      const futureExpiry = (Date.now() + 3600000).toString();

      mockFirebaseAuth.setMockUser(mockUser);
      mockSessionStorage.getLocalItem.and.callFake((key: string) => {
        if (key === 'youtube_access_token') return testToken;
        if (key === 'youtube_token_expires') return futureExpiry;
        return null;
      });

      spyOn(service, 'processAuthResult').and.returnValue(Promise.resolve(true));

      // Trigger session restoration
      await service['restoreSession']();

      expect(service.processAuthResult).toHaveBeenCalledWith(testToken, 'session_restore');
    });
  });

  describe('Token Management', () => {
    it('should store tokens with correct expiration (normal mode)', () => {
      const testToken = 'test-access-token';
      const beforeTime = Date.now();

      service.storeToken(testToken);

      expect(mockSessionStorage.setLocalItem).toHaveBeenCalledWith('youtube_access_token', testToken);
      expect(mockSessionStorage.setLocalItem).toHaveBeenCalledWith(
        'youtube_token_expires',
        jasmine.any(String)
      );

      // Verify expiration time is approximately 1 hour from now
      const expirationCall = mockSessionStorage.setLocalItem.calls.all()
        .find(call => call.args[0] === 'youtube_token_expires');
      const expirationTime = parseInt(expirationCall?.args[1] as string);
      const expectedExpiration = beforeTime + (3600 * 1000); // 1 hour

      expect(expirationTime).toBeGreaterThan(beforeTime);
      expect(expirationTime).toBeLessThan(expectedExpiration + 1000); // Allow 1 second tolerance
    });

    it('should retrieve valid stored tokens', () => {
      const testToken = 'stored-test-token';
      const futureExpiry = (Date.now() + 3600000).toString(); // 1 hour from now

      mockSessionStorage.getLocalItem.and.callFake((key: string) => {
        if (key === 'youtube_access_token') return testToken;
        if (key === 'youtube_token_expires') return futureExpiry;
        return null;
      });

      const token = service.getStoredToken();

      expect(token).toBe(testToken);
    });

    it('should handle expired tokens correctly', () => {
      const testToken = 'expired-test-token';
      const pastExpiry = (Date.now() - 1000).toString(); // 1 second ago

      mockSessionStorage.getLocalItem.and.callFake((key: string) => {
        if (key === 'youtube_access_token') return testToken;
        if (key === 'youtube_token_expires') return pastExpiry;
        return null;
      });

      const token = service.getStoredToken();

      expect(token).toBeNull();
      expect(mockSessionStorage.removeLocalItem).toHaveBeenCalledWith('youtube_access_token');
      expect(mockSessionStorage.removeLocalItem).toHaveBeenCalledWith('youtube_token_expires');
    });

    it('should clear stored tokens on cleanup', () => {
      service.clearStoredToken();

      expect(mockSessionStorage.removeLocalItem).toHaveBeenCalledWith('youtube_access_token');
      expect(mockSessionStorage.removeLocalItem).toHaveBeenCalledWith('youtube_token_expires');
    });

    it('should handle storeToken with custom expiration time', () => {
      const testToken = 'test-token';
      const customExpiration = 7200; // 2 hours
      const beforeTime = Date.now();

      service.storeToken(testToken, customExpiration);

      const expirationCall = mockSessionStorage.setLocalItem.calls.all()
        .find(call => call.args[0] === 'youtube_token_expires');
      const expirationTime = parseInt(expirationCall?.args[1] as string);
      const expectedExpiration = beforeTime + (customExpiration * 1000);

      expect(expirationTime).toBeGreaterThan(beforeTime);
      expect(expirationTime).toBeLessThan(expectedExpiration + 1000);
    });

    it('should return null when no token is stored', () => {
      mockSessionStorage.getLocalItem.and.returnValue(null);
      const token = service.getStoredToken();
      expect(token).toBeNull();
    });

    it('should return null when token exists but expiry is missing', () => {
      mockSessionStorage.getLocalItem.and.callFake((key: string) => {
        if (key === 'youtube_access_token') return 'some-token';
        if (key === 'youtube_token_expires') return null;
        return null;
      });
      const token = service.getStoredToken();
      expect(token).toBeNull();
    });
  });

  describe('processAuthResult', () => {
    it('should set access token, store it, and call registerWithBackend when youtube is connected', async () => {
      mockFirebaseAuth.setMockUser(mockUser);

      const result = await callProcessAuthResultAndFlush('test-token', mockSignInResponse, 'manual');

      expect(result).toBe(true);
      expect(service.getCurrentAccessToken()).toBe('test-token');
      expect(mockSessionStorage.setLocalItem).toHaveBeenCalledWith('youtube_access_token', 'test-token');
      expect(mockYouTubeOAuthService.fetchAndSetChannelData).toHaveBeenCalled();
    });

    it('should set channel status to not_found when youtube is not connected', async () => {
      mockFirebaseAuth.setMockUser(mockUser);

      const responseNoYoutube = {
        ...mockSignInResponse,
        youtubeConnected: false
      };

      const result = await callProcessAuthResultAndFlush('test-token', responseNoYoutube, 'manual');

      expect(result).toBe(true);
      expect(mockYouTubeOAuthService.setChannelStatus).toHaveBeenCalledWith('not_found');
    });

    it('should set channel status to not_found when youtubeConnected is undefined', async () => {
      mockFirebaseAuth.setMockUser(mockUser);

      const responseUndefinedYoutube = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true
        // youtubeConnected is not set
      };

      const result = await callProcessAuthResultAndFlush('test-token', responseUndefinedYoutube);

      expect(result).toBe(true);
      expect(mockYouTubeOAuthService.setChannelStatus).toHaveBeenCalledWith('not_found');
    });

    it('should handle registerWithBackend failure gracefully', async () => {
      mockFirebaseAuth.setMockUser(mockUser);
      spyOn(console, 'error');

      const promise = service.processAuthResult('test-token');
      // Allow microtasks to resolve so HTTP request is made
      await new Promise(resolve => setTimeout(resolve, 0));

      // Make the HTTP call fail
      const req = httpMock.expectOne(`${environment.API_BASE}/creator/sign-in`);
      req.error(new ProgressEvent('Network error'));

      const result = await promise;

      // processAuthResult still returns true and sets channel to not_found because
      // creatorSignInSubject.value is null after failed backend call
      expect(result).toBe(true);
      expect(mockYouTubeOAuthService.setChannelStatus).toHaveBeenCalledWith('not_found');
    });
  });

  describe('registerWithBackend (via processAuthResult)', () => {
    it('should propagate user when not restoring session and onboarding incomplete', async () => {
      mockFirebaseAuth.setMockUser(mockUser);
      service['restoringSession'] = false;

      const incompleteResponse = {
        ...mockSignInResponse,
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        youtubeConnected: false
      };

      await callProcessAuthResultAndFlush('test-token', incompleteResponse, 'initial');

      expect(mockOnboardingService.propagateUser).toHaveBeenCalledWith(incompleteResponse);
    });

    it('should propagate user when not restoring session and onboarding is complete', async () => {
      mockFirebaseAuth.setMockUser(mockUser);
      service['restoringSession'] = false;

      await callProcessAuthResultAndFlush('test-token', mockSignInResponse);

      expect(mockOnboardingService.propagateUser).toHaveBeenCalledWith(mockSignInResponse);
    });

    it('should NOT propagate user when restoring session', async () => {
      mockFirebaseAuth.setMockUser(mockUser);

      const promise = service.processAuthResult('test-token', 'session_restore');
      await new Promise(resolve => setTimeout(resolve, 0));
      // Set restoringSession AFTER async getCurrentUser resolves but BEFORE HTTP flush
      service['restoringSession'] = true;
      flushSignInRequest(mockSignInResponse);
      await promise;

      expect(mockOnboardingService.propagateUser).not.toHaveBeenCalled();
    });

    it('should handle registerWithBackend when no current user is found', async () => {
      mockFirebaseAuth.setMockUser(null);
      spyOn(console, 'warn');

      const result = await service.processAuthResult('test-token');

      expect(result).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('No current user found, skipping sign-in');
      expect(mockYouTubeOAuthService.setChannelStatus).toHaveBeenCalledWith('not_found');
    });

    it('should send correct sign-in data to backend with full displayName', async () => {
      const fullNameUser = createMockUser({
        uid: 'test-uid',
        email: 'john.doe@example.com',
        displayName: 'John Michael Doe',
        photoURL: 'https://example.com/pic.jpg',
        emailVerified: true
      });
      mockFirebaseAuth.setMockUser(fullNameUser);

      const promise = service.processAuthResult('my-token', 'test_context');
      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(`${environment.API_BASE}/creator/sign-in`);
      expect(req.request.body.displayName).toBe('John Michael Doe');
      expect(req.request.body.email).toBe('john.doe@example.com');
      expect(req.request.body.firebaseUid).toBe('test-uid');
      expect(req.request.body.profilePictureUrl).toBe('https://example.com/pic.jpg');
      expect(req.request.body.signInContext).toBe('test_context');
      expect(req.request.headers.get('api-key')).toBe(environment.API_KEY ?? null);
      req.flush(mockSignInResponse);
      await promise;
    });

    it('should handle user with no displayName', async () => {
      const noNameUser = createMockUser({
        uid: 'test-uid',
        email: 'noname@example.com',
        displayName: null,
        photoURL: null,
        emailVerified: true
      });
      mockFirebaseAuth.setMockUser(noNameUser);

      const promise = service.processAuthResult('my-token');
      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(`${environment.API_BASE}/creator/sign-in`);
      expect(req.request.body.displayName).toBe('');
      expect(req.request.body.email).toBe('noname@example.com');
      req.flush(mockSignInResponse);
      await promise;
    });

    it('should handle user with no email', async () => {
      const noEmailUser = createMockUser({
        uid: 'test-uid',
        email: null,
        displayName: 'Test',
        photoURL: null,
        emailVerified: false
      });
      mockFirebaseAuth.setMockUser(noEmailUser);

      const promise = service.processAuthResult('my-token');
      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(`${environment.API_BASE}/creator/sign-in`);
      expect(req.request.body.email).toBe('');
      expect(req.request.body.profilePictureUrl).toBeUndefined();
      req.flush(mockSignInResponse);
      await promise;
    });

    it('should not call registerWithBackend twice when signingIn flag is set', async () => {
      mockFirebaseAuth.setMockUser(mockUser);
      service['signingIn'] = true;

      const result = await service.processAuthResult('test-token');

      httpMock.expectNone(`${environment.API_BASE}/creator/sign-in`);
      expect(result).toBe(true);
      expect(mockYouTubeOAuthService.setChannelStatus).toHaveBeenCalledWith('not_found');
    });

    it('should handle backend HTTP error in registerWithBackend', async () => {
      mockFirebaseAuth.setMockUser(mockUser);
      spyOn(console, 'error');

      const promise = service.processAuthResult('test-token');
      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(`${environment.API_BASE}/creator/sign-in`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      await promise;

      expect(service.getCurrentAccessToken()).toBe('test-token');
    });
  });

  describe('signOut', () => {
    it('should clear stored tokens, reset state, sign out from Firebase, and navigate home', async () => {
      // Set up some state
      service['accessTokenSubject'].next('test-token');

      await service.signOut();

      expect(mockSessionStorage.removeLocalItem).toHaveBeenCalledWith('youtube_access_token');
      expect(mockSessionStorage.removeLocalItem).toHaveBeenCalledWith('youtube_token_expires');
      expect(service.getCurrentAccessToken()).toBeNull();
      expect(mockYouTubeOAuthService.resetChannelState).toHaveBeenCalled();
      expect(mockYouTubeOAuthService.setConnectionStatus).toHaveBeenCalledWith({ connected: false, error: null });
      expect(mockOnboardingService.resetOnboarding).toHaveBeenCalled();
      expect((mockDashboardService as any).reset).toHaveBeenCalled();
      expect(mockLoadingStateService.clear).toHaveBeenCalled();
      expect(mockTokenService.clearToken).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
      expect(service.getSignInResponse()).toBeNull();
    });

    it('should not navigate when skipNavigation is true', async () => {
      service['accessTokenSubject'].next('test-token');

      await service.signOut({ skipNavigation: true });

      // All cleanup still happens
      expect(mockSessionStorage.removeLocalItem).toHaveBeenCalledWith('youtube_access_token');
      expect(mockYouTubeOAuthService.resetChannelState).toHaveBeenCalled();
      expect(mockOnboardingService.resetOnboarding).toHaveBeenCalled();
      expect(mockTokenService.clearToken).toHaveBeenCalled();
      // But no navigation
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should throw error when Firebase signOut fails', async () => {
      service['accessTokenSubject'].next('test-token');
      spyOn(mockFirebaseAuth, 'signOut').and.returnValue(Promise.reject(new Error('SignOut failed')));

      try {
        await service.signOut();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('SignOut failed');
      }

      // State should still be cleared
      expect(service.getCurrentAccessToken()).toBeNull();
    });
  });

  describe('getSignInResponse', () => {
    it('should return null when no sign-in response is available', () => {
      expect(service.getSignInResponse()).toBeNull();
    });

    it('should return the sign-in response after successful processAuthResult', async () => {
      mockFirebaseAuth.setMockUser(mockUser);

      await callProcessAuthResultAndFlush('test-token', mockSignInResponse);

      const response = service.getSignInResponse();
      expect(response).toEqual(mockSignInResponse);
    });
  });

  describe('emitGoogleAuthTrigger', () => {
    it('should set triggerGoogleAuth to true then back to false', (done) => {
      // Spy on initiateAuthentication to prevent actual Firebase calls
      spyOn<any>(service, 'initiateAuthentication').and.returnValue(Promise.resolve());

      service.emitGoogleAuthTrigger();
      expect(service.triggerGoogleAuth()).toBe(true);

      setTimeout(() => {
        expect(service.triggerGoogleAuth()).toBe(false);
        done();
      }, 10);
    });
  });

  describe('Session Management & Token Refresh', () => {
    it('should restore valid sessions on initialization', async () => {
      const testToken = 'valid-stored-token';
      const futureExpiry = (Date.now() + 3600000).toString();

      mockFirebaseAuth.setMockUser(mockUser);
      mockSessionStorage.getLocalItem.and.callFake((key: string) => {
        if (key === 'youtube_access_token') return testToken;
        if (key === 'youtube_token_expires') return futureExpiry;
        return null;
      });

      spyOn(service, 'processAuthResult').and.returnValue(Promise.resolve(true));

      await service['restoreSession']();

      expect(service.processAuthResult).toHaveBeenCalledWith(testToken, 'session_restore');
    });

    it('should handle restoreSession with user but no stored token', async () => {
      mockFirebaseAuth.setMockUser(mockUser);
      mockSessionStorage.getLocalItem.and.returnValue(null);
      spyOn(console, 'log');

      await service['restoreSession']();

      expect(console.log).toHaveBeenCalledWith('User authenticated but no valid stored token found');
    });

    it('should handle restoreSession with no authenticated user', async () => {
      mockFirebaseAuth.setMockUser(null);

      await service['restoreSession']();

      expect(mockSessionStorage.getLocalItem).not.toHaveBeenCalled();
    });

    it('should handle restoreSession errors', async () => {
      mockFirebaseAuth.setMockUser(mockUser);
      mockSessionStorage.getLocalItem.and.throwError('Storage unavailable');
      spyOn(console, 'error');

      await service['restoreSession']();

      expect(console.error).toHaveBeenCalledWith('Error restoring session:', jasmine.any(Error));
      // restoringSession should be reset to false even after error
      expect(service['restoringSession']).toBe(false);
    });

    it('should ensure valid tokens with refresh logic', async () => {
      // Test with valid stored token
      const validToken = 'valid-token';
      const futureExpiry = (Date.now() + 3600000).toString();

      mockSessionStorage.getLocalItem.and.callFake((key: string) => {
        if (key === 'youtube_access_token') return validToken;
        if (key === 'youtube_token_expires') return futureExpiry;
        return null;
      });

      const result1 = await service.ensureValidToken();
      expect(result1).toBe(validToken);

      // Test with expired token requiring refresh
      mockSessionStorage.getLocalItem.and.returnValue(null); // No stored token
      mockFirebaseAuth.setMockUser(mockUser);
      spyOn(service, 'silentTokenRefresh').and.returnValue(Promise.resolve('refreshed-token'));

      const result2 = await service.ensureValidToken();
      expect(result2).toBe('refreshed-token');
      expect(service.silentTokenRefresh).toHaveBeenCalledWith(mockUser);
    });

    it('should handle ensureValidToken with no user', async () => {
      mockSessionStorage.getLocalItem.and.returnValue(null);
      mockFirebaseAuth.setMockUser(null);

      const result = await service.ensureValidToken();
      expect(result).toBeNull();
    });

    it('should handle ensureValidToken when silentTokenRefresh fails', async () => {
      mockSessionStorage.getLocalItem.and.returnValue(null);
      mockFirebaseAuth.setMockUser(mockUser);
      spyOn(service, 'silentTokenRefresh').and.returnValue(Promise.resolve(null));

      const result = await service.ensureValidToken();
      expect(result).toBeNull();
    });

    it('should handle ensureValidToken with exception during refresh', async () => {
      mockSessionStorage.getLocalItem.and.returnValue(null);
      mockFirebaseAuth.setMockUser(mockUser);
      spyOn(service, 'silentTokenRefresh').and.returnValue(Promise.reject(new Error('Refresh failed')));
      spyOn(console, 'error');

      const result = await service.ensureValidToken();
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error ensuring valid token:', jasmine.any(Error));
    });

    it('should store token and update accessToken on successful refresh', async () => {
      mockSessionStorage.getLocalItem.and.returnValue(null);
      mockFirebaseAuth.setMockUser(mockUser);
      const refreshedToken = 'refreshed-access-token';
      spyOn(service, 'silentTokenRefresh').and.returnValue(Promise.resolve(refreshedToken));

      const result = await service.ensureValidToken();

      expect(result).toBe(refreshedToken);
      expect(mockSessionStorage.setLocalItem).toHaveBeenCalledWith('youtube_access_token', refreshedToken);
      expect(service.getCurrentAccessToken()).toBe(refreshedToken);
    });
  });

  describe('onLoginClick', () => {
    it('should set loading and call initiateSignIn', async () => {
      spyOn(service, 'initiateSignIn').and.returnValue(Promise.resolve());

      await service.onLoginClick('test_context');

      expect(mockLoadingStateService.setLoading).toHaveBeenCalledWith(true);
      expect(service.initiateSignIn).toHaveBeenCalledWith('test_context');
    });

    it('should set fallback error when initiateSignIn fails and no error is already set', async () => {
      spyOn(service, 'initiateSignIn').and.returnValue(Promise.reject(new Error('auth failed')));
      mockLoadingStateService.getCurrentError.and.returnValue(null);
      spyOn(console, 'error');

      await service.onLoginClick();

      expect(mockLoadingStateService.setError).toHaveBeenCalledWith('Authentication failed. Please try again.');
    });

    it('should not set fallback error when error is already set by initiateSignIn', async () => {
      spyOn(service, 'initiateSignIn').and.returnValue(Promise.reject(new Error('auth failed')));
      mockLoadingStateService.getCurrentError.and.returnValue('Pop-up was blocked');
      spyOn(console, 'error');

      await service.onLoginClick();

      expect(mockLoadingStateService.setError).not.toHaveBeenCalledWith('Authentication failed. Please try again.');
    });
  });

  describe('initiateSignIn', () => {
    it('should use stored token when user is authenticated and token exists', async () => {
      mockFirebaseAuth.setMockUser(mockUser);
      const storedToken = 'stored-token';
      const futureExpiry = (Date.now() + 3600000).toString();
      mockSessionStorage.getLocalItem.and.callFake((key: string) => {
        if (key === 'youtube_access_token') return storedToken;
        if (key === 'youtube_token_expires') return futureExpiry;
        return null;
      });

      // completeAuthentication calls processAuthResult -> registerWithBackend
      spyOn(service, 'processAuthResult').and.returnValue(Promise.resolve(true));

      await service.initiateSignIn('test');

      expect(service.processAuthResult).toHaveBeenCalledWith(storedToken, 'test');
      expect(mockLoadingStateService.clear).toHaveBeenCalled();
    });

    it('should try ensureValidToken when user exists but no stored token', async () => {
      mockFirebaseAuth.setMockUser(mockUser);
      mockSessionStorage.getLocalItem.and.returnValue(null);

      spyOn(service, 'ensureValidToken').and.returnValue(Promise.resolve('refreshed-token'));
      spyOn(service, 'processAuthResult').and.returnValue(Promise.resolve(true));

      await service.initiateSignIn('ctx');

      expect(service.ensureValidToken).toHaveBeenCalled();
      expect(service.processAuthResult).toHaveBeenCalledWith('refreshed-token', 'ctx');
      expect(mockLoadingStateService.clear).toHaveBeenCalled();
    });

    it('should call initiateAuthentication when user exists but no valid token at all', async () => {
      mockFirebaseAuth.setMockUser(mockUser);
      mockSessionStorage.getLocalItem.and.returnValue(null);

      spyOn(service, 'ensureValidToken').and.returnValue(Promise.resolve(null));
      spyOn<any>(service, 'initiateAuthentication').and.returnValue(Promise.resolve());

      await service.initiateSignIn('ctx');

      expect(service['initiateAuthentication']).toHaveBeenCalledWith('ctx');
    });

    it('should call initiateAuthentication when no user is authenticated', async () => {
      mockFirebaseAuth.setMockUser(null);
      spyOn<any>(service, 'initiateAuthentication').and.returnValue(Promise.resolve());

      await service.initiateSignIn();

      expect(service['initiateAuthentication']).toHaveBeenCalledWith(undefined);
    });

    it('should handle popup-closed-by-user error', async () => {
      mockFirebaseAuth.setMockUser(null);
      const popupError = { code: 'auth/popup-closed-by-user', message: 'Popup closed' };
      spyOn<any>(service, 'initiateAuthentication').and.returnValue(Promise.reject(popupError));
      spyOn(console, 'error');

      // Should not throw
      await service.initiateSignIn();

      expect(mockLoadingStateService.clear).toHaveBeenCalled();
    });

    it('should handle cancelled-popup-request error', async () => {
      mockFirebaseAuth.setMockUser(null);
      const cancelledError = { code: 'auth/cancelled-popup-request', message: 'Cancelled' };
      spyOn<any>(service, 'initiateAuthentication').and.returnValue(Promise.reject(cancelledError));
      spyOn(console, 'error');

      // Should not throw
      await service.initiateSignIn();

      expect(mockLoadingStateService.clear).toHaveBeenCalled();
    });

    it('should re-throw unknown errors', async () => {
      mockFirebaseAuth.setMockUser(null);
      const unknownError = { code: 'auth/internal-error', message: 'Internal error' };
      spyOn<any>(service, 'initiateAuthentication').and.returnValue(Promise.reject(unknownError));
      spyOn(console, 'error');

      try {
        await service.initiateSignIn();
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('auth/internal-error');
      }
    });
  });

  describe('completeAuthentication', () => {
    it('should call processAuthResult with accessToken and clear loading', async () => {
      spyOn(service, 'processAuthResult').and.returnValue(Promise.resolve(true));

      await service['completeAuthentication']('some-token', 'ctx');

      expect(service.processAuthResult).toHaveBeenCalledWith('some-token', 'ctx');
      expect(mockLoadingStateService.clear).toHaveBeenCalled();
    });

    it('should only clear loading when accessToken is null', async () => {
      spyOn(service, 'processAuthResult');

      await service['completeAuthentication'](null, 'ctx');

      expect(service.processAuthResult).not.toHaveBeenCalled();
      expect(mockLoadingStateService.clear).toHaveBeenCalled();
    });
  });

  describe('NavigationEnd tracking', () => {
    it('should track lastRoute on NavigationEnd events', () => {
      const navEnd = new NavigationEnd(1, '/test', '/test-redirect');
      routerEventsSubject.next(navEnd);

      expect(service['lastRoute']).toBe('/test-redirect');
    });

    it('should not set lastRoute for non-NavigationEnd events', () => {
      service['lastRoute'] = null;
      routerEventsSubject.next({ type: 'other' });

      expect(service['lastRoute']).toBeNull();
    });
  });

  describe('State Management & Observables', () => {
    it('should emit user state changes correctly', (done) => {
      const userStates: any[] = [];

      service.user$.subscribe(user => {
        userStates.push(user);
        if (userStates.length === 2) {
          expect(userStates[0]).toBeNull();
          expect(userStates[1]).toEqual(mockUser);
          done();
        }
      });

      // Trigger user state change
      mockFirebaseAuth.setMockUser(mockUser);
    });

    it('should expose accessToken$ observable', (done) => {
      service.accessToken$.subscribe(token => {
        if (token === 'new-token') {
          done();
        }
      });

      service['accessTokenSubject'].next('new-token');
    });

    it('should expose creatorSignInResponse$ observable', (done) => {
      const testResponse = { ...mockSignInResponse };

      service.creatorSignInResponse$.subscribe(response => {
        if (response !== null) {
          expect(response).toEqual(testResponse);
          done();
        }
      });

      service['creatorSignInSubject'].next(testResponse);
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when no user is authenticated', async () => {
      mockFirebaseAuth.setMockUser(null);
      const user = await service.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should return the current user when authenticated', async () => {
      mockFirebaseAuth.setMockUser(mockUser);
      const user = await service.getCurrentUser();
      expect(user).toEqual(mockUser);
    });
  });

  describe('silentTokenRefresh', () => {
    // Note: silentTokenRefresh calls signInWithPopup which is a module-level import
    // from @angular/fire/auth. In Karma/Jasmine we cannot easily mock module-level
    // exports, so the actual method call hits the real signInWithPopup which will
    // fail in the headless browser. We test the error handling path which is the
    // catch block, which gives us branch coverage.
    it('should return null when signInWithPopup throws', async () => {
      // signInWithPopup will fail in test env, triggering the catch block
      const result = await service.silentTokenRefresh(mockUser);
      expect(result).toBeNull();
    });

    it('should return null for user without email (covers email branch)', async () => {
      const noEmailUser = createMockUser({
        uid: 'no-email-uid',
        email: null,
        displayName: 'No Email',
        emailVerified: false
      });

      // Will fail at signInWithPopup but exercises the email null branch first
      const result = await service.silentTokenRefresh(noEmailUser);
      expect(result).toBeNull();
    });
  });

});
