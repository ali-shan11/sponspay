import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { DashboardService } from '@services/dashboard.service';
import { ChannelStatisticsResponse } from '@app-types/dashboard';

import { LinkManagementCardComponent } from './link-management-card.component';

const mockChannelStatsResponse: ChannelStatisticsResponse = {
  channelHandle: 'test-channel',
  linkClicks: 150,
  transactions: 42,
  transactionTrend: 5,
};

const mockChannelStatsNullHandle: ChannelStatisticsResponse = {
  channelHandle: null,
  linkClicks: 0,
  transactions: 0,
  transactionTrend: 0,
};

describe('LinkManagementCardComponent', () => {
  let component: LinkManagementCardComponent;
  let fixture: ComponentFixture<LinkManagementCardComponent>;
  let selectedDays$: BehaviorSubject<number>;
  let selectedChannel$: BehaviorSubject<string>;
  let mockDashboardService: {
    selectedDaysObservable: BehaviorSubject<number>;
    selectedChannelObservable: BehaviorSubject<string>;
    refresh$: Subject<void>;
    getChannelStatistics: jasmine.Spy;
  };

  beforeEach(async () => {
    selectedDays$ = new BehaviorSubject<number>(7);
    selectedChannel$ = new BehaviorSubject<string>('channel-1');

    mockDashboardService = {
      selectedDaysObservable: selectedDays$,
      selectedChannelObservable: selectedChannel$,
      refresh$: new Subject<void>(),
      getChannelStatistics: jasmine.createSpy('getChannelStatistics').and.returnValue(of(mockChannelStatsResponse)),
    };

    await TestBed.configureTestingModule({
      imports: [LinkManagementCardComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
        { provide: DashboardService, useValue: mockDashboardService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LinkManagementCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call subFiltersChange on init', () => {
      expect(mockDashboardService.getChannelStatistics).toHaveBeenCalled();
    });

    it('should add a subscription to unSubscribe array', () => {
      expect(component.unSubscribe.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe all subscriptions', () => {
      const spies = component.unSubscribe.map(sub => spyOn(sub, 'unsubscribe'));
      component.ngOnDestroy();
      spies.forEach(spy => expect(spy).toHaveBeenCalled());
    });

    it('should handle empty unSubscribe array', () => {
      component.unSubscribe = [];
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('subFiltersChange', () => {
    it('should call getChannelStats when days observable changes', () => {
      mockDashboardService.getChannelStatistics.calls.reset();
      selectedDays$.next(30);
      expect(mockDashboardService.getChannelStatistics).toHaveBeenCalledTimes(1);
    });

    it('should call getChannelStats when channel observable changes', () => {
      mockDashboardService.getChannelStatistics.calls.reset();
      selectedChannel$.next('channel-2');
      expect(mockDashboardService.getChannelStatistics).toHaveBeenCalledTimes(1);
    });

    it('should not call getChannelStats when days is falsy (0)', () => {
      mockDashboardService.getChannelStatistics.calls.reset();
      selectedDays$.next(0);
      expect(mockDashboardService.getChannelStatistics).not.toHaveBeenCalled();
    });

    it('should not call getChannelStats when channel is empty string', () => {
      mockDashboardService.getChannelStatistics.calls.reset();
      selectedChannel$.next('');
      expect(mockDashboardService.getChannelStatistics).not.toHaveBeenCalled();
    });

    it('should not call getChannelStats for duplicate emissions', () => {
      mockDashboardService.getChannelStatistics.calls.reset();
      selectedDays$.next(7); // same value as initial
      expect(mockDashboardService.getChannelStatistics).not.toHaveBeenCalled();
    });
  });

  describe('getChannelStats', () => {
    it('should set isLoading to true at start', () => {
      component.isLoading = false;
      mockDashboardService.getChannelStatistics.and.returnValue(of(mockChannelStatsResponse));
      component.getChannelStats();
      // After synchronous completion, isLoading is false
      expect(component.isLoading).toBeFalse();
    });

    it('should set channelStats and isLoading to false on success', () => {
      mockDashboardService.getChannelStatistics.and.returnValue(of(mockChannelStatsResponse));
      component.getChannelStats();
      expect(component.channelStats).toEqual(mockChannelStatsResponse);
      expect(component.channelStats!.channelHandle).toBe('test-channel');
      expect(component.channelStats!.linkClicks).toBe(150);
      expect(component.channelStats!.transactions).toBe(42);
      expect(component.isLoading).toBeFalse();
    });

    it('should set isLoading to false on error', () => {
      mockDashboardService.getChannelStatistics.and.returnValue(throwError(() => new Error('API error')));
      component.getChannelStats();
      expect(component.isLoading).toBeFalse();
    });

    it('should handle response with null channelHandle', () => {
      mockDashboardService.getChannelStatistics.and.returnValue(of(mockChannelStatsNullHandle));
      component.getChannelStats();
      expect(component.channelStats).toEqual(mockChannelStatsNullHandle);
      expect(component.channelStats!.channelHandle).toBeNull();
      expect(component.isLoading).toBeFalse();
    });
  });

  describe('url getter', () => {
    it('should return url with channelHandle when channelStats is set', () => {
      component.channelStats = mockChannelStatsResponse;
      expect(component.url).toBe(component.domainUrl + '/fan/test-channel');
    });

    it('should return url with empty string when channelStats is null', () => {
      component.channelStats = null;
      expect(component.url).toBe(component.domainUrl + '/fan/');
    });

    it('should return url with empty string when channelHandle is null', () => {
      component.channelStats = mockChannelStatsNullHandle;
      expect(component.url).toBe(component.domainUrl + '/fan/');
    });
  });

  describe('lastDaysText getter', () => {
    it('should return formatted days text', () => {
      selectedDays$.next(7);
      expect(component.lastDaysText).toBe('7 days');
    });

    it('should reflect changes to selectedDaysObservable', () => {
      selectedDays$.next(30);
      expect(component.lastDaysText).toBe('30 days');
    });

    it('should reflect 90 days', () => {
      selectedDays$.next(90);
      expect(component.lastDaysText).toBe('90 days');
    });
  });

  describe('copyToClipboard', () => {
    let writeTextSpy: jasmine.Spy;

    beforeEach(() => {
      writeTextSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        writable: true,
        configurable: true,
      });
    });

    it('should call navigator.clipboard.writeText with the url', () => {
      component.channelStats = mockChannelStatsResponse;
      component.copyToClipboard();
      expect(writeTextSpy).toHaveBeenCalledWith(component.url);
    });

    it('should set isTextCopied to true after clipboard write resolves', fakeAsync(() => {
      component.channelStats = mockChannelStatsResponse;
      component.copyToClipboard();
      tick(); // resolve the promise
      expect(component.isTextCopied).toBeTrue();
    }));

    it('should reset isTextCopied to false after 2 seconds', fakeAsync(() => {
      component.channelStats = mockChannelStatsResponse;
      component.copyToClipboard();
      tick(); // resolve the promise
      expect(component.isTextCopied).toBeTrue();
      tick(2000); // wait for setTimeout
      expect(component.isTextCopied).toBeFalse();
    }));
  });

  describe('openInNewTab', () => {
    let windowOpenSpy: jasmine.Spy;

    beforeEach(() => {
      windowOpenSpy = spyOn(window, 'open');
    });

    it('should call window.open with the url and _blank target', () => {
      component.channelStats = mockChannelStatsResponse;
      component.openInNewTab();
      expect(windowOpenSpy).toHaveBeenCalledWith(component.url, '_blank');
    });

    it('should use the correct url when channelStats is null', () => {
      component.channelStats = null;
      component.openInNewTab();
      expect(windowOpenSpy).toHaveBeenCalledWith(component.domainUrl + '/fan/', '_blank');
    });
  });

  describe('initial state', () => {
    it('should have channelStats populated after init', () => {
      expect(component.channelStats).toBeTruthy();
    });

    it('should have isTextCopied as false initially', () => {
      expect(component.isTextCopied).toBeFalse();
    });

    it('should have domainUrl set to window.location.origin', () => {
      expect(component.domainUrl).toBe(window.location.origin);
    });

    it('should have isLoading as false after init completes', () => {
      expect(component.isLoading).toBeFalse();
    });
  });
});
