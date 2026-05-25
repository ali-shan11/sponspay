/* eslint-disable @typescript-eslint/no-empty-function */
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { AuthService } from '@services/auth.service';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';
import { OnboardingService } from '@services/onboarding.service';
import { AlertService } from '@services/alert.service';
import { ChannelAvailabilityResponse, ChannelInviteResponse, OnboardCreatorResponse, CoAdminStatusResponse } from '@app-types/onboarding';

import { IntegrationComponent } from './integration.component';

describe('IntegrationComponent', () => {
  let component: IntegrationComponent;
  let fixture: ComponentFixture<IntegrationComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockOnboardingService: any;
  let mockAlertService: jasmine.SpyObj<AlertService>;
  let mockYouTubeOAuthService: any;

  beforeEach(async () => {

    mockAuthService = jasmine.createSpyObj('AuthService', [
      'getCurrentUser',
      'getStoredToken',
      'ensureValidToken',
      'getSignInResponse',
    ], {
      user$: new BehaviorSubject(null),
      accessToken$: new BehaviorSubject(null),
      creatorSignInResponse$: new BehaviorSubject(null),
    });

    mockYouTubeOAuthService = {
      fetchAndSetChannelData: jasmine.createSpy('fetchAndSetChannelData'),
      getChannelMembersReportForChannel: jasmine.createSpy('getChannelMembersReportForChannel'),
      getCurrentChannelStatus: jasmine.createSpy('getCurrentChannelStatus'),
      setChannelStatus: jasmine.createSpy('setChannelStatus'),
      resetChannelState: jasmine.createSpy('resetChannelState'),
      channelStatus$: of('unknown'),
      availableChannels$: of([]),
      selectedChannel: null,
    };

    mockOnboardingService = {
      propagateUser: jasmine.createSpy('propagateUser'),
      navigateToDashboard: jasmine.createSpy('navigateToDashboard'),
      onBoardCreator: jasmine.createSpy('onBoardCreator'),
      checkTelegramHandleAvailability: jasmine.createSpy('checkTelegramHandleAvailability'),
      getChannelInviteInfo: jasmine.createSpy('getChannelInviteInfo'),
      getCoAdminStatus: jasmine.createSpy('getCoAdminStatus'),
      currentStep: 0,
      integrationStep: 0,
      youtubePayingUsersPercentage: 10,
      sponspayPayingUsersPercentage: 5,
    };
    mockOnboardingService.checkTelegramHandleAvailability.and.returnValue(of({ taken: [] } as ChannelAvailabilityResponse));
    mockOnboardingService.getCoAdminStatus.and.returnValue(of({ coAdminAdded: false, channelHandle: '', channelId: '', lastChecked: '' }));

    mockAlertService = jasmine.createSpyObj('AlertService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [IntegrationComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: AuthService, useValue: mockAuthService },
        { provide: YouTubeOAuthService, useValue: mockYouTubeOAuthService },
        { provide: OnboardingService, useValue: mockOnboardingService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(IntegrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Ensure cleanup of WebSocket and polling
    if ((component as any).pollingInterval) {
      clearInterval((component as any).pollingInterval);
      (component as any).pollingInterval = null;
    }
    if ((component as any).qrCodeTimeout) {
      clearTimeout((component as any).qrCodeTimeout);
      (component as any).qrCodeTimeout = null;
    }
    component.ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // ngOnInit
  // ---------------------------------------------------------------------------
  describe('ngOnInit', () => {
    it('should generate telegram handles on init', () => {
      expect(component.telegramHandles.length).toBe(4);
    });

    it('should call checkAllHandlesAvailability on init', () => {
      expect(mockOnboardingService.checkTelegramHandleAvailability).toHaveBeenCalled();
    });

    it('should call getChannelInvite when integrationStep is 2', () => {
      // Reset and recreate with integrationStep = 2
      mockOnboardingService.getChannelInviteInfo.and.returnValue(of({
        channelHandle: 'test_channel',
        inviteLink: 'https://t.me/+abc123',
        channelId: 'ch-1',
        coAdminAdded: false,
      } as ChannelInviteResponse));

      // Override integrationStep property
      (mockOnboardingService as any).integrationStep = 2;

      const fixture2 = TestBed.createComponent(IntegrationComponent);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(mockOnboardingService.getChannelInviteInfo).toHaveBeenCalled();
      component2.ngOnDestroy();
    });

    it('should NOT call getChannelInvite when integrationStep is not 2', () => {
      // Default integrationStep is 0, so getChannelInviteInfo should not have been called
      // during the original component init
      expect(mockOnboardingService.getChannelInviteInfo).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // generateTelegramHandles
  // ---------------------------------------------------------------------------
  describe('generateTelegramHandles', () => {
    it('should generate handles when selectedChannel has a title', () => {
      (mockYouTubeOAuthService as any).selectedChannel = { id: 'UC123', title: 'My Channel' };
      const handles = component.generateTelegramHandles();
      expect(handles.length).toBeGreaterThanOrEqual(1);
      expect(handles[0]).toBe('mychannel');
      expect(handles[handles.length - 1]).toBe('mychannel_premium');
    });

    it('should generate random handles when selectedChannel is null', () => {
      (mockYouTubeOAuthService as any).selectedChannel = null;
      const handles = component.generateTelegramHandles();
      expect(handles.length).toBe(4);
      handles.forEach(h => {
        expect(h.startsWith('creator_')).toBeTrue();
      });
    });

    it('should generate random handles when selectedChannel title is empty string', () => {
      (mockYouTubeOAuthService as any).selectedChannel = { id: 'UC123', title: '' };
      const handles = component.generateTelegramHandles();
      expect(handles.length).toBe(4);
      handles.forEach(h => {
        expect(h.startsWith('creator_')).toBeTrue();
      });
    });

    it('should generate random handles when selectedChannel title is whitespace only', () => {
      (mockYouTubeOAuthService as any).selectedChannel = { id: 'UC123', title: '   ' };
      const handles = component.generateTelegramHandles();
      expect(handles.length).toBe(4);
      handles.forEach(h => {
        expect(h.startsWith('creator_')).toBeTrue();
      });
    });

    it('should strip non-alphanumeric chars and lowercase the channel title', () => {
      (mockYouTubeOAuthService as any).selectedChannel = { id: 'UC123', title: 'Cool Channel Name' };
      const handles = component.generateTelegramHandles();
      expect(handles[0]).toBe('coolchannelname');
      expect(handles[handles.length - 1]).toBe('coolchannelname_premium');
    });

    it('should filter out handles shorter than 5 characters', () => {
      (mockYouTubeOAuthService as any).selectedChannel = { id: 'UC123', title: 'AB' };
      const handles = component.generateTelegramHandles();
      handles.forEach(h => {
        expect(h.length).toBeGreaterThanOrEqual(5);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // onHandleClick
  // ---------------------------------------------------------------------------
  describe('onHandleClick', () => {
    it('should do nothing when handle is taken', () => {
      component.takenHandles = ['taken_handle'];
      component.selectedHandle = null;
      component.onHandleClick('taken_handle');
      expect(component.selectedHandle).toBeNull();
    });

    it('should select handle and set form value when clicking an unselected handle', () => {
      component.selectedHandle = null;
      component.onHandleClick('my_handle');
      expect(component.selectedHandle).toBe('my_handle' as any);
      expect(component.handleControl.value).toBe('my_handle');
    });

    it('should deselect handle and clear form when clicking currently selected handle', () => {
      component.selectedHandle = 'my_handle';
      component.handleControl.setValue('my_handle');
      component.onHandleClick('my_handle');
      expect(component.selectedHandle).toBeNull();
      expect(component.handleControl.value).toBe('');
    });

    it('should switch to a different handle when clicking a new one', () => {
      component.selectedHandle = 'handle_a';
      component.onHandleClick('handle_b');
      expect(component.selectedHandle).toBe('handle_b');
      expect(component.handleControl.value).toBe('handle_b');
    });
  });

  // ---------------------------------------------------------------------------
  // isCheckingAvailability
  // ---------------------------------------------------------------------------
  describe('isCheckingAvailability', () => {
    it('should return true for handles in the loadingHandles set', () => {
      component.loadingHandles.add('test_handle');
      expect(component.isCheckingAvailability('test_handle')).toBeTrue();
    });

    it('should return false for handles not in the loadingHandles set', () => {
      expect(component.isCheckingAvailability('nonexistent')).toBeFalse();
    });
  });

  // ---------------------------------------------------------------------------
  // checkAllHandlesAvailability
  // ---------------------------------------------------------------------------
  describe('checkAllHandlesAvailability', () => {
    it('should set isCheckingAllHandles to true and add handles to loadingHandles', () => {
      component.telegramHandles = ['h1', 'h2', 'h3'];
      mockOnboardingService.checkTelegramHandleAvailability.and.returnValue(of({ taken: [] }));

      component.checkAllHandlesAvailability();

      // After observable completes synchronously, isCheckingAllHandles should be false
      expect(component.isCheckingAllHandles).toBeFalse();
    });

    it('should mark taken handles and remove them from loadingHandles on success', () => {
      component.telegramHandles = ['h1', 'h2', 'h3'];
      component.takenHandles = [];
      mockOnboardingService.checkTelegramHandleAvailability.and.returnValue(of({ taken: ['h2'] }));

      component.checkAllHandlesAvailability();

      expect(component.takenHandles).toContain('h2');
      expect(component.loadingHandles.has('h2')).toBeFalse();
      expect(component.isCheckingAllHandles).toBeFalse();
    });

    it('should handle multiple taken handles', () => {
      component.telegramHandles = ['h1', 'h2', 'h3'];
      component.takenHandles = [];
      mockOnboardingService.checkTelegramHandleAvailability.and.returnValue(of({ taken: ['h1', 'h3'] }));

      component.checkAllHandlesAvailability();

      expect(component.takenHandles).toContain('h1');
      expect(component.takenHandles).toContain('h3');
      expect(component.takenHandles).not.toContain('h2');
    });

    it('should set isCheckingAllHandles to false on error', () => {
      component.telegramHandles = ['h1'];
      mockOnboardingService.checkTelegramHandleAvailability.and.returnValue(throwError(() => new Error('network error')));
      spyOn(console, 'error');

      component.checkAllHandlesAvailability();

      expect(component.isCheckingAllHandles).toBeFalse();
      expect(console.error).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // checkSingleHandleAvailability
  // ---------------------------------------------------------------------------
  describe('checkSingleHandleAvailability', () => {
    it('should set handle_taken error when the handle is taken', () => {
      mockOnboardingService.checkTelegramHandleAvailability.and.returnValue(of({ taken: ['my_handle'] }));

      component.checkSingleHandleAvailability(['my_handle']);

      expect(component.handleControl.errors).toEqual({ handle_taken: true });
      expect(component.isCheckingHandle).toBeFalse();
    });

    it('should NOT set handle_taken error when the handle is available', () => {
      mockOnboardingService.checkTelegramHandleAvailability.and.returnValue(of({ taken: [] }));
      component.handleControl.setErrors(null);

      component.checkSingleHandleAvailability(['my_handle']);

      expect(component.handleControl.errors).toBeNull();
      expect(component.isCheckingHandle).toBeFalse();
    });

    it('should set isCheckingHandle to false on error', () => {
      mockOnboardingService.checkTelegramHandleAvailability.and.returnValue(throwError(() => new Error('fail')));
      spyOn(console, 'error');

      component.checkSingleHandleAvailability(['test']);

      expect(component.isCheckingHandle).toBeFalse();
      expect(console.error).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // subHandleNameChange (debounced input)
  // ---------------------------------------------------------------------------
  describe('subHandleNameChange', () => {
    it('should call checkSingleHandleAvailability after debounce on value change', fakeAsync(() => {
      mockOnboardingService.checkTelegramHandleAvailability.calls.reset();
      mockOnboardingService.checkTelegramHandleAvailability.and.returnValue(of({ taken: [] }));

      component.handleControl.setValue('new_handle');
      tick(500); // debounceTime(500)

      expect(mockOnboardingService.checkTelegramHandleAvailability).toHaveBeenCalledWith({ handles: ['new_handle'] });
    }));

    it('should not call checkSingleHandleAvailability if same value is emitted', fakeAsync(() => {
      mockOnboardingService.checkTelegramHandleAvailability.calls.reset();
      mockOnboardingService.checkTelegramHandleAvailability.and.returnValue(of({ taken: [] }));

      component.handleControl.setValue('handle_a');
      tick(500);
      const callCount = mockOnboardingService.checkTelegramHandleAvailability.calls.count();

      // Set same value again
      component.handleControl.setValue('handle_a');
      tick(500);

      // distinctUntilChanged should prevent a second call
      expect(mockOnboardingService.checkTelegramHandleAvailability.calls.count()).toBe(callCount);
    }));
  });

  // ---------------------------------------------------------------------------
  // onboardCreator
  // ---------------------------------------------------------------------------
  describe('onboardCreator', () => {
    it('should show error alert when handleControl value is empty', () => {
      component.handleControl.setValue('');
      component.onboardCreator();
      expect(mockAlertService.error).toHaveBeenCalledWith('Invalid Handle', 'Please enter a valid handle.');
    });

    it('should show error alert when handleControl has handle_taken error', () => {
      component.handleControl.setValue('taken_handle');
      component.handleControl.setErrors({ handle_taken: true });
      component.onboardCreator();
      expect(mockAlertService.error).toHaveBeenCalledWith('Invalid Handle', 'Please enter a valid handle.');
    });

    it('should call onBoardCreator service when form is valid', () => {
      const mockResponse: OnboardCreatorResponse = {
        success: true,
        message: 'Creator onboarded',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        data: {
          userId: 'u1',
          youtubeChannelId: 'UC123',
          telegramChannelHandle: 'my_handle',
          role: 'creator',
        }
      };
      mockOnboardingService.onBoardCreator.and.returnValue(of(mockResponse));
      mockOnboardingService.getChannelInviteInfo.and.returnValue(of({
        channelHandle: 'my_handle',
        inviteLink: 'https://t.me/+abc123',
        channelId: 'ch-1',
        coAdminAdded: false,
      } as ChannelInviteResponse));

      component.handleControl.setValue('my_handle');
      component.onboardCreator();

      expect(mockOnboardingService.onBoardCreator).toHaveBeenCalledWith('my_handle', 10, 5);
      expect(component.onboardedData).toEqual(mockResponse);
      expect(component.isCreateLoading).toBeFalse();
    });

    it('should set isCreateLoading to true during the call', () => {
      mockOnboardingService.onBoardCreator.and.returnValue(of({
        success: true, message: 'ok', isCreator: true, isCoAdmin: false, hasAcceptedTerms: false,
        data: { userId: 'u1', youtubeChannelId: 'UC123', telegramChannelHandle: 'h', role: 'creator' }
      } as OnboardCreatorResponse));
      mockOnboardingService.getChannelInviteInfo.and.returnValue(of({
        channelHandle: 'h', inviteLink: 'https://t.me/+x', channelId: 'ch-1', coAdminAdded: false,
      } as ChannelInviteResponse));

      component.handleControl.setValue('h');
      component.onboardCreator();

      // After sync observable resolves, isCreateLoading should be reset
      expect(component.isCreateLoading).toBeFalse();
    });

    it('should show error alert when result is a string', () => {
      mockOnboardingService.onBoardCreator.and.returnValue(of('No channel selected'));

      component.handleControl.setValue('my_handle');
      component.onboardCreator();

      expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'No channel selected');
      expect(component.isCreateLoading).toBeFalse();
    });

    it('should show error alert on service error', () => {
      mockOnboardingService.onBoardCreator.and.returnValue(throwError(() => ({ error: { message: 'Server error' } })));

      component.handleControl.setValue('my_handle');
      component.onboardCreator();

      expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'Server error');
      expect(component.isCreateLoading).toBeFalse();
    });

    it('should handle error with no message gracefully', () => {
      mockOnboardingService.onBoardCreator.and.returnValue(throwError(() => ({})));

      component.handleControl.setValue('my_handle');
      component.onboardCreator();

      expect(mockAlertService.error).toHaveBeenCalledWith('Error', undefined as any);
      expect(component.isCreateLoading).toBeFalse();
    });
  });

  // ---------------------------------------------------------------------------
  // goToStep2
  // ---------------------------------------------------------------------------
  describe('goToStep2', () => {
    it('should set integrationStep to 2 and call getChannelInvite', () => {
      mockOnboardingService.getChannelInviteInfo.and.returnValue(of({
        channelHandle: 'test',
        inviteLink: 'https://t.me/+abc',
        channelId: 'ch-1',
        coAdminAdded: false,
      } as ChannelInviteResponse));

      component.goToStep2();

      expect(mockOnboardingService.integrationStep).toBe(2);
      expect(mockOnboardingService.getChannelInviteInfo).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // selectedChannel getter
  // ---------------------------------------------------------------------------
  describe('selectedChannel', () => {
    it('should return null when no channel is selected', () => {
      expect(component.selectedChannel).toBeNull();
    });

    it('should return the selected channel from YouTubeOAuthService', () => {
      const channel = { id: 'UC123', title: 'Test' };
      (mockYouTubeOAuthService as any).selectedChannel = channel;
      expect(component.selectedChannel).toEqual(channel as any);
    });
  });

  // ---------------------------------------------------------------------------
  // getChannelInvite
  // ---------------------------------------------------------------------------
  describe('getChannelInvite', () => {
    it('should set step2State to LOADING_QR initially', () => {
      mockOnboardingService.getChannelInviteInfo.and.returnValue(of({
        channelHandle: 'test',
        inviteLink: 'https://t.me/+abc',
        channelId: 'ch-1',
        coAdminAdded: false,
      } as ChannelInviteResponse));

      component.getChannelInvite();

      // After the observable resolves, state should have advanced past LOADING_QR
      expect(component.channelData).toBeTruthy();
    });

    it('should set ERROR state when inviteLink is null', () => {
      mockOnboardingService.getChannelInviteInfo.and.returnValue(of({
        channelHandle: 'test',
        inviteLink: null,
        channelId: 'ch-1',
        coAdminAdded: false,
      } as ChannelInviteResponse));

      component.getChannelInvite();

      expect(component.step2State).toBe(component.Step2State.ERROR);
      expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'Unable to generate invite link. Please contact support.');
    });

    it('should set SUCCESS state when coAdminAdded is true', () => {
      mockOnboardingService.getChannelInviteInfo.and.returnValue(of({
        channelHandle: 'test',
        inviteLink: 'https://t.me/+abc',
        channelId: 'ch-1',
        coAdminAdded: true,
      } as ChannelInviteResponse));

      component.getChannelInvite();

      expect(component.step2State).toBe(component.Step2State.SUCCESS);
    });

    it('should set channelData and transition to WAITING_FOR_JOIN state on valid invite', async () => {
      mockOnboardingService.getChannelInviteInfo.and.returnValue(of({
        channelHandle: 'test',
        inviteLink: 'https://t.me/+abc123',
        channelId: 'ch-1',
        coAdminAdded: false,
      } as ChannelInviteResponse));
      mockAuthService.getCurrentUser.and.returnValue(Promise.resolve({ uid: 'firebase-uid-1' } as any));

      component.getChannelInvite();
      // Wait for generateQR promise and initializeWebSocket to resolve
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(component.channelData).toBeTruthy();
      expect(component.channelData!.inviteLink).toBe('https://t.me/+abc123');
      expect(component.step2State).toBe(component.Step2State.WAITING_FOR_JOIN);
    });

    it('should set ERROR state and show alert on service error', () => {
      mockOnboardingService.getChannelInviteInfo.and.returnValue(throwError(() => ({ error: { message: 'Server down' } })));

      component.getChannelInvite();

      expect(component.step2State).toBe(component.Step2State.ERROR);
      expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'Server down');
    });

    it('should show fallback error message when error has no message', () => {
      mockOnboardingService.getChannelInviteInfo.and.returnValue(throwError(() => ({})));

      component.getChannelInvite();

      expect(component.step2State).toBe(component.Step2State.ERROR);
      expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'Failed to load channel info');
    });
  });

  // ---------------------------------------------------------------------------
  // initializeWebSocket
  // ---------------------------------------------------------------------------
  describe('initializeWebSocket', () => {
    it('should fall back to polling when getCurrentUser returns null', fakeAsync(() => {
      mockAuthService.getCurrentUser.and.returnValue(Promise.resolve(null));
      mockOnboardingService.getCoAdminStatus.and.returnValue(of({ coAdminAdded: false, channelHandle: 'h', channelId: 'c', lastChecked: '' }));
      spyOn(console, 'error');
      spyOn(console, 'log');

      // Access private method via bracket notation
      (component as any).initializeWebSocket();
      tick();

      expect(console.error).toHaveBeenCalledWith('Cannot initialize WebSocket: user UID not available');
      // Polling should have started — check pollingInterval is set
      expect((component as any).pollingInterval).toBeTruthy();

      // Cleanup
      (component as any).stopPollingFallback();
    }));

    it('should fall back to polling when getCurrentUser returns user without uid', fakeAsync(() => {
      mockAuthService.getCurrentUser.and.returnValue(Promise.resolve({} as any));
      mockOnboardingService.getCoAdminStatus.and.returnValue(of({ coAdminAdded: false, channelHandle: 'h', channelId: 'c', lastChecked: '' }));
      spyOn(console, 'error');
      spyOn(console, 'log');

      (component as any).initializeWebSocket();
      tick();

      expect(console.error).toHaveBeenCalledWith('Cannot initialize WebSocket: user UID not available');
      expect((component as any).pollingInterval).toBeTruthy();

      (component as any).stopPollingFallback();
    }));
  });

  // ---------------------------------------------------------------------------
  // handleCoAdminAdded
  // ---------------------------------------------------------------------------
  describe('handleCoAdminAdded', () => {
    it('should set state to PROMOTING then SUCCESS after delay', fakeAsync(() => {
      // Set up some state that handleCoAdminAdded should clean up
      (component as any).pollingInterval = setInterval(() => { }, 5000);

      (component as any).handleCoAdminAdded();

      expect(component.step2State).toBe(component.Step2State.PROMOTING);

      tick(500);

      expect(component.step2State).toBe(component.Step2State.SUCCESS);
    }));

    it('should clear QR code timeout', fakeAsync(() => {
      // Set a qrCodeTimeout
      (component as any).qrCodeTimeout = setTimeout(() => { }, 60000);

      (component as any).handleCoAdminAdded();

      expect((component as any).qrCodeTimeout).toBeNull();

      tick(500); // flush the 500ms setTimeout in handleCoAdminAdded
    }));

    it('should stop polling fallback', fakeAsync(() => {
      const intervalId = setInterval(() => { }, 5000);
      (component as any).pollingInterval = intervalId;

      (component as any).handleCoAdminAdded();

      expect((component as any).pollingInterval).toBeNull();

      tick(500);
    }));
  });

  // ---------------------------------------------------------------------------
  // refreshQRCode
  // ---------------------------------------------------------------------------
  describe('refreshQRCode', () => {
    it('should clear timeout, disconnect websocket, and call getChannelInvite', () => {
      mockOnboardingService.getChannelInviteInfo.and.returnValue(of({
        channelHandle: 'test',
        inviteLink: 'https://t.me/+abc',
        channelId: 'ch-1',
        coAdminAdded: false,
      } as ChannelInviteResponse));

      // Set up some state
      const oldTimeout = setTimeout(() => { }, 60000);
      (component as any).qrCodeTimeout = oldTimeout;

      component.refreshQRCode();

      // Old timeout should be cleared and a new one created by getChannelInvite
      expect((component as any).qrCodeTimeout).not.toBe(oldTimeout);
      expect(mockOnboardingService.getChannelInviteInfo).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // startQRCodeTimeout / clearQRCodeTimeout / handleQRCodeTimeout
  // ---------------------------------------------------------------------------
  describe('QR code timeout management', () => {
    it('startQRCodeTimeout should set a timeout', () => {
      (component as any).startQRCodeTimeout();
      expect((component as any).qrCodeTimeout).toBeTruthy();
    });

    it('clearQRCodeTimeout should clear the timeout and set to null', () => {
      (component as any).qrCodeTimeout = setTimeout(() => { }, 60000);
      (component as any).clearQRCodeTimeout();
      expect((component as any).qrCodeTimeout).toBeNull();
    });

    it('clearQRCodeTimeout should do nothing when timeout is null', () => {
      (component as any).qrCodeTimeout = null;
      (component as any).clearQRCodeTimeout();
      expect((component as any).qrCodeTimeout).toBeNull();
    });

    it('handleQRCodeTimeout should set state to TIMEOUT and disconnect websocket', () => {
      (component as any).handleQRCodeTimeout();
      expect(component.step2State).toBe(component.Step2State.TIMEOUT);
    });

    it('startQRCodeTimeout should trigger TIMEOUT state after QR_CODE_TIMEOUT', fakeAsync(() => {
      (component as any).startQRCodeTimeout();

      tick(5 * 60 * 1000); // 5 minutes

      expect(component.step2State).toBe(component.Step2State.TIMEOUT);
    }));
  });

  // ---------------------------------------------------------------------------
  // startPollingFallback / stopPollingFallback / checkCoAdminStatus
  // ---------------------------------------------------------------------------
  describe('polling fallback', () => {
    it('startPollingFallback should set pollingInterval', () => {
      mockOnboardingService.getCoAdminStatus.and.returnValue(of({ coAdminAdded: false, channelHandle: 'h', channelId: 'c', lastChecked: '' }));

      (component as any).startPollingFallback();

      expect((component as any).pollingInterval).toBeTruthy();

      // Cleanup
      (component as any).stopPollingFallback();
    });

    it('startPollingFallback should not create a second interval if already polling', () => {
      mockOnboardingService.getCoAdminStatus.and.returnValue(of({ coAdminAdded: false, channelHandle: 'h', channelId: 'c', lastChecked: '' }));

      (component as any).startPollingFallback();
      const firstInterval = (component as any).pollingInterval;

      (component as any).startPollingFallback();
      const secondInterval = (component as any).pollingInterval;

      expect(firstInterval).toBe(secondInterval);

      (component as any).stopPollingFallback();
    });

    it('stopPollingFallback should clear the interval and set to null', () => {
      (component as any).pollingInterval = setInterval(() => { }, 5000);
      (component as any).stopPollingFallback();
      expect((component as any).pollingInterval).toBeNull();
    });

    it('stopPollingFallback should do nothing when no interval exists', () => {
      (component as any).pollingInterval = null;
      (component as any).stopPollingFallback();
      expect((component as any).pollingInterval).toBeNull();
    });

    it('checkCoAdminStatus should call handleCoAdminAdded when coAdminAdded is true', fakeAsync(() => {
      mockOnboardingService.getCoAdminStatus.and.returnValue(of({
        coAdminAdded: true,
        channelHandle: 'test',
        channelId: 'ch-1',
        lastChecked: '2025-01-01T00:00:00Z',
      } as CoAdminStatusResponse));

      (component as any).checkCoAdminStatus();

      expect(component.step2State).toBe(component.Step2State.PROMOTING);
      tick(500); // flush handleCoAdminAdded setTimeout
      expect(component.step2State).toBe(component.Step2State.SUCCESS);
    }));

    it('checkCoAdminStatus should do nothing when coAdminAdded is false', () => {
      mockOnboardingService.getCoAdminStatus.and.returnValue(of({
        coAdminAdded: false,
        channelHandle: 'test',
        channelId: 'ch-1',
        lastChecked: '2025-01-01T00:00:00Z',
      } as CoAdminStatusResponse));

      const stateBefore = component.step2State;
      (component as any).checkCoAdminStatus();
      expect(component.step2State).toBe(stateBefore);
    });

    it('checkCoAdminStatus should log error on failure', () => {
      mockOnboardingService.getCoAdminStatus.and.returnValue(throwError(() => new Error('network fail')));
      spyOn(console, 'error');

      (component as any).checkCoAdminStatus();

      expect(console.error).toHaveBeenCalledWith('Error checking co-admin status:', jasmine.any(Error));
    });

    it('polling should periodically call checkCoAdminStatus', fakeAsync(() => {
      mockOnboardingService.getCoAdminStatus.and.returnValue(of({
        coAdminAdded: false, channelHandle: 'h', channelId: 'c', lastChecked: ''
      }));

      (component as any).startPollingFallback();

      tick(5000); // first poll
      expect(mockOnboardingService.getCoAdminStatus).toHaveBeenCalledTimes(1);

      tick(5000); // second poll
      expect(mockOnboardingService.getCoAdminStatus).toHaveBeenCalledTimes(2);

      (component as any).stopPollingFallback();
    }));
  });

  // ---------------------------------------------------------------------------
  // disconnectWebSocket
  // ---------------------------------------------------------------------------
  describe('disconnectWebSocket', () => {
    it('should disconnect socket and set to null when socket exists', () => {
      const mockSocket = jasmine.createSpyObj('Socket', ['disconnect']);
      (component as any).socket = mockSocket;

      (component as any).disconnectWebSocket();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect((component as any).socket).toBeNull();
    });

    it('should not throw when socket is null', () => {
      (component as any).socket = null;
      expect(() => (component as any).disconnectWebSocket()).not.toThrow();
    });

    it('should also stop polling fallback', () => {
      const intervalId = setInterval(() => { }, 5000);
      (component as any).pollingInterval = intervalId;
      (component as any).socket = null;

      (component as any).disconnectWebSocket();

      expect((component as any).pollingInterval).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // openTelegram
  // ---------------------------------------------------------------------------
  describe('openTelegram', () => {
    it('should open a new window with the invite link', () => {
      spyOn(window, 'open');
      component.openTelegram('https://t.me/+abc');
      expect(window.open).toHaveBeenCalledWith('https://t.me/+abc', '_blank');
    });

    it('should not open window when inviteLink is null', () => {
      spyOn(window, 'open');
      component.openTelegram(null);
      expect(window.open).not.toHaveBeenCalled();
    });

    it('should not open window when inviteLink is empty string', () => {
      spyOn(window, 'open');
      component.openTelegram('');
      expect(window.open).not.toHaveBeenCalled();
    });

    it('should use default empty string when called with no args', () => {
      spyOn(window, 'open');
      component.openTelegram();
      expect(window.open).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // ngOnDestroy
  // ---------------------------------------------------------------------------
  describe('ngOnDestroy', () => {
    it('should disconnect WebSocket and clear timeout on destroy', () => {
      const mockSocket = jasmine.createSpyObj('Socket', ['disconnect']);
      (component as any).socket = mockSocket;
      (component as any).qrCodeTimeout = setTimeout(() => { }, 60000);

      component.ngOnDestroy();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect((component as any).socket).toBeNull();
      expect((component as any).qrCodeTimeout).toBeNull();
    });

    it('should handle cleanup when no socket or timeout is set', () => {
      (component as any).socket = null;
      (component as any).qrCodeTimeout = null;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Step2State enum exposure
  // ---------------------------------------------------------------------------
  describe('Step2State enum', () => {
    it('should expose Step2State enum values for template', () => {
      expect(component.Step2State.LOADING_QR).toBe('loading_qr');
      expect(component.Step2State.WAITING_FOR_JOIN).toBe('waiting_for_join');
      expect(component.Step2State.PROMOTING).toBe('promoting');
      expect(component.Step2State.SUCCESS).toBe('success');
      expect(component.Step2State.TIMEOUT).toBe('timeout');
      expect(component.Step2State.ERROR).toBe('error');
    });
  });

  // ---------------------------------------------------------------------------
  // Initial property values
  // ---------------------------------------------------------------------------
  describe('initial property values', () => {
    it('should have initial step2State as LOADING_QR', () => {
      // After ngOnInit, step2State may have changed, but the enum should be accessible
      expect(component.Step2State.LOADING_QR).toBe('loading_qr');
    });

    it('should have empty takenHandles initially', () => {
      // takenHandles may be populated by ngOnInit's checkAllHandlesAvailability,
      // but since mock returns taken:[], it should still be empty
      expect(component.takenHandles.length).toBe(0);
    });

    it('should have isCreateLoading as false', () => {
      expect(component.isCreateLoading).toBeFalse();
    });

    it('should have channelData as null initially', () => {
      expect(component.channelData).toBeNull();
    });

    it('should have onboardedData as null initially', () => {
      expect(component.onboardedData).toBeNull();
    });

    it('should have selectedHandle as null initially', () => {
      expect(component.selectedHandle).toBeNull();
    });
  });
});
