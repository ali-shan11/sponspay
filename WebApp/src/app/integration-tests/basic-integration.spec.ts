import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { createMockHttpClient } from '../../testing/mocks/http.mock';
import { AuthService } from '@services/auth.service';
import { SessionStorageService } from '@services/session-storage.service';
import { LoadingStateService } from '@services/loading-state.service';

/**
 * Test-only AuthService that replicates token management without Firebase dependency.
 * The real AuthService calls authState() from @angular/fire/auth during construction,
 * which requires a real Firebase app. This test double avoids that dependency.
 */
@Injectable()
class TestAuthService {
  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  private sessionStorageService = new SessionStorageService();

  public user$ = new BehaviorSubject<any>(null).asObservable();
  public accessToken$ = this.accessTokenSubject.asObservable();

  getCurrentAccessToken(): string | null {
    return this.accessTokenSubject.value;
  }

  storeToken(accessToken: string, expiresIn = 3600): void {
    const expirationTime = Date.now() + (expiresIn * 1000);
    this.sessionStorageService.setLocalItem('youtube_access_token', accessToken);
    this.sessionStorageService.setLocalItem('youtube_token_expires', expirationTime.toString());
  }

  getStoredToken(): string | null {
    const token = this.sessionStorageService.getLocalItem('youtube_access_token');
    const expires = this.sessionStorageService.getLocalItem('youtube_token_expires');
    if (!token || !expires) return null;
    if (Date.now() > parseInt(expires)) {
      this.clearStoredToken();
      return null;
    }
    return token;
  }

  clearStoredToken(): void {
    this.sessionStorageService.removeLocalItem('youtube_access_token');
    this.sessionStorageService.removeLocalItem('youtube_token_expires');
  }

  async signOut(): Promise<void> {
    this.accessTokenSubject.next(null);
    this.clearStoredToken();
  }
}

/**
 * Basic integration tests to verify service dependencies and initialization
 * These tests ensure services can be instantiated together and basic interactions work
 */
describe('Integration: Basic Service Dependencies', () => {
  let authService: TestAuthService;
  let sessionStorageService: SessionStorageService;
  let loadingStateService: LoadingStateService;

  beforeEach(async () => {
    const mockHttpClient = createMockHttpClient();
    const mockRouter = jasmine.createSpyObj('Router', ['navigate'], {
      events: of(),
      url: '/'
    });

    await TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useClass: TestAuthService },
        SessionStorageService,
        LoadingStateService,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: Router, useValue: mockRouter },
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as unknown as TestAuthService;
    sessionStorageService = TestBed.inject(SessionStorageService);
    loadingStateService = TestBed.inject(LoadingStateService);
  });

  describe('Service Initialization', () => {
    it('should initialize all services without errors', () => {
      expect(authService).toBeTruthy();
      expect(sessionStorageService).toBeTruthy();
      expect(loadingStateService).toBeTruthy();
    });

    it('should have proper observable streams initialized', () => {
      expect(authService.user$).toBeTruthy();
      expect(authService.accessToken$).toBeTruthy();
      expect(loadingStateService.loading$).toBeTruthy();
      expect(loadingStateService.error$).toBeTruthy();
    });

    it('should have initial state values', () => {
      expect(authService.getCurrentAccessToken()).toBeNull();
      expect(loadingStateService.isLoading()).toBe(false);
      expect(loadingStateService.getCurrentError()).toBeNull();
    });
  });

  describe('Token Management Integration', () => {
    it('should store and retrieve tokens correctly', () => {
      const testToken = 'test-token-123';
      authService.storeToken(testToken, 3600);
      const retrievedToken = authService.getStoredToken();
      expect(retrievedToken).toBe(testToken);
    });

    it('should handle token expiration', async () => {
      const expiredToken = 'expired-token';
      authService.storeToken(expiredToken, -1);
      await new Promise(resolve => setTimeout(resolve, 10));
      const retrievedToken = authService.getStoredToken();
      expect(retrievedToken).toBeNull();
    });

    it('should clear tokens properly', () => {
      const testToken = 'test-token-to-clear';
      authService.storeToken(testToken);
      expect(authService.getStoredToken()).toBe(testToken);
      authService.clearStoredToken();
      expect(authService.getStoredToken()).toBeNull();
    });
  });

  describe('Session Storage Integration', () => {
    it('should handle boolean items correctly', () => {
      const key = 'testBooleanKey';
      sessionStorageService.setBooleanItem(key, true);
      expect(sessionStorageService.getBooleanItem(key)).toBe(true);
      sessionStorageService.setBooleanItem(key, false);
      expect(sessionStorageService.getBooleanItem(key)).toBe(false);
      sessionStorageService.removeItem(key);
      expect(sessionStorageService.getBooleanItem(key)).toBe(null);
    });

    it('should handle string items correctly', () => {
      const key = 'testStringKey';
      const value = 'test-string-value';
      sessionStorageService.setItem(key, value);
      expect(sessionStorageService.getItem(key)).toBe(value);
      sessionStorageService.removeItem(key);
      expect(sessionStorageService.getItem(key)).toBeNull();
    });
  });

  describe('Loading State Integration', () => {
    it('should manage loading states correctly', () => {
      expect(loadingStateService.isLoading()).toBe(false);
      expect(loadingStateService.getCurrentError()).toBeNull();
      loadingStateService.setLoading(true);
      expect(loadingStateService.isLoading()).toBe(true);
      loadingStateService.setLoading(false);
      expect(loadingStateService.isLoading()).toBe(false);
    });

    it('should manage error states correctly', () => {
      const errorMessage = 'Test error message';
      loadingStateService.setError(errorMessage);
      expect(loadingStateService.getCurrentError()).toBe(errorMessage);
      expect(loadingStateService.isLoading()).toBe(false);
      loadingStateService.setError(null);
      expect(loadingStateService.getCurrentError()).toBeNull();
    });

    it('should clear all states', () => {
      loadingStateService.setLoading(true);
      loadingStateService.setError('Some error');
      loadingStateService.clear();
      expect(loadingStateService.isLoading()).toBe(false);
      expect(loadingStateService.getCurrentError()).toBeNull();
    });
  });

  describe('Observable Streams Integration', () => {
    it('should emit loading state changes', (done) => {
      const emittedValues: boolean[] = [];
      loadingStateService.loading$.subscribe(loading => {
        emittedValues.push(loading);
        if (emittedValues.length === 3) {
          expect(emittedValues).toEqual([false, true, false]);
          done();
        }
      });
      loadingStateService.setLoading(true);
      loadingStateService.setLoading(false);
    });

    it('should emit error state changes', (done) => {
      const emittedValues: (string | null)[] = [];
      loadingStateService.error$.subscribe(error => {
        emittedValues.push(error);
        if (emittedValues.length === 3) {
          expect(emittedValues).toEqual([null, 'Test error', null]);
          done();
        }
      });
      loadingStateService.setError('Test error');
      loadingStateService.setError(null);
    });

    it('should emit access token changes', (done) => {
      const emittedValues: (string | null)[] = [];
      authService.accessToken$.subscribe(token => {
        emittedValues.push(token);
        if (emittedValues.length === 2) {
          expect(emittedValues).toEqual([null, 'new-token']);
          done();
        }
      });
      (authService as any).accessTokenSubject.next('new-token');
    });
  });

  describe('Cross-Service Communication', () => {
    it('should coordinate loading and error states', () => {
      loadingStateService.setLoading(true);
      expect(loadingStateService.isLoading()).toBe(true);
      loadingStateService.setError('Integration test error');
      expect(loadingStateService.getCurrentError()).toBe('Integration test error');
      expect(loadingStateService.isLoading()).toBe(false);
    });
  });

  describe('Service Method Integration', () => {
    it('should handle AuthService sign out', async () => {
      authService.storeToken('test-token');
      (authService as any).accessTokenSubject.next('test-token');
      await authService.signOut();
      expect(authService.getStoredToken()).toBeNull();
      expect(authService.getCurrentAccessToken()).toBeNull();
    });
  });
});
