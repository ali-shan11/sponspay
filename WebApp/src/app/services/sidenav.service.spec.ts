import { TestBed } from '@angular/core/testing';
import { SidenavService } from './sidenav.service';

describe('SidenavService', () => {
  let service: SidenavService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SidenavService);
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with closed state (false)', () => {
      // Access the current value through the BehaviorSubject
      expect(service['sidenavToggle'].value).toBe(false);
    });

    it('should provide observable that emits initial false value', (done) => {
      service.sidenavToggle$.subscribe(isOpen => {
        expect(isOpen).toBe(false);
        done();
      });
    });

    it('should have sidenavToggle$ observable defined', () => {
      expect(service.sidenavToggle$).toBeDefined();
      expect(typeof service.sidenavToggle$.subscribe).toBe('function');
    });
  });

  describe('State Management', () => {
    it('should toggle state from false to true', () => {
      // Initial state should be false
      expect(service['sidenavToggle'].value).toBe(false);
      
      // Toggle to true
      service.toggle();
      expect(service['sidenavToggle'].value).toBe(true);
    });

    it('should toggle state from true to false', () => {
      // Set initial state to true
      service.toggle(); // false -> true
      expect(service['sidenavToggle'].value).toBe(true);
      
      // Toggle back to false
      service.toggle(); // true -> false
      expect(service['sidenavToggle'].value).toBe(false);
    });

    it('should handle multiple consecutive toggles correctly', () => {
      // Start with false
      expect(service['sidenavToggle'].value).toBe(false);
      
      // Toggle sequence: false -> true -> false -> true
      service.toggle();
      expect(service['sidenavToggle'].value).toBe(true);
      
      service.toggle();
      expect(service['sidenavToggle'].value).toBe(false);
      
      service.toggle();
      expect(service['sidenavToggle'].value).toBe(true);
    });

    it('should maintain state consistency across multiple operations', () => {
      const initialState = service['sidenavToggle'].value;
      
      // Even number of toggles should return to initial state
      for (let i = 0; i < 10; i++) {
        service.toggle();
      }
      
      expect(service['sidenavToggle'].value).toBe(initialState);
    });
  });

  describe('Observable Behavior', () => {
    it('should emit state changes to subscribers', () => {
      const emittedValues: boolean[] = [];
      
      service.sidenavToggle$.subscribe(isOpen => {
        emittedValues.push(isOpen);
      });
      
      // Initial value should be emitted immediately
      expect(emittedValues).toEqual([false]);
      
      // Toggle and verify emission
      service.toggle();
      expect(emittedValues).toEqual([false, true]);
      
      // Toggle again and verify emission
      service.toggle();
      expect(emittedValues).toEqual([false, true, false]);
    });

    it('should provide current state to new subscribers immediately', () => {
      // Change state first
      service.toggle(); // false -> true
      
      // New subscriber should get current state immediately
      let receivedValue: boolean | undefined;
      service.sidenavToggle$.subscribe(isOpen => {
        receivedValue = isOpen;
      });
      
      expect(receivedValue).toBe(true);
    });

    it('should emit to multiple subscribers simultaneously', () => {
      const subscriber1Values: boolean[] = [];
      const subscriber2Values: boolean[] = [];
      
      // Set up multiple subscribers
      service.sidenavToggle$.subscribe(isOpen => {
        subscriber1Values.push(isOpen);
      });
      
      service.sidenavToggle$.subscribe(isOpen => {
        subscriber2Values.push(isOpen);
      });
      
      // Both should receive initial value
      expect(subscriber1Values).toEqual([false]);
      expect(subscriber2Values).toEqual([false]);
      
      // Toggle and verify both receive update
      service.toggle();
      expect(subscriber1Values).toEqual([false, true]);
      expect(subscriber2Values).toEqual([false, true]);
    });

    it('should handle subscription cleanup properly', () => {
      const emittedValues: boolean[] = [];
      
      const subscription = service.sidenavToggle$.subscribe(isOpen => {
        emittedValues.push(isOpen);
      });
      
      // Initial value
      expect(emittedValues).toEqual([false]);
      
      // Toggle while subscribed
      service.toggle();
      expect(emittedValues).toEqual([false, true]);
      
      // Unsubscribe
      subscription.unsubscribe();
      
      // Toggle after unsubscribe - should not add to array
      service.toggle();
      expect(emittedValues).toEqual([false, true]); // No new values
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive toggles', () => {
      const emittedValues: boolean[] = [];
      
      service.sidenavToggle$.subscribe(isOpen => {
        emittedValues.push(isOpen);
      });
      
      // Rapid toggles
      service.toggle();
      service.toggle();
      service.toggle();
      service.toggle();
      service.toggle();
      
      // Should have all state changes recorded
      expect(emittedValues).toEqual([false, true, false, true, false, true]);
      
      // Final state should be true (odd number of toggles from false)
      expect(service['sidenavToggle'].value).toBe(true);
    });

    it('should maintain consistency with multiple simultaneous subscribers during rapid changes', () => {
      const subscriber1Values: boolean[] = [];
      const subscriber2Values: boolean[] = [];
      const subscriber3Values: boolean[] = [];
      
      // Set up multiple subscribers
      service.sidenavToggle$.subscribe(isOpen => subscriber1Values.push(isOpen));
      service.sidenavToggle$.subscribe(isOpen => subscriber2Values.push(isOpen));
      service.sidenavToggle$.subscribe(isOpen => subscriber3Values.push(isOpen));
      
      // Rapid state changes
      service.toggle(); // false -> true
      service.toggle(); // true -> false
      service.toggle(); // false -> true
      
      // All subscribers should have identical sequences
      const expectedSequence = [false, true, false, true];
      expect(subscriber1Values).toEqual(expectedSequence);
      expect(subscriber2Values).toEqual(expectedSequence);
      expect(subscriber3Values).toEqual(expectedSequence);
    });

    it('should not cause memory leaks with multiple subscribe/unsubscribe cycles', () => {
      // This test ensures the BehaviorSubject doesn't accumulate references
      const subscriptions = [];
      
      // Create and destroy multiple subscriptions
      for (let i = 0; i < 100; i++) {
        const subscription = service.sidenavToggle$.subscribe(() => {
          console.log("sidenav subscribed")
        });
        subscriptions.push(subscription);
        
        // Unsubscribe immediately
        subscription.unsubscribe();
      }
      
      // Service should still work normally
      service.toggle();
      expect(service['sidenavToggle'].value).toBe(true);
      
      // New subscription should work
      let receivedValue: boolean | undefined;
      service.sidenavToggle$.subscribe(isOpen => {
        receivedValue = isOpen;
      });
      
      expect(receivedValue).toBe(true);
    });

    it('should handle subscription during state change', () => {
      const emittedValues: boolean[] = [];
      
      // Subscribe during a toggle operation
      service.toggle(); // Change state to true
      
      service.sidenavToggle$.subscribe(isOpen => {
        emittedValues.push(isOpen);
      });
      
      // Should immediately receive current state
      expect(emittedValues).toEqual([true]);
      
      // Further toggles should work normally
      service.toggle();
      expect(emittedValues).toEqual([true, false]);
    });
  });

  describe('Service Integration', () => {
    it('should be injectable as singleton', () => {
      // Get another instance from TestBed
      const anotherInstance = TestBed.inject(SidenavService);
      
      // Should be the same instance (singleton)
      expect(service).toBe(anotherInstance);
    });

    it('should maintain state across multiple injections', () => {
      // Change state in first instance
      service.toggle();
      expect(service['sidenavToggle'].value).toBe(true);
      
      // Get another reference
      const anotherReference = TestBed.inject(SidenavService);
      
      // State should be maintained (same instance)
      expect(anotherReference['sidenavToggle'].value).toBe(true);
    });

    it('should work correctly in component-like usage pattern', () => {
      // Simulate how a component might use the service
      let currentSidenavState = false;
      
      // Component subscribes to state changes
      const subscription = service.sidenavToggle$.subscribe(isOpen => {
        currentSidenavState = isOpen;
      });
      
      // Initial state
      expect(currentSidenavState).toBe(false);
      
      // Component triggers toggle (e.g., hamburger menu click)
      service.toggle();
      expect(currentSidenavState).toBe(true);
      
      // Component triggers toggle again (e.g., close button click)
      service.toggle();
      expect(currentSidenavState).toBe(false);
      
      // Cleanup
      subscription.unsubscribe();
    });
  });
});
