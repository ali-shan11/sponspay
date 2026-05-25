import { ComponentFixture } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { createMockFirebaseAuth, createMockUser } from '../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../testing/mocks/http.mock';
import { createMockChannelList } from '../../testing/fixtures/channel.fixtures';
import { AuthService } from '@services/auth.service';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';
import { SessionStorageService } from '@services/session-storage.service';
import { LoadingStateService } from '@services/loading-state.service';

/**
 * Integration testing helpers for testing component interactions and service orchestration
 */
export class IntegrationTestHelpers {
  
  /**
   * Creates a comprehensive test environment for authentication flow integration tests
   */
  static createAuthFlowTestEnvironment() {
    const mockAuth = createMockFirebaseAuth();
    const mockHttpClient = createMockHttpClient();
    const mockUser = createMockUser();
    const mockChannels = createMockChannelList(3);
    
    // Create mock services with realistic behavior
    const mockAuthService = jasmine.createSpyObj('AuthService', [
      'processAuthResult',
      'ensureValidToken',
      'signOut',
      'getCurrentUser',
      'getCurrentAccessToken',
      'getSignInResponse',
      'getStoredToken',
      'onLoginClick',
      'initiateSignIn'
    ], {
      user$: new BehaviorSubject(null),
      accessToken$: new BehaviorSubject(null),
    });

    const mockYoutubeOAuthService = jasmine.createSpyObj('YouTubeOAuthService', [
      'fetchAndSetChannelData',
      'getChannelMembersReportForChannel',
      'getCurrentChannelStatus',
      'getCurrentAvailableChannels',
      'setChannelStatus',
      'resetChannelState'
    ], {
      channelStatus$: new BehaviorSubject('unknown'),
      availableChannels$: new BehaviorSubject([]),
      selectedChannel: null
    });

    const mockSessionStorageService = jasmine.createSpyObj('SessionStorageService', [
      'setBooleanItem',
      'getBooleanItem',
      'removeItem',
      'setItem',
      'getItem'
    ]);

    const mockLoadingStateService = jasmine.createSpyObj('LoadingStateService', [
      'setLoading',
      'setError',
      'clear',
      'isLoading',
      'getCurrentError'
    ], {
      loading$: new BehaviorSubject(false),
      error$: new BehaviorSubject(null)
    });

    const mockModalService = jasmine.createSpyObj('NgbModal', [
      'open',
      'dismissAll'
    ]);

    const mockRouter = jasmine.createSpyObj('Router', [
      'navigate',
      'navigateByUrl'
    ], {
      events: of(),
      url: '/'
    });

    const mockActivatedRoute = {
      snapshot: { paramMap: new Map(), queryParamMap: new Map() },
      params: of({}),
      queryParams: of({})
    };

    return {
      mockAuth,
      mockHttpClient,
      mockUser,
      mockChannels,
      mockAuthService,
      mockYoutubeOAuthService,
      mockSessionStorageService,
      mockLoadingStateService,
      mockModalService,
      mockRouter,
      providers: [
        { provide: Auth, useValue: mockAuth },
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: AuthService, useValue: mockAuthService },
        { provide: YouTubeOAuthService, useValue: mockYoutubeOAuthService },
        { provide: SessionStorageService, useValue: mockSessionStorageService },
        { provide: LoadingStateService, useValue: mockLoadingStateService },
        { provide: NgbModal, useValue: mockModalService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    };
  }

  /**
   * Simulates a complete authentication flow for integration testing
   */
  static async simulateAuthenticationFlow(
    mockAuthService: jasmine.SpyObj<AuthService>,
    mockUser: any,
    mockChannels: any[],
    mockYoutubeOAuthService?: jasmine.SpyObj<YouTubeOAuthService>
  ): Promise<void> {
    // Simulate authentication process
    mockAuthService.processAuthResult.and.returnValue(Promise.resolve(true));

    // Simulate user state change
    (mockAuthService.user$ as BehaviorSubject<any>).next(mockUser);
    mockAuthService.getCurrentUser.and.returnValue(Promise.resolve(mockUser));

    // Simulate channel detection (on YouTubeOAuthService)
    if (mockYoutubeOAuthService) {
      mockYoutubeOAuthService.getCurrentAvailableChannels.and.returnValue(mockChannels);
      (mockYoutubeOAuthService.availableChannels$ as BehaviorSubject<any[]>).next(mockChannels);
      (mockYoutubeOAuthService.channelStatus$ as BehaviorSubject<string>).next('found');
      mockYoutubeOAuthService.getCurrentChannelStatus.and.returnValue('found');
    }

    // Simulate access token
    (mockAuthService.accessToken$ as BehaviorSubject<string>).next('mock-access-token');
    mockAuthService.getCurrentAccessToken.and.returnValue('mock-access-token');
  }

  /**
   * Simulates authentication errors for error handling tests
   */
  static simulateAuthenticationError(
    mockAuthService: jasmine.SpyObj<AuthService>,
    errorType: 'network' | 'cancelled' | 'invalid' = 'network',
    mockYoutubeOAuthService?: jasmine.SpyObj<YouTubeOAuthService>
  ): void {
    const errorMessages = {
      network: 'Network error during authentication',
      cancelled: 'User cancelled authentication',
      invalid: 'Invalid authentication credentials'
    };

    const error = new Error(errorMessages[errorType]);
    mockAuthService.processAuthResult.and.returnValue(Promise.reject(error));

    // Update user state to reflect error
    (mockAuthService.user$ as BehaviorSubject<any>).next(null);
    mockAuthService.getCurrentUser.and.returnValue(Promise.resolve(null));

    if (mockYoutubeOAuthService) {
      (mockYoutubeOAuthService.channelStatus$ as BehaviorSubject<string>).next('unknown');
      mockYoutubeOAuthService.getCurrentChannelStatus.and.returnValue('unknown');
    }
  }

  /**
   * Waits for component to reach stable state after async operations
   */
  static async waitForStableState(fixture: ComponentFixture<any>): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    
    // Additional wait for any pending async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  /**
   * Simulates modal opening with realistic behavior
   */
  static simulateModalOpen(
    mockModalService: jasmine.SpyObj<NgbModal>,
  ): any {
    const mockModalRef = {
      componentInstance: {},
      result: Promise.resolve('success'),
      dismiss: jasmine.createSpy('dismiss'),
      close: jasmine.createSpy('close'),
      closed: new BehaviorSubject(null),
      dismissed: new BehaviorSubject(null),
      shown: Promise.resolve(),
      hidden: Promise.resolve()
    } as any;
    
    mockModalService.open.and.returnValue(mockModalRef);
    return mockModalRef;
  }

  /**
   * Creates realistic session storage state for testing
   */
  static setupSessionStorageState(
    mockSessionStorageService: jasmine.SpyObj<SessionStorageService>,
    state: {
      authToken?: string;
    }
  ): void {
    mockSessionStorageService.getItem.and.callFake((key: string) => {
      switch (key) {
        case 'authToken':
          return state.authToken ?? null;
        default:
          return null;
      }
    });
  }

  /**
   * Verifies that component interactions occurred as expected
   */
  static verifyComponentInteraction(
    fixture: ComponentFixture<any>,
    selector: string,
    expectedText?: string,
    expectedClass?: string
  ): HTMLElement {
    const element = fixture.nativeElement.querySelector(selector);
    expect(element).toBeTruthy(`Element with selector '${selector}' should exist`);
    
    if (expectedText) {
      expect(element.textContent?.trim()).toContain(expectedText);
    }
    
    if (expectedClass) {
      expect(element.classList).toContain(expectedClass);
    }
    
    return element;
  }

  /**
   * Simulates user interactions for integration testing
   */
  static async simulateUserClick(
    fixture: ComponentFixture<any>,
    selector: string
  ): Promise<void> {
    const element = fixture.nativeElement.querySelector(selector);
    expect(element).toBeTruthy(`Clickable element with selector '${selector}' should exist`);
    
    element.click();
    await this.waitForStableState(fixture);
  }

  /**
   * Verifies service method calls in integration scenarios
   */
  static verifyServiceInteraction(
    mockService: jasmine.SpyObj<any>,
    methodName: string,
    expectedCallCount = 1,
    expectedArgs?: any[]
  ): void {
    expect(mockService[methodName]).toHaveBeenCalledTimes(expectedCallCount);
    
    if (expectedArgs) {
      expect(mockService[methodName]).toHaveBeenCalledWith(...expectedArgs);
    }
  }

  /**
   * Creates a realistic error scenario for testing error boundaries
   */
  static createErrorScenario(
    mockService: jasmine.SpyObj<any>,
    methodName: string,
    errorMessage: string
  ): void {
    mockService[methodName].and.returnValue(
      throwError(() => new Error(errorMessage))
    );
  }
}
