import { MockStorage, createMockLocalStorage, createMockSessionStorage, createMockStorageWithData, StorageTestScenarios } from './storage.mock';

describe('MockStorage', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  describe('Storage Interface Implementation', () => {
    it('should implement complete Storage interface', () => {
      expect(storage.length).toBe(0);
      expect(storage.key(0)).toBeNull();
      expect(storage.getItem('test')).toBeNull();
      
      storage.setItem('test', 'value');
      expect(storage.length).toBe(1);
      expect(storage.key(0)).toBe('test');
      expect(storage.getItem('test')).toBe('value');
      
      storage.removeItem('test');
      expect(storage.length).toBe(0);
      expect(storage.getItem('test')).toBeNull();
    });

    it('should clear all items', () => {
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');
      expect(storage.length).toBe(2);
      
      storage.clear();
      expect(storage.length).toBe(0);
      expect(storage.getItem('key1')).toBeNull();
      expect(storage.getItem('key2')).toBeNull();
    });

    it('should convert values to strings', () => {
      storage.setItem('number', 123 as any);
      storage.setItem('boolean', true as any);
      storage.setItem('object', { test: 'value' } as any);
      
      expect(storage.getItem('number')).toBe('123');
      expect(storage.getItem('boolean')).toBe('true');
      expect(storage.getItem('object')).toBe('[object Object]');
    });
  });

  describe('Test Utilities', () => {
    it('should provide store inspection', () => {
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');
      
      const store = storage.getStore();
      expect(store).toEqual({ key1: 'value1', key2: 'value2' });
      
      // Should return a copy, not reference
      store['key3'] = 'value3';
      expect(storage.getItem('key3')).toBeNull();
    });

    it('should allow setting store state', () => {
      const initialData = { key1: 'value1', key2: 'value2' };
      storage.setStore(initialData);
      
      expect(storage.getItem('key1')).toBe('value1');
      expect(storage.getItem('key2')).toBe('value2');
      expect(storage.length).toBe(2);
    });

    it('should reset store', () => {
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');
      
      storage.resetStore();
      expect(storage.length).toBe(0);
      expect(storage.getStore()).toEqual({});
    });

    it('should check key existence', () => {
      expect(storage.hasKey('test')).toBe(false);
      
      storage.setItem('test', 'value');
      expect(storage.hasKey('test')).toBe(true);
      
      storage.removeItem('test');
      expect(storage.hasKey('test')).toBe(false);
    });

    it('should get all keys and values', () => {
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');
      
      expect(storage.getAllKeys()).toEqual(['key1', 'key2']);
      expect(storage.getAllValues()).toEqual(['value1', 'value2']);
    });
  });

  describe('Factory Functions', () => {
    it('should create localStorage mock', () => {
      const localStorage = createMockLocalStorage();
      expect(localStorage).toBeInstanceOf(MockStorage);
      expect(localStorage.length).toBe(0);
    });

    it('should create sessionStorage mock', () => {
      const sessionStorage = createMockSessionStorage();
      expect(sessionStorage).toBeInstanceOf(MockStorage);
      expect(sessionStorage.length).toBe(0);
    });

    it('should create storage with initial data', () => {
      const initialData = { key1: 'value1', key2: 'value2' };
      const storage = createMockStorageWithData(initialData);
      
      expect(storage.getItem('key1')).toBe('value1');
      expect(storage.getItem('key2')).toBe('value2');
      expect(storage.length).toBe(2);
    });
  });

  describe('Test Scenarios', () => {
    it('should provide empty scenario', () => {
      const storage = createMockStorageWithData(StorageTestScenarios.empty);
      expect(storage.length).toBe(0);
    });

    it('should provide user session scenario', () => {
      const storage = createMockStorageWithData(StorageTestScenarios.userSession);
      expect(storage.getItem('user-token')).toBe('mock-jwt-token');
      expect(storage.getItem('user-id')).toBe('user-123');
      expect(storage.getItem('session-id')).toBe('session-456');
    });

    it('should provide auth state scenario', () => {
      const storage = createMockStorageWithData(StorageTestScenarios.authState);
      expect(storage.getItem('channelStatus')).toBe('found');
    });

    it('should provide preferences scenario', () => {
      const storage = createMockStorageWithData(StorageTestScenarios.preferences);
      expect(storage.getItem('theme')).toBe('dark');
      expect(storage.getItem('language')).toBe('en');
      expect(storage.getItem('notifications')).toBe('enabled');
    });
  });
});
