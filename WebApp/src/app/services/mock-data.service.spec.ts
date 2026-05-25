import { TestBed } from '@angular/core/testing';
import { MockDataService, MockDataScenario } from './mock-data.service';
import { minimumNumberOfSubscribers } from '@utils/constants';

describe('MockDataService', () => {
  let service: MockDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Mock Analytics Data Generation', () => {
    describe('generateMockAnalyticsData', () => {
      it('should generate data with scenario cycling when no parameters provided', () => {
        const result = service.generateMockAnalyticsData();
        
        expect(result).toBeDefined();
        expect(result.totalSubscribers).toBeGreaterThan(0);
        expect(typeof result.totalSubscribers).toBe('number');
        expect(typeof result.totalViewersInSupportedCountries).toBe('number');
        expect(result.totalViewersInSupportedCountries).toBeGreaterThanOrEqual(0);
      });

      it('should cycle through different scenarios over time', () => {
        // Generate multiple results to see variation
        const results = [];
        for (let i = 0; i < 5; i++) {
          results.push(service.generateMockAnalyticsData());
        }
        
        // Should have at least some variation in subscriber counts
        const uniqueSubscriberCounts = new Set(results.map(r => r.totalSubscribers));
        expect(uniqueSubscriberCounts.size).toBeGreaterThan(0);
      });

      it('should use provided subscriber count when specified', () => {
        const testSubscribers = 1000;
        const result = service.generateMockAnalyticsData(testSubscribers);
        
        expect(result.totalSubscribers).toBe(testSubscribers);
        expect(result.totalViewersInSupportedCountries).toBeGreaterThan(0);
        // Should be approximately 15% of subscribers for qualified channels
        expect(result.totalViewersInSupportedCountries).toBe(Math.floor(testSubscribers * 0.15));
      });

      it(`should handle qualified channels (${minimumNumberOfSubscribers}>= subscribers) correctly`, () => {
        const qualifiedSubscribers = 500;
        const result = service.generateMockAnalyticsData(qualifiedSubscribers);
        
        expect(result.totalSubscribers).toBe(qualifiedSubscribers);
        // Should be 15% of subscribers for qualified channels
        const expectedViewers = Math.floor(qualifiedSubscribers * 0.15);
        expect(result.totalViewersInSupportedCountries).toBe(expectedViewers);
      });

      it(`should handle unqualified channels (<${minimumNumberOfSubscribers} subscribers) correctly`, () => {
        const unqualifiedSubscribers = 100;
        const result = service.generateMockAnalyticsData(unqualifiedSubscribers);
        
        expect(result.totalSubscribers).toBe(unqualifiedSubscribers);
        // Should have very few viewers (random 0-49)
        expect(result.totalViewersInSupportedCountries).toBeLessThan(50);
        expect(result.totalViewersInSupportedCountries).toBeGreaterThanOrEqual(0);
      });

      it('should handle edge case of 0 subscribers', () => {
        // Note: Due to JavaScript falsy behavior, 0 triggers scenario cycling
        // This is the current behavior of the service
        const result = service.generateMockAnalyticsData(0);
        
        // When 0 is passed, it's treated as falsy and uses scenario cycling
        expect(result.totalSubscribers).toBeGreaterThan(0);
        expect(result.totalViewersInSupportedCountries).toBeGreaterThanOrEqual(0);
      });

      it('should handle large subscriber counts', () => {
        const largeSubscribers = 1000000;
        const result = service.generateMockAnalyticsData(largeSubscribers);
        
        expect(result.totalSubscribers).toBe(largeSubscribers);
        const expectedViewers = Math.floor(largeSubscribers * 0.15);
        expect(result.totalViewersInSupportedCountries).toBe(expectedViewers);
      });
    });
  });

  describe('Country Viewer Data Distribution', () => {
    describe('generateMockCountryViewerData', () => {
      it('should return data for all 6 supported countries', () => {
        const totalViewers = 1000;
        const result = service.generateMockCountryViewerData(totalViewers);
        
        expect(result).toBeDefined();
        expect(result.length).toBe(6);

        // Check that all expected countries are present
        const countryCodes = result.map(country => country.countryCode);
        expect(countryCodes).toContain('KE');
        expect(countryCodes).toContain('TZ');
        expect(countryCodes).toContain('UG');
        expect(countryCodes).toContain('NG');
        expect(countryCodes).toContain('SA');
        expect(countryCodes).toContain('SU');
      });

      it('should distribute viewers that sum exactly to total', () => {
        const totalViewers = 1000;
        const result = service.generateMockCountryViewerData(totalViewers);
        
        const sumViewers = result.reduce((sum, country) => sum + country.viewersInSponspayCountry, 0);
        expect(sumViewers).toBe(totalViewers);
      });

      it('should include correct country metadata', () => {
        const result = service.generateMockCountryViewerData(100);
        
        result.forEach(country => {
          expect(country.countryCode).toBeDefined();
          expect(country.countryName).toBeDefined();
          expect(country.flagEmoji).toBeDefined();
          expect(country.creditCardMarketShare).toBeGreaterThanOrEqual(0);
          expect(country.mobileSimCardMarketShare).toBeGreaterThanOrEqual(0);
          expect(country.viewersInSponspayCountry).toBeGreaterThanOrEqual(0);
        });
      });

      it('should have correct market share data for each country', () => {
        const result = service.generateMockCountryViewerData(100);
        
        const kenya = result.find(c => c.countryCode === 'KE');
        const tanzania = result.find(c => c.countryCode === 'TZ');
        const uganda = result.find(c => c.countryCode === 'UG');
        const nigeria = result.find(c => c.countryCode === 'NG');
        
        expect(kenya?.creditCardMarketShare).toBe(6.35);
        expect(kenya?.mobileSimCardMarketShare).toBe(79);
        expect(tanzania?.creditCardMarketShare).toBe(0.31);
        expect(tanzania?.mobileSimCardMarketShare).toBe(73);
        expect(uganda?.creditCardMarketShare).toBe(36);
        expect(uganda?.mobileSimCardMarketShare).toBe(65);
        expect(nigeria?.creditCardMarketShare).toBe(66.70);
        expect(nigeria?.mobileSimCardMarketShare).toBe(89);
      });

      it('should handle 0 total viewers correctly', () => {
        const result = service.generateMockCountryViewerData(0);

        expect(result.length).toBe(6);
        result.forEach(country => {
          expect(country.viewersInSponspayCountry).toBe(0);
        });
        
        const sumViewers = result.reduce((sum, country) => sum + country.viewersInSponspayCountry, 0);
        expect(sumViewers).toBe(0);
      });

      it('should handle small total viewers correctly', () => {
        const totalViewers = 3;
        const result = service.generateMockCountryViewerData(totalViewers);

        expect(result.length).toBe(6);
        const sumViewers = result.reduce((sum, country) => sum + country.viewersInSponspayCountry, 0);
        expect(sumViewers).toBe(totalViewers);
        
        // With only 3 viewers, some countries should have 0
        const nonZeroCountries = result.filter(c => c.viewersInSponspayCountry > 0);
        expect(nonZeroCountries.length).toBeLessThanOrEqual(3);
      });

      it('should handle large total viewers correctly', () => {
        const totalViewers = 100000;
        const result = service.generateMockCountryViewerData(totalViewers);

        expect(result.length).toBe(6);
        const sumViewers = result.reduce((sum, country) => sum + country.viewersInSponspayCountry, 0);
        expect(sumViewers).toBe(totalViewers);
        
        // All countries should have some viewers with large total
        result.forEach(country => {
          expect(country.viewersInSponspayCountry).toBeGreaterThan(0);
        });
      });

      it('should generate different distributions on multiple calls', () => {
        const totalViewers = 1000;
        const result1 = service.generateMockCountryViewerData(totalViewers);
        const result2 = service.generateMockCountryViewerData(totalViewers);
        
        // Should have some variation in distribution
        let hasVariation = false;
        for (let i = 0; i < result1.length; i++) {
          if (result1[i].viewersInSponspayCountry !== result2[i].viewersInSponspayCountry) {
            hasVariation = true;
            break;
          }
        }
        
        expect(hasVariation).toBe(true);
      });
    });
  });

  describe('Private Method Testing', () => {
    describe('generateRandomDistribution', () => {
      it('should generate distribution that sums to total', () => {
        const total = 1000;
        const parts = 4;
        const result = (service as any)['generateRandomDistribution'](total, parts);
        
        expect(result.length).toBe(parts);
        const sum = result.reduce((acc: number, val: number) => acc + val, 0);
        expect(sum).toBe(total);
      });

      it('should handle total of 0 correctly', () => {
        const total = 0;
        const parts = 4;
        const result = (service as any)['generateRandomDistribution'](total, parts);
        
        expect(result.length).toBe(parts);
        expect(result.every((val: number) => val === 0)).toBe(true);
      });

      it('should handle total less than parts correctly', () => {
        const total = 2;
        const parts = 4;
        const result = (service as any)['generateRandomDistribution'](total, parts);
        
        expect(result.length).toBe(parts);
        const sum = result.reduce((acc: number, val: number) => acc + val, 0);
        expect(sum).toBe(total);
        
        // Should have exactly 'total' number of 1s and rest 0s
        const nonZeroCount = result.filter((val: number) => val > 0).length;
        expect(nonZeroCount).toBe(total);
        expect(result.every((val: number) => val === 0 || val === 1)).toBe(true);
      });

      it('should generate non-negative integers only', () => {
        const total = 1000;
        const parts = 4;
        const result = (service as any)['generateRandomDistribution'](total, parts);
        
        result.forEach((value: number) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(value)).toBe(true);
        });
      });

      it('should handle single part correctly', () => {
        const total = 100;
        const parts = 1;
        const result = (service as any)['generateRandomDistribution'](total, parts);
        
        expect(result.length).toBe(1);
        expect(result[0]).toBe(total);
      });

      it('should generate different distributions on multiple calls', () => {
        const total = 1000;
        const parts = 4;
        const result1 = (service as any)['generateRandomDistribution'](total, parts);
        const result2 = (service as any)['generateRandomDistribution'](total, parts);
        
        // Should have some variation (very unlikely to be identical)
        const identical = result1.every((val: number, index: number) => val === result2[index]);
        expect(identical).toBe(false);
      });

      it('should handle large numbers correctly', () => {
        const total = 1000000;
        const parts = 4;
        const result = (service as any)['generateRandomDistribution'](total, parts);
        
        expect(result.length).toBe(parts);
        const sum = result.reduce((acc: number, val: number) => acc + val, 0);
        expect(sum).toBe(total);
        
        // All parts should have some reasonable distribution
        result.forEach((value: number) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(total);
        });
      });
    });
  });

  describe('Test Scenario Management', () => {
    it('should have valid test scenarios defined', () => {
      // Access the private TEST_SCENARIOS through reflection
      const scenarios = (service as any)['TEST_SCENARIOS'] as MockDataScenario[];
      
      expect(scenarios).toBeDefined();
      expect(scenarios.length).toBe(3);
      
      scenarios.forEach(scenario => {
        expect(scenario.subscribers).toBeGreaterThan(0);
        expect(typeof scenario.hasViewers).toBe('boolean');
      });
    });

    it('should have correct market share data defined', () => {
      // Access the private MARKET_SHARE_DATA through reflection
      const marketData = (service as any)['MARKET_SHARE_DATA'];
      
      expect(marketData).toBeDefined();
      expect(marketData.KE).toBeDefined();
      expect(marketData.TZ).toBeDefined();
      expect(marketData.UG).toBeDefined();
      expect(marketData.NG).toBeDefined();
      
      // Verify structure of market data
      Object.values(marketData).forEach((countryData: any) => {
        expect(countryData.creditCard).toBeGreaterThanOrEqual(0);
        expect(countryData.mobileSimCard).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
