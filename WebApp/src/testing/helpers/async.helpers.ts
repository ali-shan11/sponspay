import { Observable, firstValueFrom, timeout } from 'rxjs';
import { tick, flush, discardPeriodicTasks } from '@angular/core/testing';

/**
 * Flushes all pending promises in the microtask queue
 * 
 * @returns Promise that resolves when all microtasks are complete
 * 
 * @example
 * ```typescript
 * component.loadDataAsync();
 * await flushPromises();
 * expect(component.data).toBeDefined();
 * ```
 */
export function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Waits for a condition to become true with optional timeout
 * 
 * @param condition - Function that returns true when condition is met
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 5000)
 * @param intervalMs - How often to check the condition in milliseconds (default: 10)
 * @returns Promise that resolves when condition is true or rejects on timeout
 * 
 * @example
 * ```typescript
 * component.startAsyncOperation();
 * await waitForCondition(() => component.isComplete, 3000);
 * expect(component.result).toBeDefined();
 * ```
 */
export function waitForCondition(
  condition: () => boolean,
  timeoutMs = 5000,
  intervalMs = 10
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkCondition = () => {
      if (condition()) {
        resolve();
        return;
      }
      
      if (Date.now() - startTime >= timeoutMs) {
        reject(new Error(`Condition not met within ${timeoutMs}ms timeout`));
        return;
      }
      
      setTimeout(checkCondition, intervalMs);
    };
    
    checkCondition();
  });
}

/**
 * Tests that an Observable emits the expected values in order
 * 
 * @param observable - The Observable to test
 * @param expectedValues - Array of expected values in emission order
 * @param timeoutMs - Maximum time to wait for all emissions (default: 5000)
 * @returns Promise that resolves when all expected values are emitted
 * 
 * @example
 * ```typescript
 * const values$ = service.getValues();
 * await expectObservableToEmit(values$, [1, 2, 3]);
 * ```
 */
export function expectObservableToEmit<T>(
  observable: Observable<T>,
  expectedValues: T[],
  timeoutMs = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const emittedValues: T[] = [];
    let completed = false;
    
    const timeoutId = setTimeout(() => {
      if (!completed) {
        reject(new Error(
          `Observable did not emit all expected values within ${timeoutMs}ms. ` +
          `Expected: ${JSON.stringify(expectedValues)}, ` +
          `Received: ${JSON.stringify(emittedValues)}`
        ));
      }
    }, timeoutMs);
    
    const subscription = observable.subscribe({
      next: (value) => {
        emittedValues.push(value);
        
        // Check if we have all expected values
        if (emittedValues.length === expectedValues.length) {
          clearTimeout(timeoutId);
          completed = true;
          
          try {
            expect(emittedValues).toEqual(expectedValues);
            subscription.unsubscribe();
            resolve();
          } catch (error) {
            subscription.unsubscribe();
            reject(error);
          }
        }
      },
      error: (error) => {
        clearTimeout(timeoutId);
        completed = true;
        subscription.unsubscribe();
        reject(error);
      },
      complete: () => {
        clearTimeout(timeoutId);
        completed = true;
        subscription.unsubscribe();
        
        if (emittedValues.length !== expectedValues.length) {
          reject(new Error(
            `Observable completed but did not emit all expected values. ` +
            `Expected: ${JSON.stringify(expectedValues)}, ` +
            `Received: ${JSON.stringify(emittedValues)}`
          ));
        } else {
          try {
            expect(emittedValues).toEqual(expectedValues);
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      }
    });
  });
}

/**
 * Tests that an Observable emits a single value and completes
 * 
 * @param observable - The Observable to test
 * @param expectedValue - The expected single value
 * @param timeoutMs - Maximum time to wait for emission (default: 5000)
 * @returns Promise that resolves with the emitted value
 * 
 * @example
 * ```typescript
 * const result$ = service.getSingleValue();
 * const value = await expectObservableToEmitSingle(result$, 'expected');
 * expect(value).toBe('expected');
 * ```
 */
export function expectObservableToEmitSingle<T>(
  observable: Observable<T>,
  expectedValue: T,
  timeoutMs = 5000
): Promise<T> {
  return firstValueFrom(
    observable.pipe(
      timeout(timeoutMs)
    )
  ).then(value => {
    expect(value).toEqual(expectedValue);
    return value;
  });
}

/**
 * Tests that an Observable throws an error
 * 
 * @param observable - The Observable to test
 * @param expectedError - Expected error message or error instance
 * @param timeoutMs - Maximum time to wait for error (default: 5000)
 * @returns Promise that resolves when error is thrown
 * 
 * @example
 * ```typescript
 * const error$ = service.getErrorObservable();
 * await expectObservableToThrow(error$, 'Something went wrong');
 * ```
 */
export function expectObservableToThrow<T>(
  observable: Observable<T>,
  expectedError?: string | Error,
  timeoutMs = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Observable did not throw an error within ${timeoutMs}ms`));
    }, timeoutMs);
    
    const subscription = observable.subscribe({
      next: () => {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
        reject(new Error('Observable emitted a value instead of throwing an error'));
      },
      error: (error) => {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
        
        if (expectedError) {
          if (typeof expectedError === 'string') {
            expect(error.message).toContain(expectedError);
          } else {
            expect(error).toEqual(expectedError);
          }
        }
        
        resolve();
      },
      complete: () => {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
        reject(new Error('Observable completed instead of throwing an error'));
      }
    });
  });
}

/**
 * Advances fake timers by the specified amount (must be used within fakeAsync)
 * 
 * @param ms - Milliseconds to advance
 * 
 * @example
 * ```typescript
 * it('should handle delayed operations', fakeAsync(() => {
 *   component.startDelayedOperation(1000);
 *   advanceTimers(1000);
 *   expect(component.operationComplete).toBe(true);
 * }));
 * ```
 */
export function advanceTimers(ms: number): void {
  tick(ms);
}

/**
 * Flushes all pending timers (must be used within fakeAsync)
 * 
 * @example
 * ```typescript
 * it('should complete all timers', fakeAsync(() => {
 *   component.startMultipleTimers();
 *   flushTimers();
 *   expect(component.allTimersComplete).toBe(true);
 * }));
 * ```
 */
export function flushTimers(): void {
  flush();
}

/**
 * Discards all periodic tasks (must be used within fakeAsync)
 * Useful for cleaning up intervals and recurring timers
 * 
 * @example
 * ```typescript
 * it('should clean up intervals', fakeAsync(() => {
 *   component.startPolling();
 *   // Test some behavior
 *   discardPeriodicTimers(); // Clean up the polling interval
 * }));
 * ```
 */
export function discardPeriodicTimers(): void {
  discardPeriodicTasks();
}

/**
 * Creates a delayed promise that resolves after the specified time
 * 
 * @param ms - Milliseconds to delay
 * @param value - Value to resolve with (optional)
 * @returns Promise that resolves after the delay
 * 
 * @example
 * ```typescript
 * // In fakeAsync test
 * const promise = delay(1000, 'result');
 * advanceTimers(1000);
 * const result = await promise;
 * expect(result).toBe('result');
 * ```
 */
export function delay<T>(ms: number, value?: T): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => resolve(value as T), ms);
  });
}

/**
 * Creates a promise that rejects after the specified time
 * 
 * @param ms - Milliseconds to delay before rejection
 * @param error - Error to reject with
 * @returns Promise that rejects after the delay
 * 
 * @example
 * ```typescript
 * // In fakeAsync test
 * const promise = delayedReject(1000, new Error('Timeout'));
 * advanceTimers(1000);
 * await expectAsync(promise).toBeRejected();
 * ```
 */
export function delayedReject(ms: number, error: Error): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(error), ms);
  });
}

/**
 * Waits for the next animation frame
 * Useful for testing DOM updates that happen on the next frame
 * 
 * @returns Promise that resolves on the next animation frame
 * 
 * @example
 * ```typescript
 * component.triggerAnimation();
 * await waitForAnimationFrame();
 * expect(element.style.transform).toBe('translateX(100px)');
 * ```
 */
export function waitForAnimationFrame(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * Waits for multiple animation frames
 * 
 * @param frames - Number of frames to wait (default: 1)
 * @returns Promise that resolves after the specified number of frames
 * 
 * @example
 * ```typescript
 * component.startComplexAnimation();
 * await waitForAnimationFrames(3);
 * expect(component.animationComplete).toBe(true);
 * ```
 */
export function waitForAnimationFrames(frames = 1): Promise<void> {
  let remainingFrames = frames;
  
  return new Promise(resolve => {
    const nextFrame = () => {
      remainingFrames--;
      if (remainingFrames <= 0) {
        resolve();
      } else {
        requestAnimationFrame(nextFrame);
      }
    };
    
    requestAnimationFrame(nextFrame);
  });
}
