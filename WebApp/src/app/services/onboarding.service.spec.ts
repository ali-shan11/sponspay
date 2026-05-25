import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { OnboardingService } from './onboarding.service';
import { YouTubeOAuthService } from './youtube-oauth.service';
import { environment } from '../../environments/environment';
import { ONBOARDING_STEPS } from '@utils/enums';
import { APP_ENDPOINTS } from '@utils/urls';
import { CreatorSignInResponse } from '@app-types/onboarding';
import { of } from 'rxjs';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let mockYouTubeOAuthService: jasmine.SpyObj<YouTubeOAuthService>;
  const BASE_URL = environment.API_BASE;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      events: of(),
      url: '/onboarding'
    });

    mockYouTubeOAuthService = jasmine.createSpyObj('YouTubeOAuthService', [
      'fetchAndSetChannelData',
      'getChannelMembersReportForChannel',
      'getCurrentChannelStatus',
      'setChannelStatus',
      'resetChannelState',
      'setConnectionStatus',
    ], {
      channelStatus$: of('unknown'),
      availableChannels$: of([]),
      selectedChannel: null,
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: YouTubeOAuthService, useValue: mockYouTubeOAuthService },
      ]
    });

    service = TestBed.inject(OnboardingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial values', () => {
    expect(service.currentStep).toBe(ONBOARDING_STEPS.GET_STARTED);
    expect(service.integrationStep).toBe(1);
    expect(service.youtubePayingUsersPercentage).toBe(0);
    expect(service.sponspayPayingUsersPercentage).toBe(0);
  });

  describe('gotoNextStep()', () => {
    it('should increment the current step by 1', () => {
      service.currentStep = ONBOARDING_STEPS.GET_STARTED;
      service.gotoNextStep();
      expect(service.currentStep as number).toBe(ONBOARDING_STEPS.YOUTUBE_CHANNEL as number);
    });

    it('should increment step multiple times', () => {
      service.currentStep = ONBOARDING_STEPS.GET_STARTED;
      service.gotoNextStep();
      service.gotoNextStep();
      expect(service.currentStep as number).toBe(ONBOARDING_STEPS.REVENUE_ESTIMATOR as number);
    });
  });

  describe('gotoPreviousStep()', () => {
    it('should decrement the current step by 1', () => {
      service.currentStep = ONBOARDING_STEPS.YOUTUBE_CHANNEL;
      service.gotoPreviousStep();
      expect(service.currentStep as number).toBe(ONBOARDING_STEPS.GET_STARTED as number);
    });
  });

  describe('checkTelegramHandleAvailability()', () => {
    it('should POST to the check-channel-availability endpoint', () => {
      const body = { handles: ['test_channel'] };
      const mockResponse = { taken: [] as string[] };

      service.checkTelegramHandleAvailability(body).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.CHECK_CHANNEL_AVAILABILITY);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should return taken handles when they exist', () => {
      const body = { handles: ['taken_channel'] };
      const mockResponse = { taken: ['taken_channel'] };

      service.checkTelegramHandleAvailability(body).subscribe(response => {
        expect(response.taken).toContain('taken_channel');
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.CHECK_CHANNEL_AVAILABILITY);
      req.flush(mockResponse);
    });
  });

  describe('getTermsHtml()', () => {
    it('should make a GET request to the terms/latest endpoint with loader context', () => {
      const mockResponse = {
        id: 'terms-1',
        version: 1,
        html: '<p>Terms and conditions</p>',
        createdAt: '2026-01-01T00:00:00Z'
      };

      service.getTermsHtml().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.TERMS_LATEST);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('acceptTerms()', () => {
    it('should POST to the accept-terms endpoint with the version', () => {
      const termsVersion = 2;
      const mockResponse = {
        success: true,
        message: 'Terms accepted',
        acceptedVersion: 2,
        acceptedAt: '2026-02-16T00:00:00Z'
      };

      service.acceptTerms(termsVersion).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.ACCEPT_TERMS);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ version: termsVersion });
      req.flush(mockResponse);
    });
  });

  describe('signInCreator()', () => {
    it('should POST to the sign-in-creator endpoint', () => {
      const body = {
        displayName: 'John Doe',
        email: 'john@example.com'
      };
      const mockResponse: CreatorSignInResponse = {
        success: true,
        message: 'Signed in',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: true
      };

      service.signInCreator(body).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.SIGN_IN_CREATOR);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });
  });

  describe('cancelOnboarding()', () => {
    it('should POST to the cancel-onboarding endpoint', () => {
      const body = { reason: 'Not interested', wantsUpdates: true };

      service.cancelOnboarding(body).subscribe();

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.CANCEL_ONBOARDING);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({});
    });
  });

  describe('getChannelInviteInfo()', () => {
    it('should make a GET request to the channel-invite-info endpoint', () => {
      const mockResponse = {
        channelHandle: 'test_channel',
        inviteLink: 'https://t.me/+abc123',
        channelId: 'ch-1',
        coAdminAdded: false
      };

      service.getChannelInviteInfo().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.CHANNEL_INVITE_INFO);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getCoAdminStatus()', () => {
    it('should make a GET request to the co-admin-status endpoint', () => {
      const mockResponse = {
        coAdminAdded: true,
        channelHandle: 'test_channel',
        channelId: 'ch-1',
        lastChecked: '2026-02-16T00:00:00Z'
      };

      service.getCoAdminStatus().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.CO_ADMIN_STATUS);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('propagateUser()', () => {
    it('should return early if data is null', () => {
      service.propagateUser(null);
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should return early if data is undefined', () => {
      service.propagateUser(undefined);
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to dashboard if user is creator and has accepted terms', () => {
      // navigateToDashboard checks if the current URL is in REDIRECT_TO_DASHBOARD_FROM
      // routerSpy.url is '/onboarding' which is in the list
      const data: CreatorSignInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: true,
        youtubeConnected: true
      };

      service.propagateUser(data);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['dashboard']);
    });

    it('should set step to YOUTUBE_CHANNEL and navigate to onboarding if not a creator and youtube not connected', () => {
      const data: CreatorSignInResponse = {
        success: true,
        message: 'OK',
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        youtubeConnected: false
      };

      service.propagateUser(data);
      expect(service.currentStep).toBe(ONBOARDING_STEPS.YOUTUBE_CHANNEL);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['onboarding']);
    });

    it('should set step to REVENUE_ESTIMATOR and navigate to onboarding if not a creator but youtube is connected', () => {
      const data: CreatorSignInResponse = {
        success: true,
        message: 'OK',
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        youtubeConnected: true
      };

      service.propagateUser(data);
      expect(service.currentStep).toBe(ONBOARDING_STEPS.REVENUE_ESTIMATOR);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['onboarding']);
    });

    it('should set step to INTEGRATION and integrationStep=2 if creator, not accepted terms, not co-admin', () => {
      const data: CreatorSignInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: false
      };

      service.propagateUser(data);
      expect(service.currentStep).toBe(ONBOARDING_STEPS.INTEGRATION);
      expect(service.integrationStep).toBe(2);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['onboarding']);
    });

    it('should set step to TERMS_CONDITIONS if creator, not accepted terms, and is co-admin', () => {
      const data: CreatorSignInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: false
      };

      service.propagateUser(data);
      expect(service.currentStep).toBe(ONBOARDING_STEPS.TERMS_CONDITIONS);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['onboarding']);
    });
  });

  describe('navigateToDashboard()', () => {
    it('should navigate to dashboard when current URL is in REDIRECT_TO_DASHBOARD_FROM', () => {
      // routerSpy.url is '/onboarding' which is in the list
      service.navigateToDashboard();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['dashboard']);
    });

    it('should NOT navigate if the current URL is not in REDIRECT_TO_DASHBOARD_FROM', () => {
      // Override the url property to return a URL that is NOT in the redirect list
      Object.defineProperty(routerSpy, 'url', { get: () => '/some-other-page' });

      service.navigateToDashboard();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should strip query params from URL before checking', () => {
      // '/onboarding?param=value' should be split at '?' and yield '/onboarding'
      Object.defineProperty(routerSpy, 'url', { get: () => '/onboarding?tab=1' });

      service.navigateToDashboard();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['dashboard']);
    });
  });

  describe('onBoardCreator()', () => {
    it('should return "No channel selected" when no channel is selected', () => {
      // selectedChannel is null by default from the mock
      service.onBoardCreator('test_handle', 10, 20).subscribe(response => {
        expect(response).toBe('No channel selected');
      });
    });

    it('should POST to the /creator/onboard endpoint when a channel is selected', () => {
      // Override selectedChannel on the mock via defineProperty since createSpyObj properties are accessors
      Object.defineProperty(mockYouTubeOAuthService, 'selectedChannel', { value: { id: 'channel-123', title: 'My Channel', thumbnail: '', role: 'owner', subscriberCount: 1000 }, writable: true });

      const mockResponse = {
        success: true,
        message: 'Onboarded',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        data: {
          userId: 'user-1',
          youtubeChannelId: 'channel-123',
          telegramChannelHandle: 'test_handle',
          role: 'creator'
        }
      };

      service.onBoardCreator('test_handle', 15, 25).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(BASE_URL + '/creator/onboard');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        youtubeChannelId: 'channel-123',
        telegramHandle: 'test_handle',
        youtubePayingUsersPercentage: 15,
        sponspayPayingUsersPercentage: 25
      });
      req.flush(mockResponse);
    });
  });

  describe('resetOnboarding()', () => {
    it('should reset all onboarding state to initial values', () => {
      // Set non-default values first
      service.currentStep = ONBOARDING_STEPS.TERMS_CONDITIONS;
      service.integrationStep = 3;
      service.youtubePayingUsersPercentage = 50;
      service.sponspayPayingUsersPercentage = 60;

      service.resetOnboarding();

      expect(service.currentStep as number).toBe(ONBOARDING_STEPS.GET_STARTED as number);
      expect(service.integrationStep).toBe(1);
      expect(service.youtubePayingUsersPercentage).toBe(0);
      expect(service.sponspayPayingUsersPercentage).toBe(0);
    });
  });
});
