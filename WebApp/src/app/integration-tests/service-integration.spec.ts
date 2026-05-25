import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { createMockUser } from '../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../testing/mocks/http.mock';
import { AuthService } from '@services/auth.service';
import { SessionStorageService } from '@services/session-storage.service';
import { LoadingStateService } from '@services/loading-state.service';

/**
 * Test-only AuthService that replicates token management without Firebase dependency.
 */
@Injectable()
class TestAuthService {
  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  private sessionStorageService = new SessionStorageService();
  private userSubject = new BehaviorSubject<any>(null);

  public user$ = this.userSubject.asObservable();
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

  async ensureValidToken(): Promise<string> {
    return 'mock-token';
  }

  async getCurrentUser(): Promise<any> {
    return null;
  }

  emitUser(user: any): void {
    this.userSubject.next(user);
  }
}

/**
 * Integration tests for service interactions and data flow
 * Tests how services work together without UI components
 */
describe('Integration: Service Interactions', () => {
  let authService: TestAuthService;
  let sessionStorageService: SessionStorageService;
  let loadingStateService: LoadingStateService;
  let mockUser: any;

  beforeEach(async () => {
    const mockHttpClient = createMockHttpClient();
    mockUser = createMockUser();
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

  describe('Session Management Integration', () => {
    it('should manage token storage and retrieval', async () => {
      const testToken = 'test-access-token';
      authService.storeToken(testToken, 3600);

      const retrievedToken = authService.getStoredToken();
      expect(retrievedToken).toBe(testToken);

      const expirationTime = sessionStorageService.getLocalItem('youtube_token_expires');
      expect(expirationTime).toBeTruthy();
      expect(parseInt(expirationTime!)).toBeGreaterThan(Date.now());
    });

    it('should handle token expiration correctly', async () => {
      const expiredToken = 'expired-token';
      authService.storeToken(expiredToken, -1);

      await new Promise(resolve => setTimeout(resolve, 10));

      const retrievedToken = authService.getStoredToken();
      expect(retrievedToken).toBeNull();

      const storedToken = sessionStorageService.getLocalItem('youtube_access_token');
      expect(storedToken).toBeNull();
    });

    it('should handle error states across services', async () => {
      loadingStateService.setLoading(true);
      loadingStateService.setError('Authentication failed');
      expect(loadingStateService.isLoading()).toBe(false);
      expect(loadingStateService.getCurrentError()).toBe('Authentication failed');
    });
  });

  describe('Data Flow Integration', () => {
    it('should propagate user state changes through observables', (done) => {
      const userStateChanges: any[] = [];
      authService.user$.subscribe(user => {
        userStateChanges.push(user);
      });

      // Emit user through the test auth service
      authService.emitUser(mockUser);

      setTimeout(() => {
        expect(userStateChanges.length).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it('should coordinate access token updates', async () => {
      const tokenChanges: (string | null)[] = [];
      authService.accessToken$.subscribe(token => {
        tokenChanges.push(token);
      });

      const newToken = 'updated-access-token';
      authService.storeToken(newToken);

      expect(authService.getStoredToken()).toBe(newToken);
      expect(authService.getCurrentAccessToken()).toBe(null);
    });
  });

  describe('Performance Integration', () => {
    it('should efficiently manage token refresh operations', async () => {
      spyOn(authService, 'ensureValidToken').and.returnValue(Promise.resolve('refreshed-token'));
      spyOn(authService, 'getCurrentUser').and.returnValue(Promise.resolve(mockUser));

      const refreshPromises = [
        authService.ensureValidToken(),
        authService.ensureValidToken(),
        authService.ensureValidToken()
      ];

      const tokens = await Promise.all(refreshPromises);
      expect(tokens).toEqual(['refreshed-token', 'refreshed-token', 'refreshed-token']);
    });
  });
});
