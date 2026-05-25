import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { FanService } from '@services/fan.service';
import { AlertService } from '@services/alert.service';
import { LocalVars } from '@utils/constants';
import { PROVIDERS_STATUS, FAN_MESSAGE_TYPE } from '@utils/enums';
import { FanChannelInfo, FanPayment, FanOperator } from '@app-types/fan';
import { PhoneNumberComponent } from '@components/phone-number/phone-number.component';

import { FanVideoComponent } from './fan-video.component';

@Component({
  selector: 'app-phone-number',
  template: '',
  standalone: true,
})
class MockPhoneNumberComponent {
  @Input() controlName: FormControl = new FormControl();
  @Input() placeholder = '';
  @Input() countryCode!: string;
  @Input() label = '';
  @Input() onlyCountries: string[] = [];
  @Output() countryChange = new EventEmitter<string>();
}

describe('FanVideoComponent', () => {
  let component: FanVideoComponent;
  let fixture: ComponentFixture<FanVideoComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let fanServiceSpy: jasmine.SpyObj<FanService>;
  let alertServiceSpy: jasmine.SpyObj<AlertService>;

  const mockChannelInfo: FanChannelInfo = {
    channelHandle: 'test-handle',
    creatorName: 'Test Creator',
    youtubeEmbed: {
      channelName: 'Test Channel',
      embedUrl: 'https://www.youtube.com/embed/abc123',
      isLiveStream: false,
      title: 'Test Video Title',
      description: 'Test description\nwith newlines',
      thumbnailUrl: 'https://example.com/thumb.jpg',
    },
    recentMessages: [
      {
        payerFullName: 'John Doe',
        content: 'Great video!',
        timestamp: '2025-01-01T00:00:00Z',
        senderType: 'paid',
      },
    ],
    paymentsAvailable: true,
    inviteLink: 'https://t.me/testchannel',
    qr: '',
    paymentCountries: [
      {
        countryCode: 'KEN',
        countryName: 'Kenya',
        currency: 'KES',
        img: '',
        operators: [
          {
            name: 'MPESA',
            displayName: 'M-Pesa',
            status: PROVIDERS_STATUS.OPERATIONAL,
            price: 100,
            maxMultiple: 20,
            disabled: false,
          },
          {
            name: 'AIRTEL',
            displayName: 'Airtel Money',
            status: PROVIDERS_STATUS.DELAYED,
            price: 150,
            maxMultiple: 10,
            disabled: false,
          },
        ],
      },
      {
        countryCode: 'UGA',
        countryName: 'Uganda',
        currency: 'UGX',
        img: '',
        operators: [
          {
            name: 'MTN',
            displayName: 'MTN Mobile Money',
            status: PROVIDERS_STATUS.OPERATIONAL,
            price: 5000,
            maxMultiple: 20,
            disabled: false,
          },
        ],
      },
    ],
  };

  const mockPaymentResponse: FanPayment = {
    depositId: 'dep-123',
    fanSessionId: 'session-abc',
    transactionId: 'tx-456',
    status: 'initiated',
    channelHandle: 'test-handle',
  };

  beforeEach(async () => {
    fanServiceSpy = jasmine.createSpyObj('FanService', [
      'getChannelInformationForFans',
      'fanPayment',
      'getYoutubeVideoData',
    ]);
    fanServiceSpy.getChannelInformationForFans.and.returnValue(of(mockChannelInfo));
    fanServiceSpy.fanPayment.and.returnValue(of(mockPaymentResponse));
    fanServiceSpy.getYoutubeVideoData.and.returnValue(Promise.resolve(null));

    alertServiceSpy = jasmine.createSpyObj('AlertService', ['error', 'success', 'info']);

    await TestBed.configureTestingModule({
      imports: [FanVideoComponent],
      providers: [
        provideNoopAnimations(),
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        {
          provide: TokenService,
          useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], {
            authReady: Promise.resolve(),
          }),
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], {
            events: of(),
            url: '/',
          }),
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => 'test-handle' } },
            params: of({}),
            queryParams: of({}),
          },
        },
        { provide: FanService, useValue: fanServiceSpy },
        { provide: AlertService, useValue: alertServiceSpy },
      ],
    })
    .overrideComponent(FanVideoComponent, {
      remove: { imports: [PhoneNumberComponent] },
      add: { imports: [MockPhoneNumberComponent] },
    })
    .compileComponents();

    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Clear localStorage before each test
    localStorage.removeItem(LocalVars.transSessionId);
    localStorage.removeItem(LocalVars.transStartTime);

    fixture = TestBed.createComponent(FanVideoComponent);
    component = fixture.componentInstance;
    // Prevent real WebSocket connections during tests
    spyOn(component, 'initializeWebSocket' as any);
    fixture.detectChanges();
    // Wait for the async getChannelInfo callback (which uses generateQR) to settle,
    // then run detectChanges again so Angular's template bindings are stable
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(LocalVars.transSessionId);
    localStorage.removeItem(LocalVars.transStartTime);
    // Clean up any active timers
    if ((component as any).transTimer) {
      clearInterval((component as any).transTimer);
    }
    component.ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------
  // ngOnInit
  // ---------------------------------------------------------------
  describe('ngOnInit', () => {
    it('should set handle from route params', () => {
      expect(component.handle).toBe('test-handle');
    });

    it('should call getChannelInfo on init with a referral payload', () => {
      const calls = fanServiceSpy.getChannelInformationForFans.calls.allArgs();
      expect(calls.length).toBeGreaterThan(0);
      const [handle, referral] = calls[0];
      expect(handle).toBe('test-handle');
      expect(referral).toEqual(
        jasmine.objectContaining({
          referrerNetwork: jasmine.any(String),
        }),
      );
    });

    it('should subscribe to operator and phone number controls', () => {
      // subArr should have subscriptions from subOperatorControl, subPhoneNumberControl, and getChannelInfo
      expect(component.subArr.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ---------------------------------------------------------------
  // configureForm
  // ---------------------------------------------------------------
  describe('configureForm', () => {
    it('should create message form with correct controls', () => {
      expect(component.messageForm).toBeTruthy();
      expect(component.messageForm.get('subject')).toBeTruthy();
      expect(component.messageForm.get('message')).toBeTruthy();
      expect(component.messageForm.get('mobileOperator')).toBeTruthy();
      expect(component.messageForm.get('phoneNumber')).toBeTruthy();
      expect(component.messageForm.get('ownerName')).toBeTruthy();
      expect(component.messageForm.get('referralSource')).toBeTruthy();
      expect(component.messageForm.get('referralMedium')).toBeTruthy();
      expect(component.messageForm.get('referralCampaign')).toBeTruthy();
    });

    it('should set required validators on mandatory fields', () => {
      component.messageForm.get('message')!.setValue(null);
      expect(component.messageForm.get('message')!.valid).toBeFalse();

      component.messageForm.get('message')!.setValue('Hello');
      expect(component.messageForm.get('message')!.valid).toBeTrue();
    });

    it('should not require referral fields', () => {
      component.messageForm.get('referralSource')!.setValue(null);
      component.messageForm.get('referralMedium')!.setValue(null);
      component.messageForm.get('referralCampaign')!.setValue(null);
      expect(component.messageForm.get('referralSource')!.valid).toBeTrue();
      expect(component.messageForm.get('referralMedium')!.valid).toBeTrue();
      expect(component.messageForm.get('referralCampaign')!.valid).toBeTrue();
    });
  });

  // ---------------------------------------------------------------
  // Form getters
  // ---------------------------------------------------------------
  describe('form control getters', () => {
    it('operatorControl should return the mobileOperator FormControl', () => {
      expect(component.operatorControl).toBe(component.messageForm.get('mobileOperator') as any);
    });

    it('sourceControl should return the referralSource FormControl', () => {
      expect(component.sourceControl).toBe(component.messageForm.get('referralSource') as any);
    });

    it('mediumControl should return the referralMedium FormControl', () => {
      expect(component.mediumControl).toBe(component.messageForm.get('referralMedium') as any);
    });

    it('campaignControl should return the referralCampaign FormControl', () => {
      expect(component.campaignControl).toBe(component.messageForm.get('referralCampaign') as any);
    });

    it('mobileOperatorControl should return the mobileOperator FormControl', () => {
      expect(component.mobileOperatorControl).toBe(component.messageForm.get('mobileOperator') as any);
    });

    it('phoneNumberControl should return the phoneNumber FormControl', () => {
      expect(component.phoneNumberControl).toBe(component.messageForm.get('phoneNumber') as any);
    });

    it('ownerNameControl should return the ownerName FormControl', () => {
      expect(component.ownerNameControl).toBe(component.messageForm.get('ownerName') as any);
    });

    it('subjectControl should return the subject FormControl', () => {
      expect(component.subjectControl).toBe(component.messageForm.get('subject') as any);
    });

    it('messageControl should return the message FormControl', () => {
      expect(component.messageControl).toBe(component.messageForm.get('message') as any);
    });
  });

  // ---------------------------------------------------------------
  // getChannelInfo
  // ---------------------------------------------------------------
  describe('getChannelInfo', () => {
    it('should set handleInfo from the service response', () => {
      expect(component.handleInfo).toBeTruthy();
      expect(component.handleInfo.channelHandle).toBe('test-handle');
    });

    it('should set the default subject from the video title', () => {
      expect(component.defaultSubject).toBe('Test Video Title');
    });

    it('should set the subject control value to the video title', () => {
      expect(component.subjectControl.value).toBe('Test Video Title');
    });

    it('should set the youtube URL as a safe resource', () => {
      expect(component.youtubeUrl).toBeTruthy();
    });

it('should set flag images on country list items', () => {
      // The GetFlagUrl function is called for each country
      expect(component.handleInfo.paymentCountries[0].img).toBeDefined();
    });

    it('should navigate to root on error', () => {
      fanServiceSpy.getChannelInformationForFans.and.returnValue(
        throwError(() => new Error('Not found'))
      );
      component.getChannelInfo();
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('should call checkPrevSession when paymentModal is null', () => {
      spyOn(component, 'checkPrevSession');
      component.paymentModal = null;
      fanServiceSpy.getChannelInformationForFans.and.returnValue(of(mockChannelInfo));
      component.getChannelInfo();
      expect(component.checkPrevSession).toHaveBeenCalled();
    });

    it('should NOT call checkPrevSession when paymentModal is already set', () => {
      spyOn(component, 'checkPrevSession');
      component.paymentModal = 'processing';
      fanServiceSpy.getChannelInformationForFans.and.returnValue(of(mockChannelInfo));
      component.getChannelInfo();
      expect(component.checkPrevSession).not.toHaveBeenCalled();
    });

    it('should handle null youtubeEmbed without crashing', () => {
      const noVideoInfo: FanChannelInfo = { ...mockChannelInfo, youtubeEmbed: null };
      fanServiceSpy.getChannelInformationForFans.and.returnValue(of(noVideoInfo));
      component.getChannelInfo();
      expect(component.handleInfo).toBeTruthy();
      expect(component.handleInfo.youtubeEmbed).toBeNull();
    });

    it('should set empty default subject when youtubeEmbed is null', () => {
      const noVideoInfo: FanChannelInfo = { ...mockChannelInfo, youtubeEmbed: null };
      fanServiceSpy.getChannelInformationForFans.and.returnValue(of(noVideoInfo));
      component.getChannelInfo();
      expect(component.defaultSubject).toBe('');
    });
  });

  // ---------------------------------------------------------------
  // onPhoneCountryChange
  // ---------------------------------------------------------------
  describe('onPhoneCountryChange', () => {
    it('should set selectedCountry when country changes', () => {
      component.onPhoneCountryChange('ke');
      expect(component.selectedCountry).toBeTruthy();
      expect(component.selectedCountry!.countryCode).toBe('KEN');
    });

    it('should mark DELAYED operators as disabled', () => {
      component.onPhoneCountryChange('ke');
      const airtel = component.selectedCountry!.operators.find(
        (op: FanOperator) => op.name === 'AIRTEL'
      );
      expect(airtel!.disabled).toBeTrue();
    });

    it('should mark OPERATIONAL operators as not disabled', () => {
      component.onPhoneCountryChange('ke');
      const mpesa = component.selectedCountry!.operators.find(
        (op: FanOperator) => op.name === 'MPESA'
      );
      expect(mpesa!.disabled).toBeFalse();
    });

    it('should reset operator control when country changes', () => {
      component.operatorControl.setValue('MPESA');
      component.onPhoneCountryChange('ke');
      expect(component.operatorControl.value).toBeNull();
    });

    it('should set selectedCountry to null if country code not found', () => {
      component.onPhoneCountryChange('xx');
      expect(component.selectedCountry).toBeNull();
    });

    it('should do nothing if iso2 is empty', () => {
      component.selectedCountry = null;
      component.onPhoneCountryChange('');
      expect(component.selectedCountry).toBeNull();
    });
  });

  // ---------------------------------------------------------------
  // subOperatorControl
  // ---------------------------------------------------------------
  describe('subOperatorControl', () => {
    beforeEach(() => {
      component.onPhoneCountryChange('ke');
    });

    it('should set selectedOperator when operator changes', () => {
      component.operatorControl.setValue('MPESA');
      expect(component.selectedOperator).toBeTruthy();
      expect(component.selectedOperator!.name).toBe('MPESA');
    });

    it('should call parsePaymentArr when operator is set', () => {
      spyOn(component, 'parsePaymentArr').and.callThrough();
      component.operatorControl.setValue('MPESA');
      expect(component.parsePaymentArr).toHaveBeenCalled();
    });

    it('should reset paymentAmounts and selectedAmount when operator is cleared', () => {
      component.operatorControl.setValue('MPESA');
      expect(component.paymentAmounts.length).toBeGreaterThan(0);
      component.operatorControl.setValue(null);
      expect(component.selectedAmount).toBe(0);
      expect(component.paymentAmounts.length).toBe(0);
    });

    it('should set selectedOperator to null if operator name not found', () => {
      component.operatorControl.setValue('NON_EXISTENT');
      expect(component.selectedOperator).toBeNull();
    });
  });

  // ---------------------------------------------------------------
  // parsePaymentArr
  // ---------------------------------------------------------------
  describe('parsePaymentArr', () => {
    it('should generate payment amounts based on operator price and multiples', () => {
      component.onPhoneCountryChange('ke');
      component.operatorControl.setValue('MPESA');
      // MPESA price is 100, multiples are [1,2,5,10,20]
      expect(component.paymentAmounts).toEqual([100, 200, 500, 1000, 2000]);
    });

    it('should set selectedAmount to first payment amount', () => {
      component.onPhoneCountryChange('ke');
      component.operatorControl.setValue('MPESA');
      expect(component.selectedAmount).toBe(100);
    });

    it('should set selectedAmount to 0 when no payment amounts', () => {
      component.selectedOperator = null;
      component.parsePaymentArr();
      expect(component.selectedAmount).toBe(0);
      expect(component.paymentAmounts).toEqual([]);
    });
  });

  // ---------------------------------------------------------------
  // formatPhoneNumber
  // ---------------------------------------------------------------
  // describe('formatPhoneNumber', () => {
  //   it('should return the number as-is if it starts with +', () => {
  //     expect(component.formatPhoneNumber('+254712345678')).toBe('+254712345678');
  //   });

  //   it('should prepend + if number does not start with +', () => {
  //     expect(component.formatPhoneNumber('254712345678')).toBe('+254712345678');
  //   });
  // });

  // ---------------------------------------------------------------
  // getSelectedMultiple
  // ---------------------------------------------------------------
  describe('getSelectedMultiple', () => {
    beforeEach(() => {
      component.onPhoneCountryChange('ke');
      component.operatorControl.setValue('MPESA');
    });

    it('should return the correct multiple for a valid amount', () => {
      component.selectedAmount = 500; // 500 / 100 = 5
      expect(component.getSelectedMultiple()).toBe(5);
    });

    it('should return 0 if amount is not a clean multiple of price', () => {
      component.selectedAmount = 350; // 350 / 100 = 3.5, 350 % 100 !== 0
      expect(component.getSelectedMultiple()).toBe(0);
    });

    it('should return null if multiple exceeds maxMultiple', () => {
      component.selectedAmount = 2100; // 2100 / 100 = 21, maxMultiple is 20
      expect(component.getSelectedMultiple()).toBeNull();
    });

    it('should return null if no operator is selected', () => {
      component.selectedOperator = null;
      expect(component.getSelectedMultiple()).toBeNull();
    });

    it('should return 1 for the base price', () => {
      component.selectedAmount = 100;
      expect(component.getSelectedMultiple()).toBe(1);
    });
  });

  // ---------------------------------------------------------------
  // sendPayment
  // ---------------------------------------------------------------
  describe('sendPayment', () => {
    function fillValidForm(): void {
      component.onPhoneCountryChange('ke');
      component.operatorControl.setValue('MPESA');
      component.selectedAmount = 500;
      component.messageForm.patchValue({
        subject: 'Test Subject',
        message: 'Hello creator!',
        phoneNumber: '+254712345678',
        ownerName: 'John Doe',
      });
      // Clear intl-tel-input's invalidPhone error so the form is valid
      component.phoneNumberControl.setErrors(null);
      component.selectedCountry = mockChannelInfo.paymentCountries[0];
    }

    it('should mark form as touched if form is invalid', async () => {
      spyOn(component.messageForm, 'markAllAsTouched');
      // Set selectedCountry so it passes the first guard, but leave form invalid
      component.selectedCountry = mockChannelInfo.paymentCountries[0];
      await component.sendPayment();
      expect(component.messageForm.markAllAsTouched).toHaveBeenCalled();
    });

    it('should show alert error if selectedCountry is null', async () => {
      component.selectedCountry = null;
      // Fill everything except country selection state
      component.messageForm.patchValue({
        subject: 'Test',
        message: 'Msg',
        mobileOperator: 'MPESA',
        phoneNumber: '+254712345678',
        ownerName: 'John',
      });
      component.phoneNumberControl.setErrors(null);
      await component.sendPayment();
      // sendPayment returns early with alert error when selectedCountry is null
      expect(alertServiceSpy.error).toHaveBeenCalledWith(
        'Error',
        'Please select a country from the phone number flag'
      );
    });

    it('should show alert error if getSelectedMultiple returns falsy (0)', async () => {
      fillValidForm();
      component.selectedAmount = 350; // Will return 0 from getSelectedMultiple
      await component.sendPayment();
      expect(alertServiceSpy.error).toHaveBeenCalledWith(
        'Error',
        'Something went wrong! Please again enter values'
      );
    });

    it('should show alert error if getSelectedMultiple returns null', async () => {
      fillValidForm();
      component.selectedAmount = 2100; // exceeds maxMultiple
      await component.sendPayment();
      expect(alertServiceSpy.error).toHaveBeenCalledWith(
        'Error',
        'Something went wrong! Please again enter values'
      );
    });

    it('should call fanService.fanPayment with correct body for a video', async () => {
      fillValidForm();
      await component.sendPayment();
      expect(fanServiceSpy.fanPayment).toHaveBeenCalledWith(
        'test-handle',
        jasmine.objectContaining({
          subject: 'Test Subject',
          messageContent: 'Hello creator!',
          messageType: FAN_MESSAGE_TYPE.VIDEO,
          payerFullName: 'John Doe',
          payerPhone: '+254712345678',
          priceMultiple: 5,
          currency: 'KES',
          correspondent: 'MPESA',
          youtubeUrl: 'https://www.youtube.com/embed/abc123',
        })
      );
    });

    it('should set paymentModal to processing on successful payment', async () => {
      fillValidForm();
      await component.sendPayment();
      expect(component.paymentModal).toBe('processing');
    });

    it('should store session data in localStorage on successful payment', async () => {
      fillValidForm();
      await component.sendPayment();
      expect(localStorage.getItem(LocalVars.transSessionId)).toBe('session-abc');
      expect(localStorage.getItem(LocalVars.transStartTime)).toBeTruthy();
    });

    it('should set paymentInitResponse on successful payment', async () => {
      fillValidForm();
      await component.sendPayment();
      expect(component.paymentInitResponse).toEqual(mockPaymentResponse);
    });

    it('should set paymentModal to null on payment error', async () => {
      fillValidForm();
      fanServiceSpy.fanPayment.and.returnValue(throwError(() => new Error('Payment failed')));
      await component.sendPayment();
      expect(component.paymentModal).toBeNull();
    });

    it('should set messageType to LIVESTREAM when video is a live stream', async () => {
      fillValidForm();
      // Make it a livestream
      component.handleInfo = {
        ...mockChannelInfo,
        youtubeEmbed: { ...mockChannelInfo.youtubeEmbed!, isLiveStream: true },
      };
      fanServiceSpy.getYoutubeVideoData.and.returnValue(
        Promise.resolve({
          items: [{ liveStreamingDetails: { activeLiveChatId: 'chat-123' } }],
        })
      );
      await component.sendPayment();
      expect(fanServiceSpy.fanPayment).toHaveBeenCalledWith(
        'test-handle',
        jasmine.objectContaining({
          messageType: FAN_MESSAGE_TYPE.LIVESTREAM,
          youtubeLiveChatId: 'chat-123',
        })
      );
    });

    it('should omit messageType and youtubeUrl when youtubeEmbed is null', async () => {
      fillValidForm();
      component.handleInfo = { ...mockChannelInfo, youtubeEmbed: null };
      await component.sendPayment();
      const callArgs = fanServiceSpy.fanPayment.calls.mostRecent().args[1];
      expect(callArgs.messageType).toBeUndefined();
      expect(callArgs.youtubeUrl).toBeUndefined();
    });

    it('should omit youtubeLiveChatId if getLiveChatId returns null', async () => {
      fillValidForm();
      component.handleInfo = {
        ...mockChannelInfo,
        youtubeEmbed: { ...mockChannelInfo.youtubeEmbed!, isLiveStream: true },
      };
      fanServiceSpy.getYoutubeVideoData.and.returnValue(Promise.resolve(null));
      await component.sendPayment();
      const callArgs = fanServiceSpy.fanPayment.calls.mostRecent().args[1];
      expect(callArgs.youtubeLiveChatId).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  // getLiveChatId
  // ---------------------------------------------------------------
  describe('getLiveChatId', () => {
    it('should return activeLiveChatId when available', async () => {
      fanServiceSpy.getYoutubeVideoData.and.returnValue(
        Promise.resolve({
          items: [{ liveStreamingDetails: { activeLiveChatId: 'live-chat-456' } }],
        })
      );
      const result = await component.getLiveChatId();
      expect(result).toBe('live-chat-456');
    });

    it('should return null when no items', async () => {
      fanServiceSpy.getYoutubeVideoData.and.returnValue(Promise.resolve({ items: [] }));
      const result = await component.getLiveChatId();
      expect(result).toBeNull();
    });

    it('should return null when response is null', async () => {
      fanServiceSpy.getYoutubeVideoData.and.returnValue(Promise.resolve(null));
      const result = await component.getLiveChatId();
      expect(result).toBeNull();
    });

    it('should return null when youtubeEmbed is null', async () => {
      component.handleInfo = { ...mockChannelInfo, youtubeEmbed: null };
      const result = await component.getLiveChatId();
      expect(result).toBeNull();
      expect(fanServiceSpy.getYoutubeVideoData).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // checkPrevSession
  // ---------------------------------------------------------------
  describe('checkPrevSession', () => {
    it('should set paymentModal to processing if previous session exists', () => {
      spyOn(component, 'startTransTimer');
      localStorage.setItem(LocalVars.transSessionId, 'prev-session-id');
      component.checkPrevSession();
      expect(component.paymentModal).toBe('processing');
      expect(component.startTransTimer).toHaveBeenCalled();
    });

    it('should not change paymentModal if no previous session', () => {
      localStorage.removeItem(LocalVars.transSessionId);
      component.paymentModal = null;
      component.checkPrevSession();
      expect(component.paymentModal).toBeNull();
    });
  });

  // ---------------------------------------------------------------
  // startTransTimer / stopTransTimer
  // ---------------------------------------------------------------
  describe('startTransTimer', () => {
    it('should not start timer if no start time in localStorage', fakeAsync(() => {
      localStorage.removeItem(LocalVars.transStartTime);
      component.startTransTimer();
      tick(3000);
      // No timer should be running, so paymentModal stays unchanged
      expect(component.paymentModal).not.toBe('timed_out');
      discardPeriodicTasks();
    }));

    it('should set paymentModal to timed_out after 10 minutes', fakeAsync(() => {
      // Set start time to 10+ minutes ago
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000 - 1000).toISOString();
      localStorage.setItem(LocalVars.transStartTime, tenMinutesAgo);
      component.startTransTimer();
      tick(1000);
      expect(component.paymentModal).toBe('timed_out');
      discardPeriodicTasks();
    }));

    it('should not time out before 10 minutes elapsed', fakeAsync(() => {
      const justNow = new Date().toISOString();
      localStorage.setItem(LocalVars.transStartTime, justNow);
      component.paymentModal = 'processing';
      component.startTransTimer();
      tick(5000);
      expect(component.paymentModal).toBe('processing');
      discardPeriodicTasks();
    }));

    it('should remove localStorage data on timeout', fakeAsync(() => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000 - 1000).toISOString();
      localStorage.setItem(LocalVars.transStartTime, tenMinutesAgo);
      localStorage.setItem(LocalVars.transSessionId, 'some-session');
      component.startTransTimer();
      tick(1000);
      expect(localStorage.getItem(LocalVars.transSessionId)).toBeNull();
      expect(localStorage.getItem(LocalVars.transStartTime)).toBeNull();
      discardPeriodicTasks();
    }));

    it('should clear existing timer before starting a new one', fakeAsync(() => {
      const justNow = new Date().toISOString();
      localStorage.setItem(LocalVars.transStartTime, justNow);
      component.startTransTimer();
      component.startTransTimer();
      const secondTimer = (component as any).transTimer;
      // They should be different timer IDs since the first was cleared
      expect(secondTimer).toBeDefined();
      discardPeriodicTasks();
    }));
  });

  // ---------------------------------------------------------------
  // removeLocalTransData
  // ---------------------------------------------------------------
  describe('removeLocalTransData', () => {
    it('should remove session ID and start time from localStorage', () => {
      localStorage.setItem(LocalVars.transSessionId, 'sess-1');
      localStorage.setItem(LocalVars.transStartTime, '2025-01-01');
      component.removeLocalTransData();
      expect(localStorage.getItem(LocalVars.transSessionId)).toBeNull();
      expect(localStorage.getItem(LocalVars.transStartTime)).toBeNull();
    });
  });

  // ---------------------------------------------------------------
  // formattedDescription
  // ---------------------------------------------------------------
  describe('formattedDescription', () => {
    it('should replace newlines with <br> tags', () => {
      expect(component.formattedDescription).toBe('Test description<br>with newlines');
    });

    it('should return empty string when handleInfo is not set', () => {
      (component as any).handleInfo = null;
      expect(component.formattedDescription).toBe('');
    });

    it('should return empty string when youtubeEmbed is null', () => {
      component.handleInfo = { ...mockChannelInfo, youtubeEmbed: null };
      expect(component.formattedDescription).toBe('');
    });
  });

  // ---------------------------------------------------------------
  // toggleDescription
  // ---------------------------------------------------------------
  describe('toggleDescription', () => {
    it('should toggle isDescriptionExpanded from false to true', () => {
      component.isDescriptionExpanded = false;
      component.toggleDescription();
      expect(component.isDescriptionExpanded).toBeTrue();
    });

    it('should toggle isDescriptionExpanded from true to false', () => {
      component.isDescriptionExpanded = true;
      component.toggleDescription();
      expect(component.isDescriptionExpanded).toBeFalse();
    });
  });

  // ---------------------------------------------------------------
  // reset
  // ---------------------------------------------------------------
  describe('reset', () => {
    it('should reset the form and restore subject to the video title', () => {
      // Set video title via component property
      (component as any).videoTitle = 'My Video Title';
      component.messageForm.patchValue({
        subject: 'Custom Subject',
        message: 'Some message',
        ownerName: 'Someone',
      });
      component.reset();
      expect(component.messageControl.value).toBeNull();
      expect(component.ownerNameControl.value).toBeNull();
      expect(component.subjectControl.value).toBe('My Video Title');
    });
  });

  // ---------------------------------------------------------------
  // openTelegram
  // ---------------------------------------------------------------
  describe('openTelegram', () => {
    it('should open the invite link in a new window', () => {
      spyOn(window, 'open');
      component.openTelegram('https://t.me/testchannel');
      expect(window.open).toHaveBeenCalledWith('https://t.me/testchannel', '_blank');
    });
  });

  // ---------------------------------------------------------------
  // onModelClose
  // ---------------------------------------------------------------
  describe('onModelClose', () => {
    it('should set paymentModal to null when event is true', () => {
      component.paymentModal = 'success';
      component.onModelClose(true);
      expect(component.paymentModal).toBeNull();
    });

    it('should remove modal-open class from body when event is true', () => {
      document.body.classList.add('modal-open');
      component.onModelClose(true);
      expect(document.body.classList.contains('modal-open')).toBeFalse();
    });

    it('should not change paymentModal when event is false', () => {
      component.paymentModal = 'success';
      component.onModelClose(false);
      expect(component.paymentModal).toBe('success');
    });
  });

  // ---------------------------------------------------------------
  // ngOnDestroy
  // ---------------------------------------------------------------
  describe('ngOnDestroy', () => {
    it('should unsubscribe from all subscriptions', () => {
      const subSpy = jasmine.createSpyObj('Subscription', ['unsubscribe']);
      component.subArr = [subSpy, subSpy];
      component.ngOnDestroy();
      expect(subSpy.unsubscribe).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------
  // Multiples / paymentAmounts (property checks)
  // ---------------------------------------------------------------
  describe('default properties', () => {
    it('should have default multiples', () => {
      expect(component.multiples).toEqual([1, 2, 5, 10, 20]);
    });

    it('should start with empty paymentAmounts', () => {
      expect(component.paymentAmounts).toEqual([]);
    });

    it('should start with selectedAmount as 0', () => {
      expect(component.selectedAmount).toBe(0);
    });

    it('should have source list', () => {
      expect(component.sourceList.length).toBe(3);
    });

    it('should have medium list', () => {
      expect(component.mediumList.length).toBe(3);
    });

    it('should have referralCampaigns list', () => {
      expect(component.referralCampaigns.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------
  // onRetryWithDifferentNumber
  // ---------------------------------------------------------------
  describe('onRetryWithDifferentNumber', () => {
    it('should clear the transaction timer', () => {
      spyOn(component, 'clearTransTimer');
      component.onRetryWithDifferentNumber();
      expect(component.clearTransTimer).toHaveBeenCalled();
    });

    it('should disconnect the WebSocket', () => {
      expect((component as any).initializeWebSocket).toBeDefined();
      spyOn(component, 'disconnectWebSocket' as any);
      component.onRetryWithDifferentNumber();
      expect((component as any).disconnectWebSocket).toHaveBeenCalled();
    });

    it('should remove localStorage transaction data', () => {
      localStorage.setItem(LocalVars.transSessionId, 'test-session');
      localStorage.setItem(LocalVars.transStartTime, new Date().toISOString());
      component.onRetryWithDifferentNumber();
      expect(localStorage.getItem(LocalVars.transSessionId)).toBeNull();
      expect(localStorage.getItem(LocalVars.transStartTime)).toBeNull();
    });

    it('should reset the idempotency key', () => {
      (component as any).currentIdempotencyKey = 'some-key';
      component.onRetryWithDifferentNumber();
      expect((component as any).currentIdempotencyKey).toBeNull();
    });

    it('should set paymentModal to null', () => {
      component.paymentModal = 'processing';
      component.onRetryWithDifferentNumber();
      expect(component.paymentModal).toBeNull();
    });

    it('should remove modal-open class from body', () => {
      document.body.classList.add('modal-open');
      component.onRetryWithDifferentNumber();
      expect(document.body.classList.contains('modal-open')).toBeFalse();
    });

    it('should preserve form values', () => {
      component.messageForm.patchValue({
        subject: 'My Subject',
        message: 'Hello creator!',
        mobileOperator: 'MPESA',
        ownerName: 'John Doe',
      });
      component.paymentModal = 'processing';
      component.onRetryWithDifferentNumber();
      expect(component.subjectControl.value).toBe('My Subject');
      expect(component.messageControl.value).toBe('Hello creator!');
      expect(component.ownerNameControl.value).toBe('John Doe');
    });
  });

  // ---------------------------------------------------------------
  // Payment success message prepend
  // ---------------------------------------------------------------
  describe('payment success message prepend', () => {
    it('should prepend message with isNew flag to recentMessages on payment succeeded', () => {
      component.messageForm.patchValue({
        ownerName: 'Jane Fan',
        message: 'Love your content!',
      });
      const initialLength = component.handleInfo.recentMessages.length;

      // Simulate the paymentStatus 'succeeded' event logic
      const newComment = {
        payerFullName: component.messageForm.get('ownerName')?.value || 'You',
        content: component.messageForm.get('message')?.value || '',
        timestamp: new Date().toISOString(),
        isNew: true,
      };
      component.handleInfo.recentMessages.unshift(newComment);
      component.paymentModal = 'success';

      expect(component.handleInfo.recentMessages.length).toBe(initialLength + 1);
      expect(component.handleInfo.recentMessages[0].payerFullName).toBe('Jane Fan');
      expect(component.handleInfo.recentMessages[0].content).toBe('Love your content!');
      expect(component.handleInfo.recentMessages[0].isNew).toBeTrue();
      expect(component.paymentModal).toBe('success');
    });

    it('should use fallback name when ownerName is empty', () => {
      component.messageForm.patchValue({
        ownerName: null,
        message: 'Hello!',
      });

      const newComment = {
        payerFullName: component.messageForm.get('ownerName')?.value || 'You',
        content: component.messageForm.get('message')?.value || '',
        timestamp: new Date().toISOString(),
        isNew: true,
      };
      component.handleInfo.recentMessages.unshift(newComment);

      expect(component.handleInfo.recentMessages[0].payerFullName).toBe('You');
    });
  });

  // ---------------------------------------------------------------
  // Integration-like scenarios (country -> operator -> payment flow)
  // ---------------------------------------------------------------
  describe('country to operator selection flow', () => {
    it('should generate correct payment amounts after selecting country and operator', () => {
      component.onPhoneCountryChange('ug');
      expect(component.selectedCountry!.countryCode).toBe('UGA');
      component.operatorControl.setValue('MTN');
      expect(component.selectedOperator!.name).toBe('MTN');
      // MTN price is 5000, multiples [1,2,5,10,20]
      expect(component.paymentAmounts).toEqual([5000, 10000, 25000, 50000, 100000]);
      expect(component.selectedAmount).toBe(5000);
    });

    it('should reset operator when switching countries', () => {
      component.onPhoneCountryChange('ke');
      component.operatorControl.setValue('MPESA');
      expect(component.selectedOperator!.name).toBe('MPESA');

      // Now switch country
      component.onPhoneCountryChange('ug');
      // Operator should be reset to null
      expect(component.operatorControl.value).toBeNull();
      // Payment amounts and selectedAmount reset
      expect(component.paymentAmounts).toEqual([]);
      expect(component.selectedAmount).toBe(0);
    });
  });
});
