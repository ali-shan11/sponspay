import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { MessageUnitStatistics } from '@app-types/transaction-activity';
import { TransactionTopEarningCountryComponent } from './transaction-top-earning-country.component';

describe('TransactionTopEarningCountryComponent', () => {
  let component: TransactionTopEarningCountryComponent;
  let fixture: ComponentFixture<TransactionTopEarningCountryComponent>;

  const mockStats: MessageUnitStatistics = {
    current30Days: { totalUsd: 100, averageUsd: 3.33, transactionCount: 30 },
    previous30Days: { totalUsd: 80, averageUsd: 2.67, transactionCount: 24 },
    changePercentage: 25,
    monthlyAverages: [{ month: 'Jan', averagePerDayUsd: 10 }],
    topCountries: [
      { countryCode: 'KE', countryName: 'Kenya', flag: 'svg-country-flags/svg/ke.svg', totalUsd: 60 },
      { countryCode: 'NG', countryName: 'Nigeria', flag: 'svg-country-flags/svg/ng.svg', totalUsd: 30 },
      { countryCode: 'ZM', countryName: 'Zambia', flag: 'svg-country-flags/svg/zm.svg', totalUsd: 10 },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionTopEarningCountryComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionTopEarningCountryComponent);
    component = fixture.componentInstance;
    component.isLoading = false;
    component.messageStats = null;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnChanges', () => {
    it('should reset selectedIndex to 0 when messageStats changes', () => {
      component.selectedIndex = 2;
      component.ngOnChanges({
        messageStats: new SimpleChange(null, mockStats, false),
      });
      expect(component.selectedIndex).toBe(0);
    });

    it('should not reset selectedIndex for unrelated changes', () => {
      component.selectedIndex = 2;
      component.ngOnChanges({
        isLoading: new SimpleChange(true, false, false),
      });
      expect(component.selectedIndex).toBe(2);
    });
  });

  describe('currentCountry', () => {
    it('should return null when messageStats is null', () => {
      component.messageStats = null;
      expect(component.currentCountry).toBeNull();
    });

    it('should return null when topCountries is empty', () => {
      component.messageStats = { ...mockStats, topCountries: [] };
      expect(component.currentCountry).toBeNull();
    });

    it('should return the country at selectedIndex', () => {
      component.messageStats = mockStats;
      component.selectedIndex = 0;
      expect(component.currentCountry!.countryCode).toBe('KE');

      component.selectedIndex = 1;
      expect(component.currentCountry!.countryCode).toBe('NG');
    });
  });

  describe('totalCountries', () => {
    it('should return 0 when messageStats is null', () => {
      component.messageStats = null;
      expect(component.totalCountries).toBe(0);
    });

    it('should return the count of topCountries', () => {
      component.messageStats = mockStats;
      expect(component.totalCountries).toBe(3);
    });
  });

  describe('positionLabel', () => {
    it('should return 1-based position label', () => {
      component.selectedIndex = 0;
      expect(component.positionLabel).toBe('#1');

      component.selectedIndex = 2;
      expect(component.positionLabel).toBe('#3');
    });
  });

  describe('showArrows', () => {
    it('should return false when there is 0 or 1 country', () => {
      component.messageStats = null;
      expect(component.showArrows).toBeFalse();

      component.messageStats = { ...mockStats, topCountries: [mockStats.topCountries[0]] };
      expect(component.showArrows).toBeFalse();
    });

    it('should return true when there are multiple countries', () => {
      component.messageStats = mockStats;
      expect(component.showArrows).toBeTrue();
    });
  });

  describe('goLeft', () => {
    it('should decrement selectedIndex when not at the start', () => {
      component.messageStats = mockStats;
      component.selectedIndex = 2;
      component.goLeft();
      expect(component.selectedIndex).toBe(1);
    });

    it('should not go below 0', () => {
      component.messageStats = mockStats;
      component.selectedIndex = 0;
      component.goLeft();
      expect(component.selectedIndex).toBe(0);
    });
  });

  describe('goRight', () => {
    it('should increment selectedIndex when not at the end', () => {
      component.messageStats = mockStats;
      component.selectedIndex = 0;
      component.goRight();
      expect(component.selectedIndex).toBe(1);
    });

    it('should not go beyond the last country', () => {
      component.messageStats = mockStats;
      component.selectedIndex = 2;
      component.goRight();
      expect(component.selectedIndex).toBe(2);
    });
  });
});
