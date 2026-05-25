import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { DashboardService } from '@services/dashboard.service';
import { PaymentOverviewResponse, PaymentOverviewItem } from '@app-types/dashboard';

import { PaymentOverviewComponent } from './payment-overview.component';

describe('PaymentOverviewComponent', () => {
  let component: PaymentOverviewComponent;
  let fixture: ComponentFixture<PaymentOverviewComponent>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardService>;

  const mockItems: PaymentOverviewItem[] = [
    {
      countryCode: 'NGA',
      localCurrencyCode: 'NGN',
      hasAccount: true,
      totalLocal: 500,
      totalUsd: 1.20,
      nextPayAmountLocal: 400,
      nextPayAmountUsd: 0.96,
      nextPayDate: '2026-02-01',
      premiumMessages: 10,
      livestreamMessages: 7,
      videoMessages: 3,
      mobileNumber: null,
      livestreamTotalLocal: 300,
      livestreamTotalUsd: 0.72,
      videoTotalLocal: 200,
      videoTotalUsd: 0.48,
      uniqueLivestreams: 1,
      averageMessageValue: 50,
      totalFees: 5,
      averageFee: 0.5,
      feePercentage: 1.0,
    },
    {
      countryCode: 'KEN',
      localCurrencyCode: 'KES',
      hasAccount: false,
      totalLocal: 300,
      totalUsd: 2.50,
      nextPayAmountLocal: null,
      nextPayAmountUsd: null,
      nextPayDate: null,
      premiumMessages: 5,
      livestreamMessages: 0,
      videoMessages: 5,
      mobileNumber: null,
      livestreamTotalLocal: 0,
      livestreamTotalUsd: 0,
      videoTotalLocal: 300,
      videoTotalUsd: 2.50,
      uniqueLivestreams: 0,
      averageMessageValue: 60,
      totalFees: 3,
      averageFee: 0.6,
      feePercentage: 1.0,
    },
  ];

  const mockResponse: PaymentOverviewResponse = {
    days: 30,
    items: mockItems,
  };

  beforeEach(async () => {
    dashboardServiceSpy = jasmine.createSpyObj('DashboardService',
      ['getPaymentOverview'],
      {
        selectedDaysObservable: new BehaviorSubject<number>(30),
        selectedChannelObservable: new BehaviorSubject<string>(''),
        refresh$: new Subject<void>(),
      }
    );

    await TestBed.configureTestingModule({
      imports: [PaymentOverviewComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
        { provide: DashboardService, useValue: dashboardServiceSpy },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call subDaysChange on init', () => {
      expect(component.unSubscribe.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe all subscriptions', () => {
      const sub1 = jasmine.createSpyObj('Subscription', ['unsubscribe']);
      const sub2 = jasmine.createSpyObj('Subscription', ['unsubscribe']);
      component.unSubscribe.push(sub1, sub2);

      component.ngOnDestroy();

      expect(sub1.unsubscribe).toHaveBeenCalledTimes(1);
      expect(sub2.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should handle empty subscription array', () => {
      component.unSubscribe = [];
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('subDaysChange', () => {
    it('should not call getPaymentOverview when channelId is empty', () => {
      // channelId starts as '' so filter skips it
      expect(dashboardServiceSpy.getPaymentOverview).not.toHaveBeenCalled();
    });

    it('should call getPaymentOverview when both days and channel are set', () => {
      dashboardServiceSpy.getPaymentOverview.and.returnValue(of(mockResponse));

      // Emit a channel value to trigger the combineLatest
      (dashboardServiceSpy as any).selectedChannelObservable.next('test-channel');

      expect(dashboardServiceSpy.getPaymentOverview).toHaveBeenCalled();
    });
  });

  describe('openDrawer', () => {
    it('should set drawer data and selectedOption, then call open', () => {
      component.paymentData = { ...mockResponse };
      component.filteredItems = [...mockResponse.items];
      component.drawer = {
        data: [],
        selectedOption: 0,
        open: jasmine.createSpy('open'),
      } as any;

      component.openDrawer(1);

      expect(component.drawer.data).toBe(component.filteredItems);
      expect(component.drawer.selectedOption).toBe(1);
      expect(component.drawer.open).toHaveBeenCalledTimes(1);
    });
  });

  describe('onSearch', () => {
    beforeEach(() => {
      component.paymentData = { ...mockResponse, items: [...mockItems] };
    });

    it('should return all items when search term is empty', () => {
      component.onSearch('');
      expect(component.filteredItems.length).toBe(2);
    });

    it('should filter by country code', () => {
      component.onSearch('NGA');
      expect(component.filteredItems.length).toBe(1);
      expect(component.filteredItems[0].countryCode).toBe('NGA');
    });

    it('should filter by full country name', () => {
      component.onSearch('kenya');
      expect(component.filteredItems.length).toBe(1);
      expect(component.filteredItems[0].countryCode).toBe('KEN');
    });

    it('should filter by currency code', () => {
      component.onSearch('NGN');
      expect(component.filteredItems.length).toBe(1);
      expect(component.filteredItems[0].localCurrencyCode).toBe('NGN');
    });

    it('should be case-insensitive', () => {
      component.onSearch('ken');
      expect(component.filteredItems.length).toBe(1);
      expect(component.filteredItems[0].countryCode).toBe('KEN');
    });

    it('should return empty array when no match', () => {
      component.onSearch('xyz');
      expect(component.filteredItems.length).toBe(0);
    });

    it('should not throw when paymentData is undefined', () => {
      component.paymentData = undefined as any;
      expect(() => component.onSearch('test')).not.toThrow();
    });
  });

  describe('getPaymentOverview', () => {
    it('should set isLoading to true, call service, and update paymentData on success', () => {
      dashboardServiceSpy.getPaymentOverview.and.returnValue(of(mockResponse));

      component.getPaymentOverview();

      expect(component.isLoading).toBe(false);
      expect(dashboardServiceSpy.getPaymentOverview).toHaveBeenCalled();
      expect(component.paymentData).toBeDefined();
      expect(component.paymentData.items.length).toBe(2);
    });

    it('should map flag property on each item', () => {
      dashboardServiceSpy.getPaymentOverview.and.returnValue(of(mockResponse));

      component.getPaymentOverview();

      component.paymentData.items.forEach((item) => {
        expect(item.flag).toBeDefined();
      });
    });

    it('should set isLoading to false on error', () => {
      dashboardServiceSpy.getPaymentOverview.and.returnValue(throwError(() => new Error('API Error')));

      component.getPaymentOverview();

      expect(component.isLoading).toBe(false);
    });
  });

  describe('properties', () => {
    it('should initialize isLoading to false', () => {
      expect(component.isLoading).toBe(false);
    });

    it('should have countryIcon defined', () => {
      expect(component.countryIcon).toBeDefined();
    });

    it('should have svgIcon defined', () => {
      expect(component.svgIcon).toBeDefined();
    });

    it('should have unSubscribe as an array', () => {
      expect(Array.isArray(component.unSubscribe)).toBe(true);
    });

    it('should have dashboardService injected', () => {
      expect(component.dashboardService).toBeDefined();
    });
  });
});
