/**
 * Mock analytics data for revenue estimation testing
 * Based on the supported countries: Kenya, Tanzania, Uganda, Nigeria
 */

/**
 * Supported countries for SponsPay revenue estimation
 */
export const supportedCountries = ['KE', 'TZ', 'UG', 'NG'] as const;
export const supportedCountryNames = ['Kenya', 'Tanzania', 'Uganda', 'Nigeria'] as const;

/**
 * Mock country viewer data for different scenarios
 */
export const mockCountryViewerData = {
  /**
   * High supported country viewership (good revenue potential)
   */
  highSupportedViewership: [
    { country: 'Kenya', countryCode: 'KE', viewers: 2500, subscribers: 150 },
    { country: 'Nigeria', countryCode: 'NG', viewers: 1800, subscribers: 120 },
    { country: 'Tanzania', countryCode: 'TZ', viewers: 800, subscribers: 45 },
    { country: 'Uganda', countryCode: 'UG', viewers: 400, subscribers: 25 },
    { country: 'United States', countryCode: 'US', viewers: 1200, subscribers: 80 },
    { country: 'United Kingdom', countryCode: 'GB', viewers: 600, subscribers: 35 },
    { country: 'Canada', countryCode: 'CA', viewers: 300, subscribers: 20 }
  ],

  /**
   * Low supported country viewership (limited revenue potential)
   */
  lowSupportedViewership: [
    { country: 'Kenya', countryCode: 'KE', viewers: 150, subscribers: 8 },
    { country: 'Nigeria', countryCode: 'NG', viewers: 100, subscribers: 5 },
    { country: 'United States', countryCode: 'US', viewers: 3500, subscribers: 200 },
    { country: 'United Kingdom', countryCode: 'GB', viewers: 2000, subscribers: 120 },
    { country: 'Germany', countryCode: 'DE', viewers: 1500, subscribers: 90 },
    { country: 'France', countryCode: 'FR', viewers: 800, subscribers: 45 }
  ],

  /**
   * No supported country viewership (no revenue potential)
   */
  noSupportedViewership: [
    { country: 'United States', countryCode: 'US', viewers: 5000, subscribers: 300 },
    { country: 'United Kingdom', countryCode: 'GB', viewers: 2500, subscribers: 150 },
    { country: 'Germany', countryCode: 'DE', viewers: 2000, subscribers: 120 },
    { country: 'France', countryCode: 'FR', viewers: 1500, subscribers: 90 },
    { country: 'Australia', countryCode: 'AU', viewers: 1000, subscribers: 60 },
    { country: 'Japan', countryCode: 'JP', viewers: 800, subscribers: 45 }
  ],

  /**
   * Mixed viewership (realistic scenario)
   */
  mixedViewership: [
    { country: 'United States', countryCode: 'US', viewers: 3000, subscribers: 180 },
    { country: 'Nigeria', countryCode: 'NG', viewers: 1500, subscribers: 90 },
    { country: 'United Kingdom', countryCode: 'GB', viewers: 1200, subscribers: 70 },
    { country: 'Kenya', countryCode: 'KE', viewers: 800, subscribers: 50 },
    { country: 'Germany', countryCode: 'DE', viewers: 600, subscribers: 35 },
    { country: 'Tanzania', countryCode: 'TZ', viewers: 400, subscribers: 25 },
    { country: 'Canada', countryCode: 'CA', viewers: 300, subscribers: 18 },
    { country: 'Uganda', countryCode: 'UG', viewers: 200, subscribers: 12 }
  ],

  /**
   * Single supported country (edge case)
   */
  singleSupportedCountry: [
    { country: 'Nigeria', countryCode: 'NG', viewers: 5000, subscribers: 300 },
    { country: 'United States', countryCode: 'US', viewers: 2000, subscribers: 120 },
    { country: 'United Kingdom', countryCode: 'GB', viewers: 1000, subscribers: 60 }
  ]
};

/**
 * Mock YouTube Analytics API responses
 */
export const mockYouTubeAnalyticsResponses = {
  /**
   * High supported viewership analytics response
   */
  highSupportedResponse: {
    kind: 'youtubeAnalytics#resultTable',
    columnHeaders: [
      { name: 'country', columnType: 'DIMENSION', dataType: 'STRING' },
      { name: 'views', columnType: 'METRIC', dataType: 'INTEGER' },
      { name: 'subscribersGained', columnType: 'METRIC', dataType: 'INTEGER' }
    ],
    rows: [
      ['KE', 2500, 150],
      ['NG', 1800, 120],
      ['US', 1200, 80],
      ['TZ', 800, 45],
      ['GB', 600, 35],
      ['UG', 400, 25],
      ['CA', 300, 20]
    ]
  },

  /**
   * Low supported viewership analytics response
   */
  lowSupportedResponse: {
    kind: 'youtubeAnalytics#resultTable',
    columnHeaders: [
      { name: 'country', columnType: 'DIMENSION', dataType: 'STRING' },
      { name: 'views', columnType: 'METRIC', dataType: 'INTEGER' },
      { name: 'subscribersGained', columnType: 'METRIC', dataType: 'INTEGER' }
    ],
    rows: [
      ['US', 3500, 200],
      ['GB', 2000, 120],
      ['DE', 1500, 90],
      ['FR', 800, 45],
      ['KE', 150, 8],
      ['NG', 100, 5]
    ]
  },

  /**
   * No supported countries analytics response
   */
  noSupportedResponse: {
    kind: 'youtubeAnalytics#resultTable',
    columnHeaders: [
      { name: 'country', columnType: 'DIMENSION', dataType: 'STRING' },
      { name: 'views', columnType: 'METRIC', dataType: 'INTEGER' },
      { name: 'subscribersGained', columnType: 'METRIC', dataType: 'INTEGER' }
    ],
    rows: [
      ['US', 5000, 300],
      ['GB', 2500, 150],
      ['DE', 2000, 120],
      ['FR', 1500, 90],
      ['AU', 1000, 60],
      ['JP', 800, 45]
    ]
  },

  /**
   * Empty analytics response (no data)
   */
  emptyResponse: {
    kind: 'youtubeAnalytics#resultTable',
    columnHeaders: [
      { name: 'country', columnType: 'DIMENSION', dataType: 'STRING' },
      { name: 'views', columnType: 'METRIC', dataType: 'INTEGER' },
      { name: 'subscribersGained', columnType: 'METRIC', dataType: 'INTEGER' }
    ],
    rows: []
  }
};

/**
 * Mock revenue estimation results
 */
export const mockRevenueEstimates = {
  /**
   * High revenue potential (many viewers in supported countries)
   */
  highRevenue: {
    totalViewers: 8100,
    viewersInSupportedCountries: 5500,
    totalSubscribers: 440,
    subscribersInSupportedCountries: 340,
    supportedCountryPercentage: 67.9,
    estimatedMonthlyRevenue: 2750.00,
    estimatedYearlyRevenue: 33000.00,
    breakdown: [
      { country: 'Kenya', countryCode: 'KE', viewers: 2500, subscribers: 150, estimatedRevenue: 1250.00 },
      { country: 'Nigeria', countryCode: 'NG', viewers: 1800, subscribers: 120, estimatedRevenue: 900.00 },
      { country: 'Tanzania', countryCode: 'TZ', viewers: 800, subscribers: 45, estimatedRevenue: 400.00 },
      { country: 'Uganda', countryCode: 'UG', viewers: 400, subscribers: 25, estimatedRevenue: 200.00 }
    ]
  },

  /**
   * Low revenue potential (few viewers in supported countries)
   */
  lowRevenue: {
    totalViewers: 9350,
    viewersInSupportedCountries: 250,
    totalSubscribers: 468,
    subscribersInSupportedCountries: 13,
    supportedCountryPercentage: 2.7,
    estimatedMonthlyRevenue: 125.00,
    estimatedYearlyRevenue: 1500.00,
    breakdown: [
      { country: 'Kenya', countryCode: 'KE', viewers: 150, subscribers: 8, estimatedRevenue: 75.00 },
      { country: 'Nigeria', countryCode: 'NG', viewers: 100, subscribers: 5, estimatedRevenue: 50.00 }
    ]
  },

  /**
   * No revenue potential (no viewers in supported countries)
   */
  noRevenue: {
    totalViewers: 13300,
    viewersInSupportedCountries: 0,
    totalSubscribers: 765,
    subscribersInSupportedCountries: 0,
    supportedCountryPercentage: 0,
    estimatedMonthlyRevenue: 0,
    estimatedYearlyRevenue: 0,
    breakdown: []
  },

  /**
   * Medium revenue potential (realistic mixed scenario)
   */
  mediumRevenue: {
    totalViewers: 8000,
    viewersInSupportedCountries: 2900,
    totalSubscribers: 390,
    subscribersInSupportedCountries: 177,
    supportedCountryPercentage: 36.3,
    estimatedMonthlyRevenue: 1450.00,
    estimatedYearlyRevenue: 17400.00,
    breakdown: [
      { country: 'Nigeria', countryCode: 'NG', viewers: 1500, subscribers: 90, estimatedRevenue: 750.00 },
      { country: 'Kenya', countryCode: 'KE', viewers: 800, subscribers: 50, estimatedRevenue: 400.00 },
      { country: 'Tanzania', countryCode: 'TZ', viewers: 400, subscribers: 25, estimatedRevenue: 200.00 },
      { country: 'Uganda', countryCode: 'UG', viewers: 200, subscribers: 12, estimatedRevenue: 100.00 }
    ]
  }
};

/**
 * Mock subscriber threshold scenarios for testing message variations
 */
export const mockSubscriberScenarios = {
  /**
   * Below 250 subscribers (not qualified)
   */
  belowThreshold: {
    totalSubscribers: 150,
    subscribersInSupportedCountries: 45,
    qualified: false,
    messageVariation: 'almostThere'
  },

  /**
   * Above 250 subscribers with supported country viewers (fully qualified)
   */
  qualifiedWithViewers: {
    totalSubscribers: 1250,
    subscribersInSupportedCountries: 340,
    qualified: true,
    hasViewersInSupportedCountries: true,
    messageVariation: 'congratulations'
  },

  /**
   * Above 250 subscribers but no supported country viewers (qualified but no current impact)
   */
  qualifiedNoViewers: {
    totalSubscribers: 850,
    subscribersInSupportedCountries: 0,
    qualified: true,
    hasViewersInSupportedCountries: false,
    messageVariation: 'qualifiedNoViewers'
  },

  /**
   * Exactly at threshold (edge case)
   */
  atThreshold: {
    totalSubscribers: 250,
    subscribersInSupportedCountries: 25,
    qualified: true,
    hasViewersInSupportedCountries: true,
    messageVariation: 'congratulations'
  }
};

// Factory Functions

/**
 * Create mock analytics data with specific viewer counts
 */
export function createMockAnalyticsData(
  totalViewers: number,
  supportedCountryPercentage = 30
): any {
  const supportedViewers = Math.floor(totalViewers * (supportedCountryPercentage / 100));
  const unsupportedViewers = totalViewers - supportedViewers;
  
  const data = [];
  
  // Add supported countries
  if (supportedViewers > 0) {
    const kenyaViewers = Math.floor(supportedViewers * 0.4);
    const nigeriaViewers = Math.floor(supportedViewers * 0.35);
    const tanzaniaViewers = Math.floor(supportedViewers * 0.15);
    const ugandaViewers = supportedViewers - kenyaViewers - nigeriaViewers - tanzaniaViewers;
    
    if (kenyaViewers > 0) data.push({ country: 'Kenya', countryCode: 'KE', viewers: kenyaViewers, subscribers: Math.floor(kenyaViewers * 0.06) });
    if (nigeriaViewers > 0) data.push({ country: 'Nigeria', countryCode: 'NG', viewers: nigeriaViewers, subscribers: Math.floor(nigeriaViewers * 0.06) });
    if (tanzaniaViewers > 0) data.push({ country: 'Tanzania', countryCode: 'TZ', viewers: tanzaniaViewers, subscribers: Math.floor(tanzaniaViewers * 0.06) });
    if (ugandaViewers > 0) data.push({ country: 'Uganda', countryCode: 'UG', viewers: ugandaViewers, subscribers: Math.floor(ugandaViewers * 0.06) });
  }
  
  // Add unsupported countries
  if (unsupportedViewers > 0) {
    const usViewers = Math.floor(unsupportedViewers * 0.4);
    const ukViewers = Math.floor(unsupportedViewers * 0.25);
    const deViewers = Math.floor(unsupportedViewers * 0.2);
    const otherViewers = unsupportedViewers - usViewers - ukViewers - deViewers;
    
    if (usViewers > 0) data.push({ country: 'United States', countryCode: 'US', viewers: usViewers, subscribers: Math.floor(usViewers * 0.06) });
    if (ukViewers > 0) data.push({ country: 'United Kingdom', countryCode: 'GB', viewers: ukViewers, subscribers: Math.floor(ukViewers * 0.06) });
    if (deViewers > 0) data.push({ country: 'Germany', countryCode: 'DE', viewers: deViewers, subscribers: Math.floor(deViewers * 0.06) });
    if (otherViewers > 0) data.push({ country: 'Canada', countryCode: 'CA', viewers: otherViewers, subscribers: Math.floor(otherViewers * 0.06) });
  }
  
  return data;
}

/**
 * Create mock country data for specific subscriber count
 */
export function createMockCountryDataForSubscribers(
  totalSubscribers: number,
  supportedCountryPercentage = 25
): any[] {
  const viewerMultiplier = 15; // Approximate viewers per subscriber
  
  return createMockAnalyticsData(totalSubscribers * viewerMultiplier, supportedCountryPercentage);
}

/**
 * Create mock revenue estimation for specific parameters
 */
export function createMockRevenueEstimate(
  totalViewers: number,
  viewersInSupportedCountries: number,
  totalSubscribers: number,
  subscribersInSupportedCountries: number
) {
  const supportedCountryPercentage = totalViewers > 0 ? (viewersInSupportedCountries / totalViewers) * 100 : 0;
  const revenuePerViewer = 0.5; // $0.50 per viewer per month
  const estimatedMonthlyRevenue = viewersInSupportedCountries * revenuePerViewer;
  const estimatedYearlyRevenue = estimatedMonthlyRevenue * 12;
  
  return {
    totalViewers,
    viewersInSupportedCountries,
    totalSubscribers,
    subscribersInSupportedCountries,
    supportedCountryPercentage: Math.round(supportedCountryPercentage * 10) / 10,
    estimatedMonthlyRevenue,
    estimatedYearlyRevenue,
    breakdown: [] // Simplified for factory function
  };
}

/**
 * Create mock YouTube Analytics API response
 */
export function createMockYouTubeAnalyticsResponse(countryData: any[]) {
  return {
    kind: 'youtubeAnalytics#resultTable',
    columnHeaders: [
      { name: 'country', columnType: 'DIMENSION', dataType: 'STRING' },
      { name: 'views', columnType: 'METRIC', dataType: 'INTEGER' },
      { name: 'subscribersGained', columnType: 'METRIC', dataType: 'INTEGER' }
    ],
    rows: countryData.map(item => [item.countryCode, item.viewers, item.subscribers])
  };
}

/**
 * Create mock data for testing all three message variations
 */
export function createMessageVariationTestData() {
  return {
    // Variation 1: >250 subscribers + viewers in supported countries
    congratulations: {
      analytics: mockCountryViewerData.highSupportedViewership,
      totalSubscribers: 1250,
      expectedVariation: 'congratulations'
    },
    
    // Variation 2: >250 subscribers + no viewers in supported countries
    qualifiedNoViewers: {
      analytics: mockCountryViewerData.noSupportedViewership,
      totalSubscribers: 850,
      expectedVariation: 'qualifiedNoViewers'
    },
    
    // Variation 3: <250 subscribers
    almostThere: {
      analytics: mockCountryViewerData.mixedViewership,
      totalSubscribers: 150,
      expectedVariation: 'almostThere'
    }
  };
}
