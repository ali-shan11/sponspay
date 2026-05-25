import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SessionStorageService {

  /**
   * Set an item in sessionStorage
   * @param key The key to store the value under
   * @param value The value to store (will be JSON stringified)
   */
  setItem(key: string, value: string): void {
    try {
      sessionStorage?.setItem(key, value);
    } catch (error) {
      console.warn('Failed to set sessionStorage item:', error);
    }
  }

  /**
   * Get an item from sessionStorage
   * @param key The key to retrieve
   * @returns The stored value or null if not found
   */
  getItem(key: string): string | null {
    try {
      return sessionStorage?.getItem(key) || null;
    } catch (error) {
      console.warn('Failed to get sessionStorage item:', error);
      return null;
    }
  }

  /**
   * Remove an item from sessionStorage
   * @param key The key to remove
   */
  removeItem(key: string): void {
    try {
      sessionStorage?.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove sessionStorage item:', error);
    }
  }

  /**
   * Clear all items from sessionStorage
   */
  clear(): void {
    try {
      sessionStorage?.clear();
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }
  }

  /**
   * Check if sessionStorage is available
   * @returns true if sessionStorage is available, false otherwise
   */
  isAvailable(): boolean {
    return sessionStorage !== null;
  }

  // localStorage methods for persistent storage

  /**
   * Set an item in localStorage
   * @param key The key to store the value under
   * @param value The value to store
   */
  setLocalItem(key: string, value: string): void {
    try {
      localStorage?.setItem(key, value);
    } catch (error) {
      console.warn('Failed to set localStorage item:', error);
    }
  }

  /**
   * Get an item from localStorage
   * @param key The key to retrieve
   * @returns The stored value or null if not found
   */
  getLocalItem(key: string): string | null {
    try {
      return localStorage?.getItem(key) || null;
    } catch (error) {
      console.warn('Failed to get localStorage item:', error);
      return null;
    }
  }

  /**
   * Remove an item from localStorage
   * @param key The key to remove
   */
  removeLocalItem(key: string): void {
    try {
      localStorage?.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove localStorage item:', error);
    }
  }

  /**
   * Clear all items from localStorage
   */
  clearLocal(): void {
    try {
      localStorage?.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  /**
   * Check if localStorage is available
   * @returns true if localStorage is available, false otherwise
   */
  isLocalAvailable(): boolean {
    return localStorage !== null;
  }

  /**
   * Set a boolean value in sessionStorage
   * @param key The key to store the value under
   * @param value The boolean value to store
   */
  setBooleanItem(key: string, value: boolean): void {
    this.setItem(key, value.toString());
  }

  /**
   * Get a boolean value from sessionStorage
   * @param key The key to retrieve
   * @returns The boolean value or null if not found or invalid
   */
  getBooleanItem(key: string): boolean | null {
    const value = this.getItem(key);
    if (value === null) return null;
    return value === 'true';
  }

  /**
   * Set an object in sessionStorage (JSON serialized)
   * @param key The key to store the value under
   * @param value The object to store
   */
  setObjectItem<T>(key: string, value: T): void {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to serialize object for sessionStorage:', error);
    }
  }

  /**
   * Get an object from sessionStorage (JSON deserialized)
   * @param key The key to retrieve
   * @returns The deserialized object or null if not found or invalid JSON
   */
  getObjectItem<T>(key: string): T | null {
    try {
      const value = this.getItem(key);
      if (value === null || value === 'undefined' || value === 'null') return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn('Failed to deserialize object from sessionStorage:', error);
      return null;
    }
  }
}
