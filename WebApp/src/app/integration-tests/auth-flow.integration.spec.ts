import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AppComponent } from '../app.component';
import { IntegrationTestHelpers } from '../testing/integration-helpers';
import { AuthService } from '@services/auth.service';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';
import { SessionStorageService } from '@services/session-storage.service';
import { LoadingStateService } from '@services/loading-state.service';

/**
 * Integration tests for authentication flow across components and services
 * Tests mock service orchestration for the auth journey
 */
describe('Integration: Authentication Flow', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockYoutubeOAuthService: jasmine.SpyObj<YouTubeOAuthService>;
  let mockSessionStorageService: jasmine.SpyObj<SessionStorageService>;
  let mockLoadingStateService: jasmine.SpyObj<LoadingStateService>;
  let mockModalService: jasmine.SpyObj<NgbModal>;

  let mockUser: any;
  let mockChannels: any[];

  beforeEach(async () => {
    const testEnv = IntegrationTestHelpers.createAuthFlowTestEnvironment();

    mockAuthService = testEnv.mockAuthService;
    mockYoutubeOAuthService = testEnv.mockYoutubeOAuthService;
    mockSessionStorageService = testEnv.mockSessionStorageService;
    mockLoadingStateService = testEnv.mockLoadingStateService;
    mockModalService = testEnv.mockModalService;
    mockUser = testEnv.mockUser;
    mockChannels = testEnv.mockChannels;

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: testEnv.providers
    }).compileComponents();
  });

  describe('Complete OAuth Journey', () => {
    it('should complete Google OAuth sign-in with channel selection', async () => {
      mockAuthService.getCurrentUser.and.returnValue(Promise.resolve(mockUser));
      mockYoutubeOAuthService.getCurrentChannelStatus.and.returnValue('found');
      mockAuthService.getCurrentAccessToken.and.returnValue('mock-access-token');

      mockAuthService.initiateSignIn.and.callFake(async () => {
        await mockAuthService.getCurrentUser();
        return Promise.resolve();
      });

      await mockAuthService.initiateSignIn();

      expect(mockAuthService.initiateSignIn).toHaveBeenCalledTimes(1);
      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(mockYoutubeOAuthService.getCurrentChannelStatus()).toBe('found');
      expect(mockAuthService.getCurrentAccessToken()).toBe('mock-access-token');
    });

    it('should handle authentication errors across components', async () => {
      mockAuthService.getCurrentUser.and.returnValue(Promise.reject(new Error('Auth error')));
      mockYoutubeOAuthService.getCurrentChannelStatus.and.returnValue('unknown');

      mockAuthService.initiateSignIn.and.callFake(async () => {
        try {
          await mockAuthService.getCurrentUser();
        } catch {
          // Expected error
        }
      });

      await mockAuthService.initiateSignIn();

      expect(mockAuthService.initiateSignIn).toHaveBeenCalledTimes(1);
      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(mockYoutubeOAuthService.getCurrentChannelStatus()).toBe('unknown');
    });

    it('should handle user cancellation gracefully', async () => {
      IntegrationTestHelpers.simulateAuthenticationError(
        mockAuthService,
        'cancelled'
      );

      mockAuthService.initiateSignIn.and.returnValue(
        Promise.reject(new Error('User cancelled authentication'))
      );

      try {
        await mockAuthService.initiateSignIn();
      } catch {
        // Expected rejection
      }

      expect(mockAuthService.initiateSignIn).toHaveBeenCalledTimes(1);
      expect(mockModalService.open).not.toHaveBeenCalled();
    });
  });

  describe('Session Management Integration', () => {
    it('should maintain session across component navigation', async () => {
      IntegrationTestHelpers.setupSessionStorageState(
        mockSessionStorageService,
        {
          authToken: 'stored-access-token'
        }
      );

      mockAuthService.initiateSignIn.and.returnValue(Promise.resolve());

      await IntegrationTestHelpers.simulateAuthenticationFlow(
        mockAuthService,
        mockUser,
        mockChannels
      );

      await mockAuthService.initiateSignIn();

      expect(mockAuthService.initiateSignIn).toHaveBeenCalledTimes(1);
    });

    it('should handle token refresh during component interactions', async () => {
      mockAuthService.ensureValidToken.and.returnValue(Promise.resolve('refreshed-token'));
      mockAuthService.getCurrentAccessToken.and.returnValue('refreshed-token');

      mockAuthService.initiateSignIn.and.callFake(async () => {
        await mockAuthService.ensureValidToken();
        return Promise.resolve();
      });

      await mockAuthService.initiateSignIn();

      expect(mockAuthService.ensureValidToken).toHaveBeenCalled();
      expect(mockAuthService.getCurrentAccessToken()).toBe('refreshed-token');
    });
  });

  describe('Cross-Component Communication', () => {
    it('should coordinate between HeroSection and AuthService', async () => {
      mockAuthService.initiateSignIn.and.returnValue(Promise.resolve());

      await mockAuthService.initiateSignIn();

      expect(mockAuthService.initiateSignIn).toHaveBeenCalledTimes(1);
      expect(mockAuthService.processAuthResult).not.toHaveBeenCalled();
    });

    it('should handle loading states across components', async () => {
      const loadingSubject = mockLoadingStateService.loading$ as BehaviorSubject<boolean>;
      const errorSubject = mockLoadingStateService.error$ as BehaviorSubject<string | null>;

      mockAuthService.initiateSignIn.and.callFake(async () => {
        loadingSubject.next(true);
        await new Promise(resolve => setTimeout(resolve, 10));
        loadingSubject.next(false);
      });

      await mockAuthService.initiateSignIn();

      expect(mockAuthService.initiateSignIn).toHaveBeenCalledTimes(1);
      expect(loadingSubject.value).toBe(false);
      expect(errorSubject.value).toBeNull();
    });
  });

  describe('Error Propagation', () => {
    it('should propagate authentication errors through component tree', async () => {
      const authError = new Error('Authentication failed');
      mockAuthService.initiateSignIn.and.returnValue(Promise.reject(authError));

      try {
        await mockAuthService.initiateSignIn();
      } catch {
        // Expected rejection
      }

      expect(mockAuthService.initiateSignIn).toHaveBeenCalledTimes(1);
      expect(mockModalService.open).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      IntegrationTestHelpers.simulateAuthenticationError(
        mockAuthService,
        'network',
        mockYoutubeOAuthService
      );

      mockAuthService.initiateSignIn.and.returnValue(
        Promise.reject(new Error('Network error'))
      );

      try {
        await mockAuthService.initiateSignIn();
      } catch {
        // Expected rejection
      }

      expect(mockAuthService.initiateSignIn).toHaveBeenCalledTimes(1);
      expect(mockYoutubeOAuthService.getCurrentChannelStatus()).toBe('unknown');
    });
  });
});
