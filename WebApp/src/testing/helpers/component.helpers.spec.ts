import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  createComponentWithMocks,
  testInputProperty,
  testOutputEvent,
  openBootstrapModal,
  closeBootstrapModal,
  isModalOpen,
  getDebugElement,
  getAllDebugElements,
  detectChangesAsync
} from './component.helpers';

// Test component for testing the helpers
@Component({
  template: `
    <div>
      <h1 data-testid="title">{{ title }}</h1>
      <button data-testid="click-button" (click)="handleClick()">Click Me</button>
      <button class="btn btn-primary">Primary Button</button>
      <button class="btn btn-secondary">Secondary Button</button>
      
      <!-- Modal for testing -->
      <div id="test-modal" class="modal" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <h4>Test Modal</h4>
          </div>
        </div>
      </div>
    </div>
  `,
  standalone: true
})
class TestComponent {
  @Input() title = 'Default Title';
  @Output() itemClicked = new EventEmitter<{ id: number }>();

  handleClick(): void {
    this.itemClicked.emit({ id: 123 });
  }

  async loadDataAsync(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.title = 'Loaded Data';
        resolve();
      }, 100);
    });
  }
}

describe('Component Helpers', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestComponent]
    });
  });

  describe('createComponentWithMocks', () => {
    it('should create component with mocked services', () => {
      const { component, fixture, mocks } = createComponentWithMocks(
        TestComponent,
        { MockTestService: ['getData', 'saveData'] }
      );

      expect(component).toBeTruthy();
      expect(fixture).toBeTruthy();
      expect(mocks['MockTestService']).toBeTruthy();
      expect(mocks['MockTestService'].getData).toEqual(jasmine.any(Function));
      expect(mocks['MockTestService'].saveData).toEqual(jasmine.any(Function));
    });

    it('should set input properties', () => {
      const { component } = createComponentWithMocks(
        TestComponent,
        {},
        { inputs: { title: 'Custom Title' } }
      );

      expect(component.title).toBe('Custom Title');
    });

    it('should handle empty mock services', () => {
      const { component, fixture, mocks } = createComponentWithMocks(TestComponent);

      expect(component).toBeTruthy();
      expect(fixture).toBeTruthy();
      expect(Object.keys(mocks)).toEqual([]);
    });
  });

  describe('testInputProperty', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(TestComponent);
      component = fixture.componentInstance;
    });

    it('should test input property changes', () => {
      testInputProperty(fixture, 'title', 'New Title');
      expect(component.title).toBe('New Title');
    });
  });

  describe('testOutputEvent', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(TestComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should test output event emission', async () => {
      const eventData = await testOutputEvent(
        fixture,
        'itemClicked',
        () => {
          const button = fixture.debugElement.nativeElement.querySelector('[data-testid="click-button"]');
          button.click();
        }
      );

      expect(eventData).toEqual({ id: 123 });
    });

    it('should reject if event is not emitted', async () => {
      try {
        await testOutputEvent(
          fixture,
          'itemClicked',
          () => {
            // Don't trigger the event
          },
          200 // short timeout so the rejection fires well within Jasmine's limit
        );
        fail('Should have rejected');
      } catch (error: any) {
        expect(error.message).toContain('was not emitted within timeout');
      }
    }, 1000);

    it('should reject if event emitter does not exist', async () => {
      try {
        await testOutputEvent(
          fixture,
          'nonExistentEvent',
          () => {
            console.log("Trigger action")
          }
        );
        fail('Should have rejected');
      } catch (error: any) {
        expect(error.message).toContain('not found or not subscribable');
      }
    });
  });

  describe('Bootstrap Modal Helpers', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(TestComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    afterEach(() => {
      // Clean up any modals
      const modal = document.getElementById('test-modal');
      if (modal) {
        closeBootstrapModal('test-modal');
      }
      
      // Remove any leftover backdrops
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      
      // Remove modal-open class
      document.body.classList.remove('modal-open');
    });

    it('should open a modal', () => {
      openBootstrapModal('test-modal');
      
      expect(isModalOpen('test-modal')).toBe(true);
      
      const modal = document.getElementById('test-modal');
      expect(modal?.classList.contains('show')).toBe(true);
      expect(modal?.style.display).toBe('block');
      expect(modal?.getAttribute('aria-modal')).toBe('true');
      expect(modal?.hasAttribute('aria-hidden')).toBe(false);
      
      // Check backdrop
      const backdrop = document.getElementById('test-modal-backdrop');
      expect(backdrop).toBeTruthy();
      expect(backdrop?.classList.contains('modal-backdrop')).toBe(true);
      
      // Check body class
      expect(document.body.classList.contains('modal-open')).toBe(true);
    });

    it('should close a modal', () => {
      openBootstrapModal('test-modal');
      closeBootstrapModal('test-modal');
      
      expect(isModalOpen('test-modal')).toBe(false);
      
      const modal = document.getElementById('test-modal');
      expect(modal?.classList.contains('show')).toBe(false);
      expect(modal?.style.display).toBe('none');
      expect(modal?.getAttribute('aria-hidden')).toBe('true');
      expect(modal?.hasAttribute('aria-modal')).toBe(false);
      
      // Check backdrop is removed
      const backdrop = document.getElementById('test-modal-backdrop');
      expect(backdrop).toBeFalsy();
      
      // Check body class is removed
      expect(document.body.classList.contains('modal-open')).toBe(false);
    });

    it('should throw error for non-existent modal', () => {
      expect(() => openBootstrapModal('non-existent-modal')).toThrowError('Modal with ID \'non-existent-modal\' not found');
      expect(() => closeBootstrapModal('non-existent-modal')).toThrowError('Modal with ID \'non-existent-modal\' not found');
    });

    it('should return false for non-existent modal check', () => {
      expect(isModalOpen('non-existent-modal')).toBe(false);
    });
  });

  describe('Debug Element Helpers', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(TestComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should get debug element by CSS selector', () => {
      const titleElement = getDebugElement(fixture, '[data-testid="title"]');
      expect(titleElement).toBeTruthy();
      expect(titleElement?.nativeElement.textContent.trim()).toBe('Default Title');
    });

    it('should return null for non-existent element', () => {
      const element = getDebugElement(fixture, '.non-existent');
      expect(element).toBeNull();
    });

    it('should get all debug elements by CSS selector', () => {
      const buttons = getAllDebugElements(fixture, 'button');
      expect(buttons.length).toBe(3); // Three buttons in the template (including modal button)
    });

    it('should return empty array for non-existent elements', () => {
      const elements = getAllDebugElements(fixture, '.non-existent');
      expect(elements).toEqual([]);
    });
  });

  describe('detectChangesAsync', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(TestComponent);
      component = fixture.componentInstance;
    });

    it('should handle async operations', async () => {
      await component.loadDataAsync();
      await detectChangesAsync(fixture);
      
      // The async operation should complete and update the title
      expect(component.title).toBe('Loaded Data');
    });
  });
});
