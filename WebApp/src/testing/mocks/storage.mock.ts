/**
 * Mock Storage implementation for testing browser storage APIs
 * Provides a memory-based storage that resets between tests
 */
export class MockStorage implements Storage {
  private store: Record<string, string> = {};

  /**
   * Returns the number of key/value pairs
   */
  get length(): number {
    return Object.keys(this.store).length;
  }

  /**
   * Returns the name of the nth key, or null if n is greater than or equal to the number of key/value pairs
   */
  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }

  /**
   * Returns the current value associated with the given key, or null if the given key does not exist
   */
  getItem(key: string): string | null {
    return key in this.store ? this.store[key] : null;
  }

  /**
   * Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously
   */
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  /**
   * Removes the key/value pair with the given key, if a key/value pair with the given key exists
   */
  removeItem(key: string): void {
    delete this.store[key];
  }

  /**
   * Removes all key/value pairs, if there are any
   */
  clear(): void {
    this.store = {};
  }

  // Test Utilities

  /**
   * Get a copy of the internal store for testing verification
   */
  getStore(): Record<string, string> {
    return { ...this.store };
  }

  /**
   * Set the internal store state for testing setup
   */
  setStore(store: Record<string, string>): void {
    this.store = { ...store };
  }

  /**
   * Reset the store to empty state
   */
  resetStore(): void {
    this.store = {};
  }

  /**
   * Check if a key exists in storage
   */
  hasKey(key: string): boolean {
    return key in this.store;
  }

  /**
   * Get all keys in storage
   */
  getAllKeys(): string[] {
    return Object.keys(this.store);
  }

  /**
   * Get all values in storage
   */
  getAllValues(): string[] {
    return Object.values(this.store);
  }
}

/**
 * Create a mock localStorage instance
 * @returns MockStorage instance configured for localStorage testing
 */
export function createMockLocalStorage(): MockStorage {
  return new MockStorage();
}

/**
 * Create a mock sessionStorage instance
 * @returns MockStorage instance configured for sessionStorage testing
 */
export function createMockSessionStorage(): MockStorage {
  return new MockStorage();
}

/**
 * Create a mock storage with predefined data
 * @param initialData - Initial key/value pairs to populate the storage
 * @returns MockStorage instance with predefined data
 */
export function createMockStorageWithData(initialData: Record<string, string>): MockStorage {
  const storage = new MockStorage();
  storage.setStore(initialData);
  return storage;
}

/**
 * Mock the global localStorage object for testing
 * @returns Function to restore the original localStorage
 */
export function mockGlobalLocalStorage(): () => void {
  const originalLocalStorage = (globalThis as any).localStorage;
  const mockStorage = createMockLocalStorage();
  
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true
  });

  return () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
  };
}

/**
 * Mock the global sessionStorage object for testing
 * @returns Function to restore the original sessionStorage
 */
export function mockGlobalSessionStorage(): () => void {
  const originalSessionStorage = (globalThis as any).sessionStorage;
  const mockStorage = createMockSessionStorage();
  
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: mockStorage,
    writable: true
  });

  return () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true
    });
  };
}

/**
 * Common storage test scenarios
 */
export const StorageTestScenarios = {
  /**
   * Empty storage scenario
   */
  empty: {},

  /**
   * Storage with user session data
   */
  userSession: {
    'user-token': 'mock-jwt-token',
    'user-id': 'user-123',
    'session-id': 'session-456'
  },

  /**
   * Storage with authentication state
   */
  authState: {
    'channelStatus': 'found'
  },

  /**
   * Storage with application preferences
   */
  preferences: {
    'theme': 'dark',
    'language': 'en',
    'notifications': 'enabled'
  }
};
