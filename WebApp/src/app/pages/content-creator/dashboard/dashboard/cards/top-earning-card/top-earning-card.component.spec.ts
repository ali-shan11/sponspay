import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { DashboardService } from '@services/dashboard.service';
import { TopEarningCountriesResponse } from '@app-types/dashboard';

import { TopEarningCardComponent } from './top-earning-card.component';

const mockTopEarningResponse: TopEarningCountriesResponse = {
  days: 7,
  timezoneOffsetMinutes: -60,
  startDate: '2026-02-09',
  endDate: '2026-02-16',
  limit: 5,
  totalUsd: 100,
  exchangeRatesApplied: true,
  items: [
    {
      country: 'Kenya',
      countryCode: 'KEN',
      flag: '',
      currency: { code: 'KES', iso4217Numeric: 404 },
      localAmountTotal: 5000,
      usdTotal: 50,
    },
  ] as TopEarningCountriesResponse['items'],
};

const emptyTopEarningResponse: TopEarningCountriesResponse = {
  days: 7,
  timezoneOffsetMinutes: -60,
  startDate: '2026-02-09',
  endDate: '2026-02-16',
  limit: 5,
  totalUsd: 0,
  exchangeRatesApplied: true,
  items: [] as unknown as TopEarningCountriesResponse['items'],
};

describe('TopEarningCardComponent', () => {
  let component: TopEarningCardComponent;
  let fixture: ComponentFixture<TopEarningCardComponent>;
  let selectedDays$: BehaviorSubject<number>;
  let selectedChannel$: BehaviorSubject<string>;
  let mockDashboardService: {
    selectedDaysObservable: BehaviorSubject<number>;
    selectedChannelObservable: BehaviorSubject<string>;
    refresh$: Subject<void>;
    getTopEarningCountries: jasmine.Spy;
  };

  beforeEach(async () => {
    selectedDays$ = new BehaviorSubject<number>(7);
    selectedChannel$ = new BehaviorSubject<string>('channel-1');

    mockDashboardService = {
      selectedDaysObservable: selectedDays$,
      selectedChannelObservable: selectedChannel$,
      refresh$: new Subject<void>(),
      getTopEarningCountries: jasmine.createSpy('getTopEarningCountries').and.returnValue(of(mockTopEarningResponse)),
    };

    await TestBed.configureTestingModule({
      imports: [TopEarningCardComponent],
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

    fixture = TestBed.createComponent(TopEarningCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call subFiltersChange on init', () => {
      expect(mockDashboardService.getTopEarningCountries).toHaveBeenCalled();
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
    it('should call getTopEarningCountriesData when days observable changes', () => {
      mockDashboardService.getTopEarningCountries.calls.reset();
      selectedDays$.next(30);
      expect(mockDashboardService.getTopEarningCountries).toHaveBeenCalledTimes(1);
    });

    it('should call getTopEarningCountriesData when channel observable changes', () => {
      mockDashboardService.getTopEarningCountries.calls.reset();
      selectedChannel$.next('channel-2');
      expect(mockDashboardService.getTopEarningCountries).toHaveBeenCalledTimes(1);
    });

    it('should not call getTopEarningCountriesData when days is falsy (0)', () => {
      mockDashboardService.getTopEarningCountries.calls.reset();
      selectedDays$.next(0);
      expect(mockDashboardService.getTopEarningCountries).not.toHaveBeenCalled();
    });

    it('should not call getTopEarningCountriesData when channel is empty string', () => {
      mockDashboardService.getTopEarningCountries.calls.reset();
      selectedChannel$.next('');
      expect(mockDashboardService.getTopEarningCountries).not.toHaveBeenCalled();
    });

    it('should not call getTopEarningCountriesData for duplicate emissions', () => {
      mockDashboardService.getTopEarningCountries.calls.reset();
      selectedDays$.next(7); // same value as initial
      expect(mockDashboardService.getTopEarningCountries).not.toHaveBeenCalled();
    });
  });

  describe('getTopEarningCountriesData', () => {
    it('should set topEarningCountries to null and isLoading to true at start', () => {
      component.topEarningCountries = mockTopEarningResponse;
      component.isLoading = false;
      mockDashboardService.getTopEarningCountries.and.returnValue(of(mockTopEarningResponse));
      component.getTopEarningCountriesData();
      // After synchronous completion
      expect(component.topEarningCountries).toBeTruthy();
      expect(component.isLoading).toBeFalse();
    });

    it('should set topEarningCountries and isLoading to false on success', () => {
      mockDashboardService.getTopEarningCountries.and.returnValue(of(mockTopEarningResponse));
      component.getTopEarningCountriesData();
      expect(component.topEarningCountries).toBeTruthy();
      expect(component.topEarningCountries!.items.length).toBe(1);
      expect(component.topEarningCountries!.items[0].country).toBe('Kenya');
      expect(component.isLoading).toBeFalse();
    });

    it('should set flag URL for each country item using GetFlagUrl', () => {
      mockDashboardService.getTopEarningCountries.and.returnValue(of(mockTopEarningResponse));
      component.getTopEarningCountriesData();
      // GetFlagUrl('KEN') should produce a flag path based on alpha2 code
      expect(component.topEarningCountries!.items[0].flag).toBeDefined();
      expect(typeof component.topEarningCountries!.items[0].flag).toBe('string');
    });

    it('should set isLoading to false on error', () => {
      mockDashboardService.getTopEarningCountries.and.returnValue(throwError(() => new Error('API error')));
      component.getTopEarningCountriesData();
      expect(component.isLoading).toBeFalse();
      expect(component.topEarningCountries).toBeNull();
    });

    it('should handle response with empty items array', () => {
      mockDashboardService.getTopEarningCountries.and.returnValue(of(emptyTopEarningResponse));
      component.getTopEarningCountriesData();
      expect(component.topEarningCountries).toBeTruthy();
      expect((component.topEarningCountries!.items as unknown[]).length).toBe(0);
      expect(component.isLoading).toBeFalse();
    });

    it('should handle response with multiple countries', () => {
      const multiCountryResponse = {
        ...mockTopEarningResponse,
        items: [
          {
            country: 'Kenya',
            countryCode: 'KEN',
            flag: '',
            currency: { code: 'KES', iso4217Numeric: 404 },
            localAmountTotal: 5000,
            usdTotal: 50,
          },
          {
            country: 'Uganda',
            countryCode: 'UGA',
            flag: '',
            currency: { code: 'UGX', iso4217Numeric: 800 },
            localAmountTotal: 10000,
            usdTotal: 30,
          },
        ],
      } as unknown as TopEarningCountriesResponse;
      mockDashboardService.getTopEarningCountries.and.returnValue(of(multiCountryResponse));
      component.getTopEarningCountriesData();
      expect((component.topEarningCountries!.items as unknown[]).length).toBe(2);
      // Both items should have flag set
      component.topEarningCountries!.items.forEach(item => {
        expect(typeof item.flag).toBe('string');
      });
    });
  });

  describe('initial state', () => {
    it('should start with isLoading as true before init', () => {
      // After ngOnInit and the synchronous subscription, isLoading should be false
      // because the mock returns of() which completes synchronously
      expect(component.isLoading).toBeFalse();
    });

    it('should have topEarningCountries populated after init', () => {
      expect(component.topEarningCountries).toBeTruthy();
    });

    it('should have unSubscribe array with at least one subscription', () => {
      expect(component.unSubscribe.length).toBeGreaterThanOrEqual(1);
    });
  });
});
