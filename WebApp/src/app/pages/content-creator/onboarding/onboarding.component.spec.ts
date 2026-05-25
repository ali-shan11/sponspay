import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { OnboardingService } from '@services/onboarding.service';
import { AuthService } from '@services/auth.service';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';
import { AlertService } from '@services/alert.service';
import { ONBOARDING_STEPS } from '@utils/enums';
import { AcceptTermsResponse, CreatorSignInResponse } from '@app-types/onboarding';

import { OnboardingComponent } from './onboarding.component';

describe('OnboardingComponent', () => {
  let component: OnboardingComponent;
  let fixture: ComponentFixture<OnboardingComponent>;
  let mockOnboardingService: any;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockYouTubeOAuthService: any;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    // Use a plain object for OnboardingService so currentStep is writable
    mockOnboardingService = {
      currentStep: 0,
      integrationStep: 0,
      youtubePayingUsersPercentage: 0,
      sponspayPayingUsersPercentage: 0,
      propagateUser: jasmine.createSpy('propagateUser'),
      resetOnboarding: jasmine.createSpy('resetOnboarding'),
      gotoNextStep: jasmine.createSpy('gotoNextStep'),
      gotoPreviousStep: jasmine.createSpy('gotoPreviousStep'),
      acceptTerms: jasmine.createSpy('acceptTerms'),
      navigateToDashboard: jasmine.createSpy('navigateToDashboard'),
      onBoardCreator: jasmine.createSpy('onBoardCreator'),
      checkTelegramHandleAvailability: jasmine.createSpy('checkTelegramHandleAvailability').and.returnValue(of({ available: true })),
      getTermsHtml: jasmine.createSpy('getTermsHtml').and.returnValue(of({ id: '1', version: 1, html: '<p>Terms</p>', createdAt: '2026-01-01' })),
    };

    mockAuthService = jasmine.createSpyObj('AuthService', [
      'getCurrentUser',
      'getStoredToken',
      'ensureValidToken',
      'getSignInResponse',
      'signOut',
    ], {
      user$: new BehaviorSubject(null),
      accessToken$: new BehaviorSubject(null),
      creatorSignInResponse$: new BehaviorSubject(null),
    });
    mockAuthService.getSignInResponse.and.returnValue(null);

    // Use a plain object for YouTubeOAuthService so selectedChannel is writable
    mockYouTubeOAuthService = {
      getConnectionStatus: jasmine.createSpy('getConnectionStatus').and.returnValue({ connected: false, error: null }),
      fetchAndSetChannelData: jasmine.createSpy('fetchAndSetChannelData'),
      getChannelMembersReportForChannel: jasmine.createSpy('getChannelMembersReportForChannel'),
      getCurrentChannelStatus: jasmine.createSpy('getCurrentChannelStatus'),
      setChannelStatus: jasmine.createSpy('setChannelStatus'),
      resetChannelState: jasmine.createSpy('resetChannelState'),
      disconnectYouTube: jasmine.createSpy('disconnectYouTube').and.returnValue(Promise.resolve()),
      channelStatus$: of('unknown'),
      availableChannels$: of([]),
      selectedChannel: null,
    };

    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' });

    await TestBed.configureTestingModule({
      imports: [OnboardingComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: AuthService, useValue: mockAuthService },
        { provide: YouTubeOAuthService, useValue: mockYouTubeOAuthService },
        { provide: OnboardingService, useValue: mockOnboardingService },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call onboardingService.propagateUser with authService.getSignInResponse()', () => {
      // ngOnInit was called during detectChanges in beforeEach
      expect(mockAuthService.getSignInResponse).toHaveBeenCalled();
      expect(mockOnboardingService.propagateUser).toHaveBeenCalledWith(null);
    });

    it('should pass the sign-in response to propagateUser when available', () => {
      const signInResponse: CreatorSignInResponse = {
        success: true,
        message: 'Signed in',
        userId: 'user-1',
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        youtubeConnected: false,
      };
      mockAuthService.getSignInResponse.and.returnValue(signInResponse);

      // Re-create the component to trigger ngOnInit with new data
      const newFixture = TestBed.createComponent(OnboardingComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(mockOnboardingService.propagateUser).toHaveBeenCalledWith(signInResponse);

      newComponent.ngOnDestroy();
    });
  });

  describe('ngOnDestroy', () => {
    it('should call onboardingService.resetOnboarding', () => {
      component.ngOnDestroy();
      expect(mockOnboardingService.resetOnboarding).toHaveBeenCalled();
    });
  });

  describe('goToIntegration', () => {
    it('should call onboardingService.gotoNextStep', () => {
      component.goToIntegration();
      expect(mockOnboardingService.gotoNextStep).toHaveBeenCalled();
    });

    it('should set showPotentialEarning to false', () => {
      component.showPotentialEarning = true;
      component.goToIntegration();
      expect(component.showPotentialEarning).toBe(false);
    });

    it('should set showPotentialEarning to false even if it was already false', () => {
      component.showPotentialEarning = false;
      component.goToIntegration();
      expect(component.showPotentialEarning).toBe(false);
    });
  });

  describe('goBackToYouTubeStep', () => {
    it('should call disconnectYouTube and gotoPreviousStep when youtube is connected', async () => {
      mockYouTubeOAuthService.getConnectionStatus.and.returnValue({ connected: true, error: null });
      await component.goBackToYouTubeStep();
      expect(mockYouTubeOAuthService.disconnectYouTube).toHaveBeenCalled();
      expect(mockOnboardingService.gotoPreviousStep).toHaveBeenCalled();
    });

    it('should call gotoPreviousStep without disconnecting when youtube is not connected', async () => {
      mockYouTubeOAuthService.getConnectionStatus.and.returnValue({ connected: false, error: null });
      await component.goBackToYouTubeStep();
      expect(mockYouTubeOAuthService.disconnectYouTube).not.toHaveBeenCalled();
      expect(mockOnboardingService.gotoPreviousStep).toHaveBeenCalled();
    });

    it('should still call gotoPreviousStep when disconnectYouTube throws', async () => {
      mockYouTubeOAuthService.getConnectionStatus.and.returnValue({ connected: true, error: null });
      mockYouTubeOAuthService.disconnectYouTube.and.returnValue(Promise.reject(new Error('fail')));
      await component.goBackToYouTubeStep();
      expect(mockOnboardingService.gotoPreviousStep).toHaveBeenCalled();
    });
  });

  describe('goBackToEstimator', () => {
    it('should call onboardingService.gotoPreviousStep', () => {
      component.goBackToEstimator();
      expect(mockOnboardingService.gotoPreviousStep).toHaveBeenCalled();
    });
  });

  describe('goBackToLogin', () => {
    it('should call authService.signOut with skipNavigation: true', async () => {
      mockAuthService.signOut.and.returnValue(Promise.resolve());
      await component.goBackToLogin();
      expect(mockAuthService.signOut).toHaveBeenCalledWith({ skipNavigation: true });
    });

    it('should handle signOut failure gracefully', async () => {
      mockAuthService.signOut.and.returnValue(Promise.reject(new Error('Sign out failed')));
      spyOn(console, 'error');
      await component.goBackToLogin();
      expect(console.error).toHaveBeenCalledWith('Failed to sign out:', jasmine.any(Error));
    });
  });

  describe('onShowEarningClick', () => {
    it('should set showPotentialEarning to true when event is true', () => {
      component.showPotentialEarning = false;
      component.onShowEarningClick(true);
      expect(component.showPotentialEarning).toBe(true);
    });

    it('should set showPotentialEarning to false when event is false', () => {
      component.showPotentialEarning = true;
      component.onShowEarningClick(false);
      expect(component.showPotentialEarning).toBe(false);
    });
  });

  describe('onCancelClick', () => {
    it('should decrement currentStep by 1', () => {
      mockOnboardingService.currentStep = 3;
      component.onCancelClick();
      expect(mockOnboardingService.currentStep).toBe(2);
    });

    it('should navigate to /cancellation', () => {
      mockOnboardingService.currentStep = 2;
      component.onCancelClick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cancellation']);
    });

    it('should both decrement step and navigate in the same call', () => {
      mockOnboardingService.currentStep = 4;
      component.onCancelClick();
      expect(mockOnboardingService.currentStep).toBe(3);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cancellation']);
    });
  });

  describe('acceptedTerms', () => {
    it('should set AcceptedTermsVersion to the event value', () => {
      component.acceptedTerms(5);
      expect(component.AcceptedTermsVersion).toBe(5);
    });

    it('should set AcceptedTermsVersion to 0 when event is 0', () => {
      component.AcceptedTermsVersion = 5;
      component.acceptedTerms(0);
      expect(component.AcceptedTermsVersion).toBe(0);
    });

    it('should overwrite previous AcceptedTermsVersion', () => {
      component.acceptedTerms(3);
      expect(component.AcceptedTermsVersion).toBe(3);
      component.acceptedTerms(7);
      expect(component.AcceptedTermsVersion).toBe(7);
    });
  });

  describe('acceptTermsContinue', () => {
    it('should call onboardingService.acceptTerms with AcceptedTermsVersion', () => {
      const acceptTermsResponse: AcceptTermsResponse = {
        success: true,
        message: 'Terms accepted',
        acceptedVersion: 3,
        acceptedAt: '2026-01-01T00:00:00Z',
      };
      mockOnboardingService.acceptTerms.and.returnValue(of(acceptTermsResponse));
      component.AcceptedTermsVersion = 3;

      component.acceptTermsContinue();

      expect(mockOnboardingService.acceptTerms).toHaveBeenCalledWith(3);
    });

    it('should increment currentStep when response.success is true', () => {
      const acceptTermsResponse: AcceptTermsResponse = {
        success: true,
        message: 'Terms accepted',
        acceptedVersion: 3,
        acceptedAt: '2026-01-01T00:00:00Z',
      };
      mockOnboardingService.acceptTerms.and.returnValue(of(acceptTermsResponse));
      mockOnboardingService.currentStep = 4;
      component.AcceptedTermsVersion = 3;

      component.acceptTermsContinue();

      expect(mockOnboardingService.currentStep).toBe(5);
    });

    it('should NOT increment currentStep when response.success is false', () => {
      const acceptTermsResponse: AcceptTermsResponse = {
        success: false,
        message: 'Failed to accept terms',
        acceptedVersion: 0,
        acceptedAt: '',
      };
      mockOnboardingService.acceptTerms.and.returnValue(of(acceptTermsResponse));
      mockOnboardingService.currentStep = 4;
      component.AcceptedTermsVersion = 3;

      component.acceptTermsContinue();

      expect(mockOnboardingService.currentStep).toBe(4);
    });

    it('should pass 0 to acceptTerms when AcceptedTermsVersion is 0', () => {
      const acceptTermsResponse: AcceptTermsResponse = {
        success: false,
        message: 'Invalid version',
        acceptedVersion: 0,
        acceptedAt: '',
      };
      mockOnboardingService.acceptTerms.and.returnValue(of(acceptTermsResponse));
      component.AcceptedTermsVersion = 0;

      component.acceptTermsContinue();

      expect(mockOnboardingService.acceptTerms).toHaveBeenCalledWith(0);
    });
  });

  describe('youtubeConnected getter', () => {
    it('should return true when youtube is connected', () => {
      mockYouTubeOAuthService.getConnectionStatus.and.returnValue({ connected: true, error: null });
      expect(component.youtubeConnected).toBe(true);
    });

    it('should return false when youtube is not connected', () => {
      mockYouTubeOAuthService.getConnectionStatus.and.returnValue({ connected: false, error: null });
      expect(component.youtubeConnected).toBe(false);
    });

    it('should return false when youtube has an error', () => {
      mockYouTubeOAuthService.getConnectionStatus.and.returnValue({ connected: false, error: 'failed' });
      expect(component.youtubeConnected).toBe(false);
    });
  });

  describe('selectedChannel getter', () => {
    it('should return null when no channel is selected', () => {
      expect(component.selectedChannel).toBeNull();
    });

    it('should return the selected channel when one is set', () => {
      const channel = { id: 'UC123', title: 'Test Channel', thumbnail: 'thumb.jpg', role: 'owner' as const, subscriberCount: 1000 };
      mockYouTubeOAuthService.selectedChannel = channel;
      expect(component.selectedChannel).toEqual(channel);
    });
  });

  describe('initial state', () => {
    it('should have showPotentialEarning as false', () => {
      expect(component.showPotentialEarning).toBe(false);
    });

    it('should have AcceptedTermsVersion as 0', () => {
      expect(component.AcceptedTermsVersion).toBe(0);
    });

    it('should have stepList with 5 steps', () => {
      expect(component.stepList.length).toBe(5);
    });

    it('should have correct step labels', () => {
      expect(component.stepList[0].label).toBe('Get Started');
      expect(component.stepList[1].label).toBe('YouTube Channel');
      expect(component.stepList[2].label).toBe('Estimator');
      expect(component.stepList[3].label).toBe('Integration');
      expect(component.stepList[4].label).toBe('Finish');
    });

    it('should have STEP enum mapped to ONBOARDING_STEPS', () => {
      expect(component.STEP).toBe(ONBOARDING_STEPS);
    });
  });
});
