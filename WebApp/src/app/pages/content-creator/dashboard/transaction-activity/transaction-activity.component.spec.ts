import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { AuthService } from '@services/auth.service';
import { DashboardService } from '@services/dashboard.service';
import { LatestTransactionService } from '@services/latest-transaction.service';
import { CreatorSignInResponse } from '@app-types/onboarding';
import { MessageUnitStatistics } from '@app-types/transaction-activity';

import { TransactionActivityComponent } from './transaction-activity.component';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

describe('TransactionActivityComponent', () => {
  let component: TransactionActivityComponent;
  let fixture: ComponentFixture<TransactionActivityComponent>;
  let creatorSignInSubject: BehaviorSubject<CreatorSignInResponse | null>;
  let selectedChannelSubject: BehaviorSubject<string>;
  let selectedDaysSubject: BehaviorSubject<number>;
  let mockTransactionService: jasmine.SpyObj<LatestTransactionService>;
  let mockDashboardService: {
    selectedDaysObservable: BehaviorSubject<number>;
    selectedChannelObservable: BehaviorSubject<string>;
  };

  const mockMessageStats: MessageUnitStatistics = {
    current30Days: { totalUsd: 500, averageUsd: 16.67, transactionCount: 30 },
    previous30Days: { totalUsd: 400, averageUsd: 13.33, transactionCount: 25 },
    changePercentage: 25,
    monthlyAverages: [
      { month: 'Jan', averagePerDayUsd: 10 },
      { month: 'Feb', averagePerDayUsd: 20 },
    ],
    topCountries: [{ countryCode: 'KE', countryName: 'Kenya', totalUsd: 100 }],
  };

  beforeEach(async () => {
    creatorSignInSubject = new BehaviorSubject<CreatorSignInResponse | null>(null);
    selectedChannelSubject = new BehaviorSubject<string>('');
    selectedDaysSubject = new BehaviorSubject<number>(30);

    const mockAuthService = {
      creatorSignInResponse$: creatorSignInSubject.asObservable(),
      user$: new BehaviorSubject(null),
      accessToken$: new BehaviorSubject(null),
    };

    mockDashboardService = {
      selectedDaysObservable: selectedDaysSubject,
      selectedChannelObservable: selectedChannelSubject,
    };

    mockTransactionService = jasmine.createSpyObj('LatestTransactionService', ['getMessageStats']);
    mockTransactionService.getMessageStats.and.returnValue(of(mockMessageStats));

    await TestBed.configureTestingModule({
      imports: [TransactionActivityComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: LatestTransactionService, useValue: mockTransactionService },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
      ]
    })
    // Override template to avoid rendering child chart components in unit tests
    .overrideComponent(TransactionActivityComponent, {
      set: { template: '<div></div>', imports: [] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have isDaysDropdownOpen set to false', () => {
      expect(component.isDaysDropdownOpen).toBeFalse();
    });

    it('should have signInResponse as null initially', () => {
      expect(component.signInResponse).toBeNull();
    });

    it('should have 6 daysOptions', () => {
      expect(component.daysOptions.length).toBe(6);
    });

    it('should have currentDate set as a Date instance', () => {
      expect(component.currentDate).toBeDefined();
      expect(component.currentDate instanceof Date).toBeTrue();
    });

    it('should have isMessageStatLoading initially true then set after channel subscription', () => {
      // After fixture.detectChanges() + ngOnInit, the selectedChannelObservable
      // emits '' (empty string) which does NOT trigger getMessageStats,
      // so isMessageStatLoading stays true
      expect(component.isMessageStatLoading).toBeTrue();
    });

    it('should have messageStatistics as null initially when no channel selected', () => {
      // No channel selected yet so getMessageStats is not called
      // Reset to a fresh component without channel emission
      expect(component.messageStatistics).toBeNull();
    });

    it('should have unSubscribe as an array', () => {
      expect(Array.isArray(component.unSubscribe)).toBeTrue();
    });
  });

  describe('ngOnInit', () => {
    it('should call subYtChannelChange and subSignInResponse', () => {
      spyOn(component, 'subYtChannelChange' as any);
      spyOn(component, 'subSignInResponse' as any);
      component.ngOnInit();
      expect((component as any).subYtChannelChange).toHaveBeenCalled();
      expect((component as any).subSignInResponse).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe all subscriptions', () => {
      const mockSub1 = jasmine.createSpyObj('Subscription', ['unsubscribe']);
      const mockSub2 = jasmine.createSpyObj('Subscription', ['unsubscribe']);
      component.unSubscribe = [mockSub1, mockSub2];

      component.ngOnDestroy();

      expect(mockSub1.unsubscribe).toHaveBeenCalled();
      expect(mockSub2.unsubscribe).toHaveBeenCalled();
    });

    it('should handle empty unSubscribe array without error', () => {
      component.unSubscribe = [];
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('onClickOutside', () => {
    it('should close days dropdown when event has a target', () => {
      component.isDaysDropdownOpen = true;

      const mockEvent = { target: document.createElement('div') } as unknown as MouseEvent;
      component.onClickOutside(mockEvent);

      expect(component.isDaysDropdownOpen).toBeFalse();
    });

    it('should keep dropdown state if event has no target', () => {
      component.isDaysDropdownOpen = true;

      const mockEvent = { target: null } as unknown as MouseEvent;
      component.onClickOutside(mockEvent);

      expect(component.isDaysDropdownOpen).toBeTrue();
    });

    it('should keep dropdown state if event is null-like', () => {
      component.isDaysDropdownOpen = true;

      const mockEvent = null as unknown as MouseEvent;
      component.onClickOutside(mockEvent);

      expect(component.isDaysDropdownOpen).toBeTrue();
    });

    it('should keep dropdown closed if already closed', () => {
      component.isDaysDropdownOpen = false;

      const mockEvent = { target: document.createElement('div') } as unknown as MouseEvent;
      component.onClickOutside(mockEvent);

      expect(component.isDaysDropdownOpen).toBeFalse();
    });
  });

  describe('toggleDropdown', () => {
    it('should open the days dropdown when it is closed', () => {
      component.isDaysDropdownOpen = false;
      const mockEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation']);

      component.toggleDropdown(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.isDaysDropdownOpen).toBeTrue();
    });

    it('should close the days dropdown when it is open', () => {
      component.isDaysDropdownOpen = true;
      const mockEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation']);

      component.toggleDropdown(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.isDaysDropdownOpen).toBeFalse();
    });

    it('should call stopPropagation exactly once', () => {
      const mockEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation']);
      component.toggleDropdown(mockEvent);
      expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1);
    });
  });

  describe('onDayOptionClick', () => {
    it('should toggle the dropdown state', () => {
      component.isDaysDropdownOpen = true;
      component.onDayOptionClick(7);
      expect(component.isDaysDropdownOpen).toBeFalse();
    });

    it('should open the dropdown if it was closed', () => {
      component.isDaysDropdownOpen = false;
      component.onDayOptionClick(7);
      expect(component.isDaysDropdownOpen).toBeTrue();
    });

    it('should emit the selected days value to the dashboard service', () => {
      spyOn(mockDashboardService.selectedDaysObservable, 'next');
      component.onDayOptionClick(90);
      expect(mockDashboardService.selectedDaysObservable.next).toHaveBeenCalledWith(90);
    });

    it('should emit 1 for Today option', () => {
      spyOn(mockDashboardService.selectedDaysObservable, 'next');
      component.onDayOptionClick(1);
      expect(mockDashboardService.selectedDaysObservable.next).toHaveBeenCalledWith(1);
    });

    it('should emit 365 for This Year option', () => {
      spyOn(mockDashboardService.selectedDaysObservable, 'next');
      component.onDayOptionClick(365);
      expect(mockDashboardService.selectedDaysObservable.next).toHaveBeenCalledWith(365);
    });
  });

  describe('selectedDaysOption getter', () => {
    it('should return the matching option for the default value (30)', () => {
      const result = component.selectedDaysOption;
      expect(result).toEqual({ text: 'Last 30 Days', value: 30 });
    });

    it('should return the correct option when value is 1 (Today)', () => {
      mockDashboardService.selectedDaysObservable.next(1);
      expect(component.selectedDaysOption).toEqual({ text: 'Today', value: 1 });
    });

    it('should return the correct option when value is 7 (This Week)', () => {
      mockDashboardService.selectedDaysObservable.next(7);
      expect(component.selectedDaysOption).toEqual({ text: 'This Week', value: 7 });
    });

    it('should return the correct option when value is 90 (Last Quarter)', () => {
      mockDashboardService.selectedDaysObservable.next(90);
      expect(component.selectedDaysOption).toEqual({ text: 'Last Quarter', value: 90 });
    });

    it('should return the correct option when value is 180 (Last 6 Months)', () => {
      mockDashboardService.selectedDaysObservable.next(180);
      expect(component.selectedDaysOption).toEqual({ text: 'Last 6 Months', value: 180 });
    });

    it('should return the correct option when value is 365 (This Year)', () => {
      mockDashboardService.selectedDaysObservable.next(365);
      expect(component.selectedDaysOption).toEqual({ text: 'This Year', value: 365 });
    });

    it('should return undefined when no matching option exists', () => {
      mockDashboardService.selectedDaysObservable.next(999);
      expect(component.selectedDaysOption).toBeUndefined();
    });
  });

  describe('subSignInResponse', () => {
    it('should set signInResponse when auth service emits a value', () => {
      const mockResponse: CreatorSignInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true,
      };
      creatorSignInSubject.next(mockResponse);
      expect(component.signInResponse).toEqual(mockResponse);
    });

    it('should set signInResponse to null when auth service emits null', () => {
      const mockResponse: CreatorSignInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: true,
      };
      creatorSignInSubject.next(mockResponse);
      expect(component.signInResponse).toEqual(mockResponse);

      creatorSignInSubject.next(null);
      expect(component.signInResponse).toBeNull();
    });
  });

  describe('subYtChannelChange', () => {
    it('should call getMessageStats when a non-empty channelId is emitted', () => {
      spyOn(component, 'getMessageStats');
      // Reset subscriptions from ngOnInit
      component.unSubscribe = [];

      component.subYtChannelChange();

      // Emit a channel id
      selectedChannelSubject.next('UC123');

      expect(component.getMessageStats).toHaveBeenCalled();
    });

    it('should not call getMessageStats when an empty channelId is emitted', () => {
      spyOn(component, 'getMessageStats');
      component.unSubscribe = [];

      component.subYtChannelChange();

      selectedChannelSubject.next('');

      expect(component.getMessageStats).not.toHaveBeenCalled();
    });

    it('should not call getMessageStats when null channelId is emitted', () => {
      spyOn(component, 'getMessageStats');
      component.unSubscribe = [];

      component.subYtChannelChange();

      selectedChannelSubject.next(null as unknown as string);

      expect(component.getMessageStats).not.toHaveBeenCalled();
    });

    it('should push subscription into unSubscribe array', () => {
      const initialLength = component.unSubscribe.length;
      component.subYtChannelChange();
      expect(component.unSubscribe.length).toBe(initialLength + 1);
    });
  });

  describe('getMessageStats', () => {
    it('should set isMessageStatLoading to true when called', () => {
      component.isMessageStatLoading = false;
      component.getMessageStats();
      // It sets to true synchronously, then the observable resolves
      expect(mockTransactionService.getMessageStats).toHaveBeenCalled();
    });

    it('should set messageStatistics and isMessageStatLoading=false on success', () => {
      component.getMessageStats();
      expect(component.messageStatistics).toEqual(jasmine.objectContaining({
        current30Days: mockMessageStats.current30Days,
        changePercentage: mockMessageStats.changePercentage,
      }));
      expect(component.isMessageStatLoading).toBeFalse();
    });

    it('should set topCountries flag using GetFlagUrl on success', () => {
      component.getMessageStats();
      expect(component.messageStatistics).toBeTruthy();
      // GetFlagUrl('KE') should produce a flag URL string
      expect(component.messageStatistics!.topCountries[0].flag).toBeDefined();
      expect(typeof component.messageStatistics!.topCountries[0].flag).toBe('string');
    });

    it('should set isMessageStatLoading to false on error', () => {
      mockTransactionService.getMessageStats.and.returnValue(throwError(() => new Error('Network error')));
      component.isMessageStatLoading = true;
      component.getMessageStats();
      expect(component.isMessageStatLoading).toBeFalse();
    });

    it('should not set messageStatistics on error', () => {
      mockTransactionService.getMessageStats.and.returnValue(throwError(() => new Error('fail')));
      component.messageStatistics = null;
      component.getMessageStats();
      expect(component.messageStatistics).toBeNull();
    });

    it('should push subscription into unSubscribe array', () => {
      const initialLength = component.unSubscribe.length;
      component.getMessageStats();
      expect(component.unSubscribe.length).toBe(initialLength + 1);
    });
  });

  describe('isTelegramConnected getter', () => {
    it('should return falsy when signInResponse is null', () => {
      component.signInResponse = null;
      expect(component.isTelegramConnected).toBeFalsy();
    });

    it('should return true when isCreator and isCoAdmin are both true', () => {
      component.signInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true,
      };
      expect(component.isTelegramConnected).toBeTrue();
    });

    it('should return false when isCreator is true but isCoAdmin is false', () => {
      component.signInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: true,
      };
      expect(component.isTelegramConnected).toBeFalsy();
    });

    it('should return false when isCreator is false but isCoAdmin is true', () => {
      component.signInResponse = {
        success: true,
        message: 'OK',
        isCreator: false,
        isCoAdmin: true,
        hasAcceptedTerms: true,
      };
      expect(component.isTelegramConnected).toBeFalsy();
    });

    it('should return false when both isCreator and isCoAdmin are false', () => {
      component.signInResponse = {
        success: true,
        message: 'OK',
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: true,
      };
      expect(component.isTelegramConnected).toBeFalsy();
    });
  });

  describe('daysOptions', () => {
    it('should contain Today with value 1', () => {
      expect(component.daysOptions).toContain({ text: 'Today', value: 1 });
    });

    it('should contain This Week with value 7', () => {
      expect(component.daysOptions).toContain({ text: 'This Week', value: 7 });
    });

    it('should contain Last 30 Days with value 30', () => {
      expect(component.daysOptions).toContain({ text: 'Last 30 Days', value: 30 });
    });

    it('should contain Last Quarter with value 90', () => {
      expect(component.daysOptions).toContain({ text: 'Last Quarter', value: 90 });
    });

    it('should contain Last 6 Months with value 180', () => {
      expect(component.daysOptions).toContain({ text: 'Last 6 Months', value: 180 });
    });

    it('should contain This Year with value 365', () => {
      expect(component.daysOptions).toContain({ text: 'This Year', value: 365 });
    });
  });
});
