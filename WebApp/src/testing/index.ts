/**
 * Main Testing Index & Public API
 * 
 * This file provides a clean public API for all testing utilities,
 * making them easily accessible throughout the test suite.
 * 
 * Usage:
 * import { 
 *   createComponentWithMocks,
 *   mockUsers,
 *   MockFirebaseAuth,
 *   TestBed,
 *   ComponentFixture,
 *   of 
 * } from '../testing';
 */

// ===== CUSTOM TESTING UTILITIES =====

// Mocks - Firebase, HTTP, Storage, and Service mocks
export * from './mocks';

// Helpers - Component, Async, and DOM testing helpers
export * from './helpers';

// Fixtures - User, Channel, and Analytics test data
// Note: Some fixtures re-export mock utilities, so we import selectively to avoid conflicts
export {
  // User fixtures (avoiding conflicts with mock exports)
  mockUsers,
  mockTokens,
  mockTokenResults,
  mockCredentials,
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
  createMessageVariationTestData,
  
  // Test scenarios and utilities
  testScenarios,
  quickFixtures,
  getFixtureByKey,
  createTestScenario
} from './fixtures';

// ===== ANGULAR TESTING UTILITIES =====

// Core Angular testing utilities
export {
  TestBed,
  ComponentFixture,
  fakeAsync,
  tick,
  flush,
  discardPeriodicTasks
} from '@angular/core/testing';

// ===== RXJS TESTING UTILITIES =====

// Common RxJS observables for testing
export {
  of,
  throwError,
  EMPTY,
  NEVER
} from 'rxjs';

// ===== GLOBAL TESTING UTILITIES =====

// Note: Jasmine utilities are available globally in Angular test environment
// These are already available without explicit imports:
// - jasmine (global object)
// - expect (global function)
// - spyOn (global function)
// - createSpy (jasmine.createSpy)
// - createSpyObj (jasmine.createSpyObj)

/**
 * Convenience re-exports for commonly used testing patterns
 */

// Re-export the most commonly used mock factory functions with clear names
export {
  createMockUser as createMockAuthUser,
  createMockCredential as createMockAuthCredential
} from './mocks/firebase-auth.mock';

export {
  createMockUser as createMockFixtureUser,
  createMockCredential as createMockFixtureCredential
} from './fixtures/user.fixtures';
