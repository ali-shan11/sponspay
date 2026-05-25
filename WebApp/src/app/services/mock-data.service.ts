import { Injectable } from '@angular/core';
import { minimumNumberOfSubscribers } from '@utils/constants';
import { SvgCountryFlags } from '@utils/svg-icons';

export interface MockDataScenario {
  subscribers: number;
  hasViewers: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MockDataService {

  private readonly MARKET_SHARE_DATA = {
    'KE': { creditCard: 6.35, mobileSimCard: 79 },
    'UG': { creditCard: 36, mobileSimCard: 65 },
    'SA': { creditCard: 0.31, mobileSimCard: 73 },
    'TZ': { creditCard: 0.31, mobileSimCard: 73 },
    'NG': { creditCard: 66.70, mobileSimCard: 89 },
    'SU': { creditCard: 66.70, mobileSimCard: 89 }
  };

  private readonly TEST_SCENARIOS: MockDataScenario[] = [
    { subscribers: 850, hasViewers: true },   // Scenario 1: >250 with viewers
    { subscribers: 500, hasViewers: false },  // Scenario 2: >250 without viewers  
    { subscribers: 240, hasViewers: false }   // Scenario 3: <250 subscribers
  ];

  /**
   * Generates mock subscriber and viewer data based on test scenarios
   * @param currentSubscribers Optional current subscriber count to use as base
   * @returns Object with totalSubscribers and totalViewersInSupportedCountries
   */
  generateMockAnalyticsData(currentSubscribers?: number): { totalSubscribers: number, totalViewersInSupportedCountries: number } {
    let baseSubscribers = currentSubscribers;
    
    // If no subscriber count provided, cycle through test scenarios
    if (!baseSubscribers) {
      // Use timestamp to cycle through scenarios for testing
      const scenarioIndex = Math.floor(Date.now() / 10000) % this.TEST_SCENARIOS.length;
      const scenario = this.TEST_SCENARIOS[scenarioIndex];
      
      baseSubscribers = scenario.subscribers;
      
      console.log(`Using mock scenario ${scenarioIndex + 1}: ${baseSubscribers} subscribers, hasViewers: ${scenario.hasViewers}`);
      
      const totalViewersInSupportedCountries = scenario.hasViewers 
        ? Math.floor(baseSubscribers * 0.15) // 15% of subscribers as viewers
        : 0;

      return {
        totalSubscribers: baseSubscribers,
        totalViewersInSupportedCountries
      };
    } else {
      // Use actual subscriber count but generate mock analytics data
      const totalViewersInSupportedCountries = baseSubscribers >= minimumNumberOfSubscribers
        ? Math.floor(baseSubscribers * 0.15) // Qualified channel - 15% of subscribers as viewers
        : Math.floor(Math.random() * 50); // Not qualified - very few viewers

      return {
        totalSubscribers: baseSubscribers,
        totalViewersInSupportedCountries
      };
    }
  }

  /**
   * Generates country viewer data with random distribution
   * @param totalViewers Total viewers to distribute across countries
   * @returns Array of CountryViewerData with random distribution
   */
  // generateMockCountryViewerData(totalViewers: number): CountryViewerData[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateMockCountryViewerData(totalViewers: number): any[] {
    // Generate random distribution that always sums to totalViewers
    const randomDistribution = this.generateRandomDistribution(totalViewers, 6);
    
    return [
      {
        countryCode: 'KE',
        countryName: 'Kenya',
        flagEmoji: '🇰🇪',
        flag: SvgCountryFlags.kenya,
        viewersInSponspayCountry: randomDistribution[0],
        creditCardMarketShare: this.MARKET_SHARE_DATA.KE.creditCard,
        mobileSimCardMarketShare: this.MARKET_SHARE_DATA.KE.mobileSimCard
      },
      {
        countryCode: 'SA',
        countryName: 'South Africa',
        flagEmoji: '🇰🇪',
        flag: SvgCountryFlags.southAfrica,
        viewersInSponspayCountry: randomDistribution[1],
        creditCardMarketShare: this.MARKET_SHARE_DATA.SA.creditCard,
        mobileSimCardMarketShare: this.MARKET_SHARE_DATA.SA.mobileSimCard
      },
      {
        countryCode: 'TZ',
        countryName: 'Tanzania',
        flagEmoji: '🇹🇿',
        flag: SvgCountryFlags.tanzania,
        viewersInSponspayCountry: randomDistribution[2],
        creditCardMarketShare: this.MARKET_SHARE_DATA.TZ.creditCard,
        mobileSimCardMarketShare: this.MARKET_SHARE_DATA.TZ.mobileSimCard
      },
      {
        countryCode: 'UG',
        countryName: 'Uganda',
        flagEmoji: '🇺🇬',
        flag: SvgCountryFlags.uganda,
        viewersInSponspayCountry: randomDistribution[3],
        creditCardMarketShare: this.MARKET_SHARE_DATA.UG.creditCard,
        mobileSimCardMarketShare: this.MARKET_SHARE_DATA.UG.mobileSimCard
      },
      {
        countryCode: 'NG',
        countryName: 'Nigeria',
        flagEmoji: '🇳🇬',
        flag: SvgCountryFlags.nigeria,
        viewersInSponspayCountry: randomDistribution[4],
        creditCardMarketShare: this.MARKET_SHARE_DATA.NG.creditCard,
        mobileSimCardMarketShare: this.MARKET_SHARE_DATA.NG.mobileSimCard
      },
      {
        countryCode: 'SU',
        countryName: 'South Sudan',
        flagEmoji: '🇳🇬',
        flag: SvgCountryFlags.southSudan,
        viewersInSponspayCountry: randomDistribution[5],
        creditCardMarketShare: this.MARKET_SHARE_DATA.NG.creditCard,
        mobileSimCardMarketShare: this.MARKET_SHARE_DATA.NG.mobileSimCard
      }
    ];
  }

  /**
   * Generates a random distribution of integers that sum exactly to the total
   * @param total The total number to distribute
   * @param parts The number of parts to distribute into
   * @returns Array of integers that sum to total
   */
  private generateRandomDistribution(total: number, parts: number): number[] {
    if (total === 0) {
      return new Array(parts).fill(0);
    }
    
    if (total < parts) {
      // If total is less than parts, randomly assign 1 to some parts and 0 to others
      const distribution = new Array(parts).fill(0);
      const indices = Array.from({length: parts}, (_, i) => i);
      
      // Shuffle indices and assign 1 to first 'total' positions
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      
      for (let i = 0; i < total; i++) {
        distribution[indices[i]] = 1;
      }
      
      return distribution;
    }
    
    // Generate random weights
    const weights = [];
    for (let i = 0; i < parts; i++) {
      weights.push(Math.random());
    }
    
    // Normalize weights to sum to 1
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    const normalizedWeights = weights.map(weight => weight / weightSum);
    
    // Convert to integer distribution
    const distribution = normalizedWeights.map(weight => Math.floor(weight * total));
    
    // Distribute remainder to ensure exact sum
    const currentSum = distribution.reduce((sum, value) => sum + value, 0);
    let remainder = total - currentSum;
    
    // Randomly distribute the remainder
    while (remainder > 0) {
      const randomIndex = Math.floor(Math.random() * parts);
      distribution[randomIndex]++;
      remainder--;
    }
    
    return distribution;
  }
}
