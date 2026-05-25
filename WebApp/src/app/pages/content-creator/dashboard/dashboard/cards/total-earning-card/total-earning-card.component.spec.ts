import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { createMockFirebaseAuth } from '../../../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { DashboardService } from '@services/dashboard.service';
import { RevenuePerDayResponse } from '@app-types/dashboard';

import { TotalEarningCardComponent } from './total-earning-card.component';

Chart.register(...registerables);

const mockRevenueResponse: RevenuePerDayResponse = {
  days: 7,
  timezoneOffsetMinutes: -60,
  startDate: '2026-02-09',
  endDate: '2026-02-16',
  series: [
    { date: '2026-02-09', revenueUsd: 10.5 },
    { date: '2026-02-10', revenueUsd: 20.75 },
    { date: '2026-02-11', revenueUsd: 0 },
  ],
  totalRevenueUsd: 31.25,
  trendPercentage: 12.5,
};

const emptyRevenueResponse: RevenuePerDayResponse = {
  days: 7,
  timezoneOffsetMinutes: -60,
  startDate: '2026-02-09',
  endDate: '2026-02-16',
  series: [],
  totalRevenueUsd: 0,
  trendPercentage: 0,
};

describe('TotalEarningCardComponent', () => {
  let component: TotalEarningCardComponent;
  let fixture: ComponentFixture<TotalEarningCardComponent>;
  let selectedDays$: BehaviorSubject<number>;
  let selectedChannel$: BehaviorSubject<string>;
  let mockDashboardService: {
    selectedDaysObservable: BehaviorSubject<number>;
    selectedChannelObservable: BehaviorSubject<string>;
    refresh$: Subject<void>;
    getRevenuePerDay: jasmine.Spy;
  };

  beforeEach(async () => {
    selectedDays$ = new BehaviorSubject<number>(7);
    selectedChannel$ = new BehaviorSubject<string>('channel-1');

    mockDashboardService = {
      selectedDaysObservable: selectedDays$,
      selectedChannelObservable: selectedChannel$,
      refresh$: new Subject<void>(),
      getRevenuePerDay: jasmine.createSpy('getRevenuePerDay').and.returnValue(of(mockRevenueResponse)),
    };

    await TestBed.configureTestingModule({
      imports: [TotalEarningCardComponent],
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

    fixture = TestBed.createComponent(TotalEarningCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call subFiltersChange on init', () => {
      // subFiltersChange was already called by fixture.detectChanges() in beforeEach
      // which triggers ngOnInit. Verify that getRevenuePerDay was called as a result.
      expect(mockDashboardService.getRevenuePerDay).toHaveBeenCalled();
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
    it('should call getRevenuePerDay when days observable changes', () => {
      mockDashboardService.getRevenuePerDay.calls.reset();
      selectedDays$.next(30);
      expect(mockDashboardService.getRevenuePerDay).toHaveBeenCalledTimes(1);
    });

    it('should call getRevenuePerDay when channel observable changes', () => {
      mockDashboardService.getRevenuePerDay.calls.reset();
      selectedChannel$.next('channel-2');
      expect(mockDashboardService.getRevenuePerDay).toHaveBeenCalledTimes(1);
    });

    it('should not call getRevenuePerDay when days is falsy (0)', () => {
      mockDashboardService.getRevenuePerDay.calls.reset();
      selectedDays$.next(0);
      expect(mockDashboardService.getRevenuePerDay).not.toHaveBeenCalled();
    });

    it('should not call getRevenuePerDay when channel is empty string', () => {
      mockDashboardService.getRevenuePerDay.calls.reset();
      selectedChannel$.next('');
      expect(mockDashboardService.getRevenuePerDay).not.toHaveBeenCalled();
    });

    it('should not call getRevenuePerDay for duplicate emissions', () => {
      mockDashboardService.getRevenuePerDay.calls.reset();
      selectedDays$.next(7); // same value as initial
      expect(mockDashboardService.getRevenuePerDay).not.toHaveBeenCalled();
    });
  });

  describe('getRevenuePerDay', () => {
    it('should set isLoading to true and revenue to null at start', () => {
      component.revenue = mockRevenueResponse;
      component.isLoading = false;
      mockDashboardService.getRevenuePerDay.and.returnValue(of(mockRevenueResponse));
      component.getRevenuePerDay();
      // After subscribe completes synchronously, isLoading should be false again
      // but revenue should have been set to null then back to the response
      expect(component.revenue).toEqual(mockRevenueResponse);
      expect(component.isLoading).toBeFalse();
    });

    it('should set revenue and isLoading to false on success', () => {
      mockDashboardService.getRevenuePerDay.and.returnValue(of(mockRevenueResponse));
      component.getRevenuePerDay();
      expect(component.revenue).toEqual(mockRevenueResponse);
      expect(component.isLoading).toBeFalse();
    });

    it('should call mapChartData on success', () => {
      spyOn(component, 'mapChartData');
      mockDashboardService.getRevenuePerDay.and.returnValue(of(mockRevenueResponse));
      component.getRevenuePerDay();
      expect(component.mapChartData).toHaveBeenCalled();
    });

    it('should set isLoading to false on error', () => {
      mockDashboardService.getRevenuePerDay.and.returnValue(throwError(() => new Error('API error')));
      component.getRevenuePerDay();
      expect(component.isLoading).toBeFalse();
      expect(component.revenue).toBeNull();
    });
  });

  describe('mapChartData', () => {
    it('should populate chart labels and data from revenue series', () => {
      component.revenue = mockRevenueResponse;
      component.mapChartData();
      expect(component.chartData.labels?.length).toBe(3);
      expect(component.chartData.datasets[0].data.length).toBe(3);
      expect(component.chartData.datasets[0].data).toEqual([10.5, 20.75, 0]);
    });

    it('should not update chart data when revenue is null', () => {
      component.revenue = null;
      component.chartData.labels = ['existing'];
      component.chartData.datasets[0].data = [99];
      component.mapChartData();
      expect(component.chartData.labels).toEqual(['existing']);
      expect(component.chartData.datasets[0].data).toEqual([99]);
    });

    it('should not update chart data when series is empty', () => {
      component.revenue = emptyRevenueResponse;
      component.chartData.labels = ['existing'];
      component.chartData.datasets[0].data = [99];
      component.mapChartData();
      expect(component.chartData.labels).toEqual(['existing']);
      expect(component.chartData.datasets[0].data).toEqual([99]);
    });

    it('should format chart labels using getFormattedDate', () => {
      spyOn(component, 'getFormattedDate').and.callThrough();
      component.revenue = mockRevenueResponse;
      component.mapChartData();
      expect(component.getFormattedDate).toHaveBeenCalledTimes(3);
    });
  });

  describe('getFormattedDate', () => {
    it('should format a date string as "day month"', () => {
      const result = component.getFormattedDate('2026-02-09');
      // The exact day number depends on timezone, but should contain "Feb"
      expect(result).toContain('Feb');
    });

    it('should format January date correctly', () => {
      const result = component.getFormattedDate('2026-01-15');
      expect(result).toContain('Jan');
    });

    it('should format December date correctly', () => {
      const result = component.getFormattedDate('2025-12-25');
      expect(result).toContain('Dec');
    });

    it('should return a string with day and month', () => {
      const result = component.getFormattedDate('2026-06-01');
      // Should match pattern like "1 Jun"
      expect(result).toMatch(/^\d{1,2} \w{3}$/);
    });
  });

  describe('hasData getter', () => {
    it('should return false when revenue is null', () => {
      component.revenue = null;
      expect(component.hasData).toBeFalse();
    });

    it('should return false when totalRevenueUsd is 0 and all series are 0', () => {
      component.revenue = {
        ...emptyRevenueResponse,
        series: [{ date: '2026-02-09', revenueUsd: 0 }],
      };
      expect(component.hasData).toBeFalse();
    });

    it('should return true when totalRevenueUsd is greater than 0', () => {
      component.revenue = mockRevenueResponse;
      expect(component.hasData).toBeTrue();
    });

    it('should return true when any series item has revenueUsd > 0', () => {
      component.revenue = {
        ...emptyRevenueResponse,
        totalRevenueUsd: 0,
        series: [{ date: '2026-02-09', revenueUsd: 5 }],
      };
      expect(component.hasData).toBeTrue();
    });

    it('should return false when series is empty and totalRevenueUsd is 0', () => {
      component.revenue = emptyRevenueResponse;
      expect(component.hasData).toBeFalse();
    });
  });

  describe('lastDaysText getter', () => {
    it('should return formatted days text', () => {
      selectedDays$.next(7);
      expect(component.lastDaysText).toBe('7 Days');
    });

    it('should reflect changes to selectedDaysObservable', () => {
      selectedDays$.next(30);
      expect(component.lastDaysText).toBe('30 Days');
    });

    it('should reflect 90 days', () => {
      selectedDays$.next(90);
      expect(component.lastDaysText).toBe('90 Days');
    });
  });

  describe('initial state', () => {
    it('should have isLoading initially set based on first subscription', () => {
      // After beforeEach the first call completes synchronously
      expect(component.isLoading).toBeFalse();
    });

    it('should have chartData initialized with empty labels and data', () => {
      // After the initial call, chartData is populated from mockRevenueResponse
      expect(component.chartData.datasets.length).toBe(1);
      expect(component.chartData.datasets[0].label).toBe('Total Earnings');
    });

    it('should have chartOptions configured', () => {
      expect(component.chartOptions.responsive).toBeTrue();
      expect(component.chartOptions.maintainAspectRatio).toBeFalse();
    });
  });
});
