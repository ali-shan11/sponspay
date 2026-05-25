/**
 * Verification tests for Task 4: Test Data Fixtures
 * These tests ensure all fixtures are properly created and accessible
 */

import {
  // User fixtures
  mockUsers,
  mockTokens,
  mockCredentials,
  createMockUser,
  createMockToken,
  
  // Channel fixtures
  mockChannels,
  mockChannelSelections,
  createMockChannel,
  createSubscriberThresholdChannels,
  
  // Analytics fixtures
  supportedCountries,
  mockCountryViewerData,
  mockRevenueEstimates,
  createMockAnalyticsData,
  createMessageVariationTestData,
  
  // Utility functions
  getFixtureByKey,
  createTestScenario,
  quickFixtures
} from './index';

describe('Task 4: Test Data Fixtures Verification', () => {
  
  describe('User Fixtures', () => {
    it('should provide all required user fixtures', () => {
      expect(mockUsers.authenticatedUser).toBeDefined();
      expect(mockUsers.authenticatedUser.uid).toBe('test-user-123');
      expect(mockUsers.authenticatedUser.email).toBe('test@example.com');
      
      expect(mockUsers.userWithoutEmail).toBeDefined();
      expect(mockUsers.userWithoutEmail.email).toBeNull();
      
      expect(mockUsers.unauthenticatedUser).toBeNull();
    });

    it('should provide valid JWT tokens', () => {
      expect(mockTokens.validToken).toBeDefined();
      expect(mockTokens.validToken).toContain('eyJ'); // JWT format
      
      expect(mockTokens.expiredToken).toBeDefined();
      expect(mockTokens.invalidToken).toBe('invalid-token-format');
    });

    it('should provide user credentials for authentication flows', () => {
      expect(mockCredentials.popupSuccess).toBeDefined();
      expect(mockCredentials.popupSuccess.user).toBeDefined();
      expect(mockCredentials.popupSuccess.credential).toBeDefined();
      
      expect(mockCredentials.redirectSuccess).toBeDefined();
      expect(mockCredentials.noAuth).toBeNull();
    });

    it('should create custom users with factory function', () => {
      const customUser = createMockUser({
        uid: 'custom-user-123',
        email: 'custom@example.com'
      });
      
      expect(customUser.uid).toBe('custom-user-123');
      expect(customUser.email).toBe('custom@example.com');
      expect(customUser.getIdToken).toBeDefined();
    });

    it('should create custom tokens with factory function', () => {
      const customToken = createMockToken({
        user_id: 'custom-user',
        email: 'custom@example.com'
      });
      
      expect(customToken).toContain('eyJ'); // JWT format
      expect(customToken.split('.').length).toBe(3); // header.payload.signature
    });
  });

  describe('Channel Fixtures', () => {
    it('should provide channels with different subscriber counts', () => {
      expect(mockChannels.smallOwnedChannel.subscriberCount).toBe(150);
      expect(mockChannels.mediumOwnedChannel.subscriberCount).toBe(1250);
      expect(mockChannels.largeOwnedChannel.subscriberCount).toBe(15750);
      expect(mockChannels.megaOwnedChannel.subscriberCount).toBe(250000);
    });

    it('should provide channels with different roles', () => {
      expect(mockChannels.smallOwnedChannel.role).toBe('owner');
      expect(mockChannels.managedChannel.role).toBe('editor');
    });

    it('should provide channel selection scenarios', () => {
      expect(mockChannelSelections.singleChannel.allChannels.length).toBe(1);
      expect(mockChannelSelections.multipleChannels.allChannels.length).toBeGreaterThan(1);
      
      expect(mockChannelSelections.multipleChannels.selectedChannel).toBeDefined();
      expect(mockChannelSelections.multipleChannels.allChannels).toContain(
        mockChannelSelections.multipleChannels.selectedChannel
      );
    });

    it('should create custom channels with factory functions', () => {
      const customChannel = createMockChannel({
        title: 'Custom Test Channel',
        subscriberCount: 5000
      });
      
      expect(customChannel.title).toBe('Custom Test Channel');
      expect(customChannel.subscriberCount).toBe(5000);
    });

    it('should create channels for subscriber threshold testing', () => {
      const thresholdChannels = createSubscriberThresholdChannels();
      
      expect(thresholdChannels.belowThreshold.subscriberCount).toBe(150);
      expect(thresholdChannels.atThreshold.subscriberCount).toBe(250);
      expect(thresholdChannels.aboveThreshold.subscriberCount).toBe(1000);
    });
  });

  describe('Analytics Fixtures', () => {
    it('should provide supported countries data', () => {
      expect(supportedCountries).toEqual(['KE', 'TZ', 'UG', 'NG']);
    });

    it('should provide different viewership scenarios', () => {
      expect(mockCountryViewerData.highSupportedViewership).toBeDefined();
      expect(mockCountryViewerData.lowSupportedViewership).toBeDefined();
      expect(mockCountryViewerData.noSupportedViewership).toBeDefined();
      
      // Check that high supported viewership has viewers in supported countries
      const supportedViewers = mockCountryViewerData.highSupportedViewership
        .filter(item => supportedCountries.includes(item.countryCode as any));
      expect(supportedViewers.length).toBeGreaterThan(0);
      
      // Check that no supported viewership has no viewers in supported countries
      const noSupportedViewers = mockCountryViewerData.noSupportedViewership
        .filter(item => supportedCountries.includes(item.countryCode as any));
      expect(noSupportedViewers.length).toBe(0);
    });

    it('should provide revenue estimation scenarios', () => {
      expect(mockRevenueEstimates.highRevenue.estimatedMonthlyRevenue).toBeGreaterThan(0);
      expect(mockRevenueEstimates.noRevenue.estimatedMonthlyRevenue).toBe(0);
      
      expect(mockRevenueEstimates.highRevenue.breakdown.length).toBeGreaterThan(0);
      expect(mockRevenueEstimates.noRevenue.breakdown.length).toBe(0);
    });

    it('should create custom analytics data with factory function', () => {
      const analyticsData = createMockAnalyticsData(10000, 40); // 40% in supported countries
      
      const totalViewers = analyticsData.reduce((sum: number, item: any) => sum + item.viewers, 0);
      expect(totalViewers).toBe(10000);
      
      const supportedViewers = analyticsData
        .filter((item: any) => supportedCountries.includes(item.countryCode))
        .reduce((sum: number, item: any) => sum + item.viewers, 0);
      
      // Should be approximately 40% (allowing for rounding)
      const percentage = (supportedViewers / totalViewers) * 100;
      expect(percentage).toBeGreaterThan(35);
      expect(percentage).toBeLessThan(45);
    });

    it('should provide message variation test data', () => {
      const testData = createMessageVariationTestData();
      
      expect(testData.congratulations.expectedVariation).toBe('congratulations');
      expect(testData.qualifiedNoViewers.expectedVariation).toBe('qualifiedNoViewers');
      expect(testData.almostThere.expectedVariation).toBe('almostThere');
      
      expect(testData.congratulations.totalSubscribers).toBeGreaterThan(250);
      expect(testData.almostThere.totalSubscribers).toBeLessThan(250);
    });
  });

  describe('Utility Functions', () => {
    it('should retrieve fixtures by category and key', () => {
      const user = getFixtureByKey('user', 'authenticatedUser');
      expect(user).toBe(mockUsers.authenticatedUser);
      
      const channel = getFixtureByKey('channel', 'mediumOwnedChannel');
      expect(channel).toBe(mockChannels.mediumOwnedChannel);
      
      const analytics = getFixtureByKey('analytics', 'highSupportedViewership');
      expect(analytics).toBe(mockCountryViewerData.highSupportedViewership);
    });

    it('should throw error for unknown fixture category', () => {
      expect(() => getFixtureByKey('unknown', 'test')).toThrowError('Unknown fixture category: unknown');
    });

    it('should create complete test scenarios', () => {
      const scenario = createTestScenario('newCreator');
      
      expect(scenario.user).toBeDefined();
      expect(scenario.channel).toBeDefined();
      expect(scenario.analytics).toBeDefined();
      expect(scenario.expectedMessage).toBe('almostThere');
    });

    it('should provide quick fixture combinations', () => {
      expect(quickFixtures.standardUser.user).toBe('authenticatedUser');
      expect(quickFixtures.standardUser.channel).toBe('mediumOwnedChannel');
      
      expect(quickFixtures.unauthenticated.user).toBe('unauthenticatedUser');
      expect(quickFixtures.unauthenticated.channel).toBeNull();
    });
  });

  describe('Data Integrity', () => {
    it('should have consistent data relationships', () => {
      // Check that channel subscriber counts are realistic
      const smallChannel = mockChannels.smallOwnedChannel;
      const largeChannel = mockChannels.largeOwnedChannel;
      
      expect(smallChannel.subscriberCount!).toBeLessThan(
        largeChannel.subscriberCount!
      );
    });

    it('should have realistic revenue calculations', () => {
      const highRevenue = mockRevenueEstimates.highRevenue;
      
      // Monthly revenue should be less than yearly
      expect(highRevenue.estimatedMonthlyRevenue).toBeLessThan(highRevenue.estimatedYearlyRevenue);
      
      // Yearly should be approximately 12x monthly
      const ratio = highRevenue.estimatedYearlyRevenue / highRevenue.estimatedMonthlyRevenue;
      expect(ratio).toBeCloseTo(12, 0);
    });

    it('should have valid country codes in analytics data', () => {
      const analyticsData = mockCountryViewerData.mixedViewership;
      
      analyticsData.forEach(item => {
        expect(item.countryCode).toMatch(/^[A-Z]{2}$/); // Two-letter country code
        expect(item.viewers).toBeGreaterThan(0);
        expect(item.subscribers).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Type Safety', () => {
    it('should maintain proper TypeScript types', () => {
      // This test ensures TypeScript compilation succeeds
      const user = mockUsers.authenticatedUser;
      const tokenPromise = user.getIdToken();
      
      const channel = mockChannels.mediumOwnedChannel;
      const role: 'owner' | 'editor' = channel.role;
      
      expect(typeof tokenPromise).toBe('object'); // Promise<string>
      expect(['owner', 'editor']).toContain(role);
    });
  });
});
