import { TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { LoadingStateService } from './loading-state.service';

describe('LoadingStateService', () => {
  let service: LoadingStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoadingStateService]
    });

    service = TestBed.inject(LoadingStateService);
  });

  describe('Loading State Management', () => {
    it('should initialize with false loading state', () => {
      expect(service.isLoading()).toBe(false);

      service.loading$.subscribe(loading => {
        expect(loading).toBe(false);
      });
    });

    it('should set loading state to true and emit changes', fakeAsync(() => {
      const loadingStates: boolean[] = [];

      service.loading$.subscribe(loading => {
        loadingStates.push(loading);
      });

      service.setLoading(true);
      tick();

      expect(service.isLoading()).toBe(true);
      expect(loadingStates).toEqual([false, true]);
    }));

    it('should set loading state to false and emit changes', fakeAsync(() => {
      const loadingStates: boolean[] = [];

      service.loading$.subscribe(loading => {
        loadingStates.push(loading);
      });

      service.setLoading(true);
      service.setLoading(false);
      tick();

      expect(service.isLoading()).toBe(false);
      expect(loadingStates).toEqual([false, true, false]);
    }));

    it('should clear errors when loading starts', fakeAsync(() => {
      const errorMessages: (string | null)[] = [];

      service.error$.subscribe(error => {
        errorMessages.push(error);
      });

      // Set an error first
      service.setError('Test error');
      tick();

      // Start loading - should clear error
      service.setLoading(true);
      tick();

      expect(service.getCurrentError()).toBeNull();
      expect(errorMessages).toEqual([null, 'Test error', null]);
    }));

    it('should provide current loading state via getter', () => {
      expect(service.isLoading()).toBe(false);

      service.setLoading(true);
      expect(service.isLoading()).toBe(true);

      service.setLoading(false);
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('Error Message Management', () => {
    it('should set error messages and emit changes', fakeAsync(() => {
      const errorMessages: (string | null)[] = [];

      service.error$.subscribe(error => {
        errorMessages.push(error);
      });

      const testError = 'Authentication failed';
      service.setError(testError);
      tick();

      expect(service.getCurrentError()).toBe(testError);
      expect(errorMessages).toEqual([null, testError]);
    }));

    it('should clear error messages', fakeAsync(() => {
      const errorMessages: (string | null)[] = [];

      service.error$.subscribe(error => {
        errorMessages.push(error);
      });

      service.setError('Test error');
      service.setError(null);
      tick();

      expect(service.getCurrentError()).toBeNull();
      expect(errorMessages).toEqual([null, 'Test error', null]);
    }));

    it('should clear loading state when error is set', fakeAsync(() => {
      const loadingStates: boolean[] = [];

      service.loading$.subscribe(loading => {
        loadingStates.push(loading);
      });

      // Start loading first
      service.setLoading(true);
      tick();

      // Set error - should clear loading
      service.setError('Test error');
      tick();

      expect(service.isLoading()).toBe(false);
      expect(loadingStates).toEqual([false, true, false]);
    }));

    it('should provide current error via getter', () => {
      expect(service.getCurrentError()).toBeNull();

      service.setError('Test error');
      expect(service.getCurrentError()).toBe('Test error');

      service.setError(null);
      expect(service.getCurrentError()).toBeNull();
    });
  });

  describe('Observable Streams', () => {
    it('should emit loading state changes to subscribers', fakeAsync(() => {
      const loadingStates: boolean[] = [];

      service.loading$.subscribe(loading => {
        loadingStates.push(loading);
      });

      service.setLoading(true);
      service.setLoading(false);
      service.setLoading(true);
      tick();

      expect(loadingStates).toEqual([false, true, false, true]);
    }));

    it('should emit error message changes to subscribers', fakeAsync(() => {
      const errorMessages: (string | null)[] = [];

      service.error$.subscribe(error => {
        errorMessages.push(error);
      });

      service.setError('Error 1');
      service.setError('Error 2');
      service.setError(null);
      tick();

      expect(errorMessages).toEqual([null, 'Error 1', 'Error 2', null]);
    }));

    it('should provide current values to new subscribers', fakeAsync(() => {
      // Set loading state first
      service.setLoading(true);
      tick();

      // New subscribers should get current values immediately
      let currentLoading: boolean | undefined;
      let currentError: string | null | undefined;

      service.loading$.subscribe(loading => {
        currentLoading = loading;
      });

      service.error$.subscribe(error => {
        currentError = error;
      });

      expect(currentLoading).toBe(true);
      expect(currentError).toBeNull();
    }));

    it('should handle multiple subscribers correctly', fakeAsync(() => {
      const subscriber1States: boolean[] = [];
      const subscriber2States: boolean[] = [];

      service.loading$.subscribe(loading => {
        subscriber1States.push(loading);
      });

      service.setLoading(true);
      tick();

      // Add second subscriber after state change
      service.loading$.subscribe(loading => {
        subscriber2States.push(loading);
      });

      service.setLoading(false);
      tick();

      expect(subscriber1States).toEqual([false, true, false]);
      expect(subscriber2States).toEqual([true, false]);
    }));
  });

  describe('Clear Method', () => {
    it('should clear all states', fakeAsync(() => {
      const loadingStates: boolean[] = [];
      const errorMessages: (string | null)[] = [];

      service.loading$.subscribe(loading => {
        loadingStates.push(loading);
      });

      service.error$.subscribe(error => {
        errorMessages.push(error);
      });

      // Set loading state first
      service.setLoading(true);
      tick();

      // Clear all - this calls setLoading(false) and setError(null)
      service.clear();
      tick();

      expect(service.isLoading()).toBe(false);
      expect(service.getCurrentError()).toBeNull();
      expect(loadingStates).toEqual([false, true, false]);
      expect(errorMessages).toEqual([null, null, null]);
    }));
  });
});
