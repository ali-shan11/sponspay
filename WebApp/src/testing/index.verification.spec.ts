/**
 * Verification test for the main testing index
 * This test ensures that all exports are accessible and working correctly
 */

import {
  // Mocks
  MockFirebaseAuth,
  MockStorage,
  MockHttpClient,
  createMockFirebaseAuth,
  createMockLocalStorage,
  createMockHttpClient,
  
  // Helpers
  createComponentWithMocks,
  flushPromises,
  getByTestId,
  
  // Fixtures
  mockUsers,
  mockChannels,
  mockCountryViewerData,
  testScenarios,
  createMockAuthUser,
  createMockFixtureUser,
  
  // Angular testing utilities
  TestBed,
  ComponentFixture,
  fakeAsync,
  tick,
  
  // RxJS utilities
  of,
  throwError
} from './index';

describe('Testing Index Verification', () => {
  it('should export all mock utilities', () => {
    expect(MockFirebaseAuth).toBeDefined();
    expect(MockStorage).toBeDefined();
    expect(MockHttpClient).toBeDefined();
    expect(createMockFirebaseAuth).toBeDefined();
    expect(createMockLocalStorage).toBeDefined();
    expect(createMockHttpClient).toBeDefined();
  });

  it('should export all helper functions', () => {
    expect(createComponentWithMocks).toBeDefined();
    expect(flushPromises).toBeDefined();
    expect(getByTestId).toBeDefined();
  });

  it('should export all fixtures', () => {
    expect(mockUsers).toBeDefined();
    expect(mockChannels).toBeDefined();
    expect(mockCountryViewerData).toBeDefined();
    expect(testScenarios).toBeDefined();
  });

  it('should export factory functions with clear names', () => {
    expect(createMockAuthUser).toBeDefined();
    expect(createMockFixtureUser).toBeDefined();
    
    // Verify they are different functions
    expect(createMockAuthUser).not.toBe(createMockFixtureUser);
  });

  it('should export Angular testing utilities', () => {
    expect(TestBed).toBeDefined();
    expect(ComponentFixture).toBeDefined();
    expect(fakeAsync).toBeDefined();
    expect(tick).toBeDefined();
  });

  it('should export RxJS utilities', () => {
    expect(of).toBeDefined();
    expect(throwError).toBeDefined();
  });

  it('should provide working mock factories', () => {
    const mockAuth = createMockFirebaseAuth();
    expect(mockAuth).toBeDefined();
    expect(typeof mockAuth.signInWithPopup).toBe('function');

    const mockStorage = createMockLocalStorage();
    expect(mockStorage).toBeDefined();
    expect(typeof mockStorage.getItem).toBe('function');

    const mockHttp = createMockHttpClient();
    expect(mockHttp).toBeDefined();
    expect(typeof mockHttp.get).toBe('function');
  });

  it('should provide working fixture data', () => {
    expect(mockUsers.authenticatedUser).toBeDefined();
    expect(mockUsers.authenticatedUser.uid).toBe('test-user-123');

    expect(mockChannels.mediumOwnedChannel).toBeDefined();
    expect(mockChannels.mediumOwnedChannel.title).toBe('Medium Creator Channel');

    expect(Array.isArray(mockCountryViewerData.highSupportedViewership)).toBe(true);
  });

  it('should provide working test scenarios', () => {
    expect(testScenarios.newCreator).toBeDefined();
    expect(testScenarios.growingCreator).toBeDefined();
    expect(testScenarios.establishedCreator).toBeDefined();
  });

  it('should provide working RxJS observables', fakeAsync(() => {
    let result: string | undefined;
    
    of('test-value').subscribe(value => {
      result = value;
    });
    
    tick();
    expect(result).toBe('test-value');
  }));

  it('should demonstrate clean import experience', () => {
    // This test demonstrates that developers can import everything they need
    // from a single location, making test writing much easier
    
    const user = mockUsers.authenticatedUser;
    const channel = mockChannels.mediumOwnedChannel;
    const mockAuth = createMockFirebaseAuth();
    
    expect(user).toBeDefined();
    expect(channel).toBeDefined();
    expect(mockAuth).toBeDefined();
    
    // Verify the clean API works as expected
    expect(user.email).toBe('test@example.com');
    expect(channel.title).toBe('Medium Creator Channel');
    expect(mockAuth.currentUser).toBeNull();
  });
});
