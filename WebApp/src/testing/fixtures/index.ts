/**
 * Testing Fixtures - Public API
 * 
 * This module provides all test data fixtures for consistent testing across the application.
 * Fixtures include realistic mock data for users, channels, and analytics scenarios.
 */

// Import fixtures for internal use
import {
  mockUsers,
  mockTokens,
  mockTokenResults,
  mockCredentials,
  createMockUser,
  createMockToken,
  createMockCredential,
  createMockUserForSubscriberTesting
} from './user.fixtures';

import {
  mockChannels,
  mockChannelSelections,
  mockYouTubeApiResponses,
  createMockChannel,
  createMockChannelList,
  createMockChannelWithSubscribers,
  createMockChannelSelection,
  createSubscriberThresholdChannels,
  createRoleBasedChannels
} from './channel.fixtures';

import {
  supportedCountries,
  supportedCountryNames,
  mockCountryViewerData,
  mockYouTubeAnalyticsResponses,
  mockRevenueEstimates,
  mockSubscriberScenarios,
  createMockAnalyticsData,
  createMockCountryDataForSubscribers,
  createMockRevenueEstimate,
  createMockYouTubeAnalyticsResponse,
  createMessageVariationTestData
} from './analytics.fixtures';

// Re-export all fixtures for external use
export {
  // User fixtures
  mockUsers,
  mockTokens,
  mockTokenResults,
  mockCredentials,
  createMockUser,
  createMockToken,
  createMockCredential,
  createMockUserForSubscriberTesting,
  
  // Channel fixtures
  mockChannels,
  mockChannelSelections,
  mockYouTubeApiResponses,
  createMockChannel,
  createMockChannelList,
  createMockChannelWithSubscribers,
  createMockChannelSelection,
  createSubscriberThresholdChannels,
  createRoleBasedChannels,
  
  // Analytics fixtures
  supportedCountries,
  supportedCountryNames,
  mockCountryViewerData,
  mockYouTubeAnalyticsResponses,
  mockRevenueEstimates,
  mockSubscriberScenarios,
  createMockAnalyticsData,
  createMockCountryDataForSubscribers,
  createMockRevenueEstimate,
  createMockYouTubeAnalyticsResponse,
  createMessageVariationTestData
};

// Re-export types for convenience
export type { MockUser, MockUserCredential, MockAuthCredential, MockIdTokenResult } from '../mocks/firebase-auth.mock';

/**
 * Common test scenarios combining multiple fixture types
 */
export const testScenarios = {
  /**
   * New creator scenario (small channel, few subscribers)
   */
  newCreator: {
    user: 'authenticatedUser',
    channel: 'smallOwnedChannel',
    analytics: 'lowSupportedViewership',
    expectedMessage: 'almostThere'
  },

  /**
   * Growing creator scenario (medium channel, qualified)
   */
  growingCreator: {
    user: 'authenticatedUser',
    channel: 'mediumOwnedChannel',
    analytics: 'mixedViewership',
    expectedMessage: 'congratulations'
  },

  /**
   * Established creator scenario (large channel, high revenue potential)
   */
  establishedCreator: {
    user: 'authenticatedUser',
    channel: 'largeOwnedChannel',
    analytics: 'highSupportedViewership',
    expectedMessage: 'congratulations'
  },

  /**
   * International creator scenario (qualified but no supported country viewers)
   */
  internationalCreator: {
    user: 'authenticatedUser',
    channel: 'mediumOwnedChannel',
    analytics: 'noSupportedViewership',
    expectedMessage: 'qualifiedNoViewers'
  },

  /**
   * Multi-channel creator scenario
   */
  multiChannelCreator: {
    user: 'authenticatedUser',
    channelSelection: 'multipleChannels',
    analytics: 'mixedViewership',
    expectedMessage: 'congratulations'
  }
} as const;

/**
 * Quick access to commonly used fixture combinations
 */
export const quickFixtures = {
  /**
   * Standard authenticated user with medium channel
   */
  standardUser: {
    user: 'authenticatedUser',
    channel: 'mediumOwnedChannel'
  },

  /**
   * User with expired token (for testing refresh scenarios)
   */
  expiredTokenUser: {
    user: 'userWithExpiredToken',
    channel: 'smallOwnedChannel'
  },

  /**
   * Unauthenticated state
   */
  unauthenticated: {
    user: 'unauthenticatedUser',
    channel: null
  },

  /**
   * High revenue potential scenario
   */
  highRevenue: {
    analytics: 'highSupportedViewership',
    revenue: 'highRevenue'
  },

  /**
   * No revenue potential scenario
   */
  noRevenue: {
    analytics: 'noSupportedViewership',
    revenue: 'noRevenue'
  }
} as const;

/**
 * Utility function to get fixture data by key
 */
export function getFixtureByKey(category: string, key: string): any {
  switch (category) {
    case 'user':
      return mockUsers[key as keyof typeof mockUsers];
    case 'channel':
      return mockChannels[key as keyof typeof mockChannels];
    case 'analytics':
      return mockCountryViewerData[key as keyof typeof mockCountryViewerData];
    case 'revenue':
      return mockRevenueEstimates[key as keyof typeof mockRevenueEstimates];
    default:
      throw new Error(`Unknown fixture category: ${category}`);
  }
}

/**
 * Utility function to create a complete test scenario
 */
export function createTestScenario(scenarioName: keyof typeof testScenarios) {
  const scenario = testScenarios[scenarioName];
  
  return {
    user: getFixtureByKey('user', scenario.user),
    channel: 'channel' in scenario ? getFixtureByKey('channel', scenario.channel) : null,
    channelSelection: 'channelSelection' in scenario ? mockChannelSelections[scenario.channelSelection as keyof typeof mockChannelSelections] : null,
    analytics: getFixtureByKey('analytics', scenario.analytics),
    expectedMessage: scenario.expectedMessage
  };
}
