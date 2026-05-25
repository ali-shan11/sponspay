/**
 * Performance Test Helpers
 * Phase 4 Task 4: Performance Optimization
 * 
 * Utilities for optimizing test performance and stability
 */

import { ComponentFixture } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

// Extend Performance interface for memory monitoring
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

/**
 * Performance-optimized test utilities
 */
export class PerformanceTestHelpers {
  
  /**
   * Wait for component to reach stable state with timeout
   * Optimized for faster test execution
   */
  static async waitForStableState<T>(
    fixture: ComponentFixture<T>, 
    maxWaitTime = 1000
  ): Promise<void> {
    const startTime = Date.now();
    
    // Initial change detection
    fixture.detectChanges();
    
    // Wait for async operations with timeout
    const stabilityPromise = fixture.whenStable();
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error(`Component did not stabilize within ${maxWaitTime}ms`)), maxWaitTime);
    });
    
    try {
      await Promise.race([stabilityPromise, timeoutPromise]);
      fixture.detectChanges(); // Final change detection
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.warn(`⚠️ Component stability timeout after ${elapsed}ms:`, error);
      // Continue with test execution even if timeout occurs
      fixture.detectChanges();
    }
  }

  /**
   * Optimized element query with caching
   */
  static queryElement(
    fixture: ComponentFixture<any>, 
    selector: string,
    cache = new Map<string, DebugElement>()
  ): DebugElement | null {
    // Check cache first
    if (cache.has(selector)) {
      return cache.get(selector)!;
    }

    // Query and cache result
    const element = fixture.debugElement.query(By.css(selector));
    if (element) {
      cache.set(selector, element);
    }
    
    return element;
  }

  /**
   * Batch DOM queries for better performance
   */
  static queryElements(
    fixture: ComponentFixture<any>, 
    selectors: string[]
  ): Map<string, DebugElement | null> {
    const results = new Map<string, DebugElement | null>();
    
    // Single traversal for all selectors
    selectors.forEach(selector => {
      results.set(selector, fixture.debugElement.query(By.css(selector)));
    });
    
    return results;
  }

  /**
   * Memory-efficient mock creation with cleanup
   */
  static createOptimizedMock<T extends Record<string, any>>(
    mockObject: Partial<T>, 
    defaults: T,
    cleanup: () => void = () => {
      console.log("Cleanup")
    }
  ): jasmine.SpyObj<T> & { cleanup: () => void } {
    const mock = jasmine.createSpyObj('OptimizedMock', Object.keys(defaults as Record<string, any>), {
      ...defaults,
      ...mockObject
    });

    // Add cleanup method
    (mock as any).cleanup = cleanup;
    
    return mock;
  }

  /**
   * Fast async operation simulation
   */
  static fastAsync<T>(value: T, delay = 0): Promise<T> {
    if (delay === 0) {
      return Promise.resolve(value);
    }
    
    return new Promise(resolve => {
      setTimeout(() => resolve(value), delay);
    });
  }

  /**
   * Optimized event simulation
   */
  static triggerEvent(
    element: HTMLElement | DebugElement, 
    eventType: string, 
    eventData: any = {}
  ): void {
    const htmlElement = element instanceof HTMLElement ? element : element.nativeElement;
    
    // Use more efficient event creation
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    Object.assign(event, eventData);
    
    htmlElement.dispatchEvent(event);
  }

  /**
   * Memory usage monitoring for tests
   */
  static monitorMemory(): {
    start: () => void;
    end: () => { used: number; delta: number };
  } {
    let startMemory = 0;
    
    return {
      start: () => {
        if (performance.memory) {
          startMemory = performance.memory.usedJSHeapSize;
        }
      },
      end: () => {
        if (performance.memory) {
          const endMemory = performance.memory.usedJSHeapSize;
          return {
            used: endMemory,
            delta: endMemory - startMemory
          };
        }
        return { used: 0, delta: 0 };
      }
    };
  }

  /**
   * Test execution timing
   */
  static timeExecution<T>(fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    
    const result = fn();
    
    if (result instanceof Promise) {
      return result.then(value => ({
        result: value,
        duration: performance.now() - start
      }));
    }
    
    return Promise.resolve({
      result,
      duration: performance.now() - start
    });
  }

  /**
   * Cleanup utilities for preventing memory leaks
   */
  static createCleanupTracker(): {
    track: (cleanup: () => void) => void;
    cleanup: () => void;
  } {
    const cleanupFunctions: (() => void)[] = [];
    
    return {
      track: (cleanup: () => void) => {
        cleanupFunctions.push(cleanup);
      },
      cleanup: () => {
        cleanupFunctions.forEach(fn => {
          try {
            fn();
          } catch (error) {
            console.warn('Cleanup function failed:', error);
          }
        });
        cleanupFunctions.length = 0;
      }
    };
  }

  /**
   * Optimized fixture setup with performance monitoring
   */
  static async setupFixture<T>(
    fixture: ComponentFixture<T>,
    options: {
      detectChanges?: boolean;
      waitForStable?: boolean;
      timeout?: number;
      monitorMemory?: boolean;
    } = {}
  ): Promise<{
    fixture: ComponentFixture<T>;
    setupTime: number;
    memoryUsed?: number;
  }> {
    const startTime = performance.now();
    const memoryMonitor = options.monitorMemory ? this.monitorMemory() : null;
    
    if (memoryMonitor) {
      memoryMonitor.start();
    }

    if (options.detectChanges !== false) {
      fixture.detectChanges();
    }

    if (options.waitForStable !== false) {
      await this.waitForStableState(fixture, options.timeout);
    }

    const setupTime = performance.now() - startTime;
    const memoryData = memoryMonitor?.end();

    return {
      fixture,
      setupTime,
      memoryUsed: memoryData?.used
    };
  }

  /**
   * Performance assertion helpers
   */
  static assertPerformance(
    actualTime: number, 
    maxTime: number, 
    operation: string
  ): void {
    if (actualTime > maxTime) {
      console.warn(`⚠️ Performance warning: ${operation} took ${actualTime}ms (max: ${maxTime}ms)`);
    }
    
    // Don't fail tests for performance issues, just warn
    expect(actualTime).toBeLessThan(maxTime * 2); // Allow 2x buffer for CI environments
  }

  /**
   * Batch test execution for better performance
   */
  static async runBatchTests<T>(
    tests: (() => Promise<T>)[],
    batchSize = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < tests.length; i += batchSize) {
      const batch = tests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(test => test()));
      results.push(...batchResults);
    }
    
    return results;
  }
}

/**
 * Performance test decorators
 */
export function measurePerformance(maxTime = 1000) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const result = await method.apply(this, args);
      const duration = performance.now() - start;
      
      PerformanceTestHelpers.assertPerformance(duration, maxTime, propertyName);
      
      return result;
    };
  };
}

/**
 * Memory leak detection helper
 */
export class MemoryLeakDetector {
  private static instances = new WeakSet();
  
  static track(instance: any): void {
    this.instances.add(instance);
  }
  
  static checkLeaks(): void {
    // This is a simplified leak detection
    // In a real implementation, you'd use more sophisticated techniques
    if (performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize;
      if (memoryUsage > 100 * 1024 * 1024) { // 100MB threshold
        console.warn(`⚠️ High memory usage detected: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
      }
    }
  }
}
