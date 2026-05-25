import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SimpleChange, SimpleChanges } from '@angular/core';
import { CountryViewerData } from '@app-types/onboarding';

import { PotentialEarningComponent } from './potential-earning.component';

describe('PotentialEarningComponent', () => {
  let component: PotentialEarningComponent;
  let fixture: ComponentFixture<PotentialEarningComponent>;

  const mockCountryData: CountryViewerData[] = [
    {
      countryCode: 'KE',
      countryName: 'Kenya',
      flagEmoji: 'ke.svg',
      flag: 'ke.svg',
      viewersInSponspayCountry: 1000,
      creditCardMarketShare: 6.35,
      mobileSimCardMarketShare: 79,
    },
    {
      countryCode: 'NG',
      countryName: 'Nigeria',
      flagEmoji: 'ng.svg',
      flag: 'ng.svg',
      viewersInSponspayCountry: 2000,
      creditCardMarketShare: 66.7,
      mobileSimCardMarketShare: 89,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PotentialEarningComponent, HttpClientTestingModule],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PotentialEarningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.countryViewerData).toEqual([]);
    expect(component.totalSubscribers).toBe(0);
    expect(component.sponspayPayablePercent).toBe(0);
    expect(component.selectedCountry).toBeNull();
  });

  it('should have a backToResults EventEmitter', () => {
    expect(component.backToResults).toBeDefined();
    expect(component.backToResults.subscribe).toBeDefined();
  });

  describe('ngOnChanges', () => {
    it('should set selectedCountry to country with most viewers when countryViewerData changes', () => {
      component.countryViewerData = mockCountryData;
      const changes: SimpleChanges = {
        countryViewerData: new SimpleChange(null, mockCountryData, true),
      };
      component.ngOnChanges(changes);
      // Component selects the country with the highest viewersInSponspayCountry
      expect(component.selectedCountry).toEqual(mockCountryData[1]); // Nigeria (2000 > 1000)
    });

    it('should set selectedCountry to null when countryViewerData is empty', () => {
      component.countryViewerData = [];
      const changes: SimpleChanges = {
        countryViewerData: new SimpleChange(null, [], true),
      };
      component.ngOnChanges(changes);
      expect(component.selectedCountry).toBeNull();
    });

    it('should not update selectedCountry when other inputs change', () => {
      component.selectedCountry = mockCountryData[0];
      const changes: SimpleChanges = {
        totalSubscribers: new SimpleChange(0, 100, false),
      };
      component.ngOnChanges(changes);
      expect(component.selectedCountry).toEqual(mockCountryData[0]);
    });
  });

  describe('displayCountryData', () => {
    it('should return countryViewerData', () => {
      component.countryViewerData = mockCountryData;
      expect(component.displayCountryData).toEqual(mockCountryData);
    });

    it('should return empty array when no data', () => {
      expect(component.displayCountryData).toEqual([]);
    });
  });

  describe('paymentCalculations', () => {
    it('should calculate payment access for each country', () => {
      component.countryViewerData = mockCountryData;
      const calcs = component.paymentCalculations;
      expect(calcs.length).toBe(2);

      // Kenya: viewers=1000, creditCard=6.35%, mobile=79%
      expect(calcs[0].avgTotalViewersWithYouTubeAccess).toBe(64);
      expect(calcs[0].avgAdditionalViewersWithPaymentAccess).toBe(790);
      expect(calcs[0].avgTotalViewersWithPaymentAccess).toBe(854);
    });

    it('should return empty array when no country data', () => {
      component.countryViewerData = [];
      expect(component.paymentCalculations).toEqual([]);
    });
  });

  describe('totalYouTubeAccess', () => {
    it('should sum all avgTotalViewersWithYouTubeAccess', () => {
      component.countryViewerData = mockCountryData;
      expect(component.totalYouTubeAccess).toBe(64 + 1334);
    });

    it('should return 0 when no data', () => {
      expect(component.totalYouTubeAccess).toBe(0);
    });
  });

  describe('totalAdditionalAccess', () => {
    it('should sum all avgAdditionalViewersWithPaymentAccess', () => {
      component.countryViewerData = mockCountryData;
      expect(component.totalAdditionalAccess).toBe(790 + 1780);
    });
  });

  describe('totalPaymentAccess', () => {
    it('should sum all avgTotalViewersWithPaymentAccess', () => {
      component.countryViewerData = mockCountryData;
      expect(component.totalPaymentAccess).toBe(854 + 3114);
    });
  });

  describe('calculateMultiple', () => {
    it('should return the ratio of totalPaymentAccess to totalYouTubeAccess', () => {
      component.countryViewerData = mockCountryData;
      const multiple = component.calculateMultiple();
      const expected = (component.totalPaymentAccess / component.totalYouTubeAccess).toFixed(1);
      expect(multiple).toBe(expected);
    });

    it('should return 0 when totalYouTubeAccess is 0', () => {
      component.countryViewerData = [];
      expect(component.calculateMultiple()).toBe('0');
    });
  });

  describe('goBackToResults', () => {
    it('should emit backToResults and prevent default', () => {
      spyOn(component.backToResults, 'emit');
      const mockEvent = jasmine.createSpyObj('Event', ['preventDefault']);
      component.goBackToResults(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(component.backToResults.emit).toHaveBeenCalled();
    });
  });
});
