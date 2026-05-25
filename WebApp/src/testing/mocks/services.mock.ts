import { BehaviorSubject } from 'rxjs';
import { MockStorage } from './storage.mock';
import { minimumNumberOfSubscribers } from '@utils/constants';

/**
 * Mock SessionStorageService for testing
 */
export class MockSessionStorageService {
  private mockStorage = new MockStorage();

  // String methods
  setItem(key: string, value: string): void {
    this.mockStorage.setItem(key, value);
  }

  getItem(key: string): string | null {
    return this.mockStorage.getItem(key);
  }

  removeItem(key: string): void {
    this.mockStorage.removeItem(key);
  }

  clear(): void {
    this.mockStorage.clear();
  }

  // Boolean methods
  setBooleanItem(key: string, value: boolean): void {
    this.setItem(key, value.toString());
  }

  getBooleanItem(key: string): boolean | null {
    const value = this.getItem(key);
    if (value === null) return null;
    return value === 'true';
  }

  // Object methods
  setObjectItem<T>(key: string, value: T): void {
    this.setItem(key, JSON.stringify(value));
  }

  getObjectItem<T>(key: string): T | null {
    const value = this.getItem(key);
    return value ? JSON.parse(value) as T : null;
  }

  // Test utilities
  getStorage(): MockStorage {
    return this.mockStorage;
  }

  resetStorage(): void {
    this.mockStorage.resetStore();
  }
}

/**
 * Mock LoadingStateService for testing
 */
export class MockLoadingStateService {
  private _isLoading = new BehaviorSubject<boolean>(false);
  private _error = new BehaviorSubject<string | null>(null);

  isLoading$ = this._isLoading.asObservable();
  error$ = this._error.asObservable();

  get isLoading(): boolean {
    return this._isLoading.value;
  }

  get error(): string | null {
    return this._error.value;
  }

  setLoading(loading: boolean): void {
    this._isLoading.next(loading);
  }

  setError(error: string | null): void {
    this._error.next(error);
  }

  clearError(): void {
    this._error.next(null);
  }

  reset(): void {
    this._isLoading.next(false);
    this._error.next(null);
  }
}

/**
 * Mock SidenavService for testing
 */
export class MockSidenavService {
  private _isOpen = new BehaviorSubject<boolean>(false);

  isOpen$ = this._isOpen.asObservable();

  get isOpen(): boolean {
    return this._isOpen.value;
  }

  open(): void {
    this._isOpen.next(true);
  }

  close(): void {
    this._isOpen.next(false);
  }

  toggle(): void {
    this._isOpen.next(!this._isOpen.value);
  }

  reset(): void {
    this._isOpen.next(false);
  }
}

/**
 * Mock MockDataService for testing
 */
export class MockMockDataService {
  private _isEnabled = new BehaviorSubject<boolean>(false);
  private _subscriberCount = new BehaviorSubject<number>(minimumNumberOfSubscribers);
  private _viewersInSupportedCountries = new BehaviorSubject<number>(100);

  isEnabled$ = this._isEnabled.asObservable();
  subscriberCount$ = this._subscriberCount.asObservable();
  viewersInSupportedCountries$ = this._viewersInSupportedCountries.asObservable();

  get isEnabled(): boolean {
    return this._isEnabled.value;
  }

  get subscriberCount(): number {
    return this._subscriberCount.value;
  }

  get viewersInSupportedCountries(): number {
    return this._viewersInSupportedCountries.value;
  }

  setEnabled(enabled: boolean): void {
    this._isEnabled.next(enabled);
  }

  setSubscriberCount(count: number): void {
    this._subscriberCount.next(count);
  }

  setViewersInSupportedCountries(count: number): void {
    this._viewersInSupportedCountries.next(count);
  }

  reset(): void {
    this._isEnabled.next(false);
    this._subscriberCount.next(minimumNumberOfSubscribers);
    this._viewersInSupportedCountries.next(100);
  }
}

/**
 * Mock ZohoSalesiqService for testing
 */
export class MockZohoSalesiqService {
  private _isInitialized = false;
  private _initializationCalls = 0;

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get initializationCalls(): number {
    return this._initializationCalls;
  }

  initialize(): void {
    this._isInitialized = true;
    this._initializationCalls++;
  }

  reset(): void {
    this._isInitialized = false;
    this._initializationCalls = 0;
  }
}

// Factory functions for creating mock services

/**
 * Create a mock SessionStorageService
 */
export function createMockSessionStorageService(): MockSessionStorageService {
  return new MockSessionStorageService();
}

/**
 * Create a mock LoadingStateService
 */
export function createMockLoadingStateService(): MockLoadingStateService {
  return new MockLoadingStateService();
}

/**
 * Create a mock SidenavService
 */
export function createMockSidenavService(): MockSidenavService {
  return new MockSidenavService();
}

/**
 * Create a mock MockDataService
 */
export function createMockMockDataService(): MockMockDataService {
  return new MockMockDataService();
}

/**
 * Create a mock ZohoSalesiqService
 */
export function createMockZohoSalesiqService(): MockZohoSalesiqService {
  return new MockZohoSalesiqService();
}

/**
 * Create all mock services in a single object for easy TestBed configuration
 */
export function createAllMockServices() {
  return {
    SessionStorageService: createMockSessionStorageService(),
    LoadingStateService: createMockLoadingStateService(),
    SidenavService: createMockSidenavService(),
    MockDataService: createMockMockDataService(),
    ZohoSalesiqService: createMockZohoSalesiqService()
  };
}

/**
 * Common service test scenarios
 */
export const ServiceTestScenarios = {
  /**
   * Loading states
   */
  loading: {
    initial: { isLoading: false, error: null },
    active: { isLoading: true, error: null },
    error: { isLoading: false, error: 'Test error message' },
    success: { isLoading: false, error: null }
  },

  /**
   * Authentication states
   */
  auth: {
    unauthenticated: { user: null, channelStatus: 'unknown' },
    authenticated: { user: { uid: 'test-user' }, channelStatus: 'found' },
    noChannels: { user: { uid: 'test-user' }, channelStatus: 'not-found' }
  },

  /**
   * Mock data configurations
   */
  mockData: {
    disabled: { isEnabled: false, subscriberCount: 250, viewersInSupportedCountries: 100 },
    qualified: { isEnabled: true, subscriberCount: 500, viewersInSupportedCountries: 200 },
    almostQualified: { isEnabled: true, subscriberCount: 200, viewersInSupportedCountries: 150 },
    noViewers: { isEnabled: true, subscriberCount: 1000, viewersInSupportedCountries: 0 }
  },

  /**
   * UI states
   */
  ui: {
    sidenavClosed: { isOpen: false },
    sidenavOpen: { isOpen: true }
  }
};
