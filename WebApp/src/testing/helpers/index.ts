/**
 * Testing Helpers - Public API
 * 
 * This module provides a comprehensive set of testing utilities for Angular applications.
 * All helpers are designed to work together and follow consistent patterns.
 * 
 * @example
 * ```typescript
 * import { 
 *   createComponentWithMocks, 
 *   getByTestId, 
 *   clickElement, 
 *   expectObservableToEmit 
 * } from '@testing/helpers';
 * 
 * describe('MyComponent', () => {
 *   const { component, fixture, mocks } = createComponentWithMocks(
 *     MyComponent,
 *     { MyService: ['getData'] }
 *   );
 *   
 *   it('should handle click events', () => {
 *     const button = getByTestId(fixture, 'submit-button');
 *     clickElement(button, fixture);
 *     expect(component.submitted).toBe(true);
 *   });
 * });
 * ```
 */

// Component Testing Helpers
export {
  createComponentWithMocks,
  testInputProperty,
  testOutputEvent,
  openBootstrapModal,
  closeBootstrapModal,
  isModalOpen,
  getDebugElement,
  getAllDebugElements,
  detectChangesAsync,
  type ComponentMockConfig,
  type ComponentWithMocks
} from './component.helpers';

// Async Testing Helpers
export {
  flushPromises,
  waitForCondition,
  expectObservableToEmit,
  expectObservableToEmitSingle,
  expectObservableToThrow,
  advanceTimers,
  flushTimers,
  discardPeriodicTimers,
  delay,
  delayedReject,
  waitForAnimationFrame,
  waitForAnimationFrames
} from './async.helpers';

// DOM Testing Helpers
export {
  getByTestId,
  queryByTestId,
  getAllByTestId,
  clickElement,
  typeInInput,
  selectOption,
  setCheckbox,
  fillForm,
  submitForm,
  expectElementToHaveAriaLabel,
  expectElementToBeFocusable,
  expectElementToHaveClass,
  expectElementNotToHaveClass,
  expectElementToBeVisible,
  expectElementToBeHidden,
  expectElementToContainText,
  triggerKeyboardEvent,
  triggerMouseEvent
} from './dom.helpers';

// Performance Testing Helpers
export {
  PerformanceTestHelpers,
  measurePerformance,
  MemoryLeakDetector
} from './performance.helpers';

// Re-export common Angular testing utilities for convenience
export {
  TestBed,
  ComponentFixture,
  fakeAsync,
  tick,
  flush,
  discardPeriodicTasks
} from '@angular/core/testing';

// Re-export common RxJS testing utilities
export {
  of,
  throwError,
  EMPTY,
  NEVER,
  Observable,
  Subject,
  BehaviorSubject,
  ReplaySubject
} from 'rxjs';

// Note: Jasmine utilities (jasmine, expect, spyOn, createSpy, createSpyObj) 
// are available globally in Angular test environment and don't need to be imported

/**
 * Common test patterns and best practices
 * 
 * ## Component Testing Pattern
 * ```typescript
 * describe('ComponentName', () => {
 *   let component: ComponentName;
 *   let fixture: ComponentFixture<ComponentName>;
 *   let mocks: any;
 * 
 *   beforeEach(() => {
 *     const setup = createComponentWithMocks(ComponentName, {
 *       ServiceName: ['method1', 'method2']
 *     });
 *     component = setup.component;
 *     fixture = setup.fixture;
 *     mocks = setup.mocks;
 *   });
 * 
 *   it('should create', () => {
 *     expect(component).toBeTruthy();
 *   });
 * });
 * ```
 * 
 * ## Service Testing Pattern
 * ```typescript
 * describe('ServiceName', () => {
 *   let service: ServiceName;
 *   let httpMock: MockHttpClient;
 * 
 *   beforeEach(() => {
 *     TestBed.configureTestingModule({
 *       providers: [
 *         ServiceName,
 *         { provide: HttpClient, useClass: MockHttpClient }
 *       ]
 *     });
 *     service = TestBed.inject(ServiceName);
 *     httpMock = TestBed.inject(HttpClient) as MockHttpClient;
 *   });
 * });
 * ```
 * 
 * ## Async Testing Pattern
 * ```typescript
 * it('should handle async operations', fakeAsync(() => {
 *   component.startAsyncOperation();
 *   advanceTimers(1000);
 *   expect(component.operationComplete).toBe(true);
 * }));
 * 
 * it('should test observables', async () => {
 *   const values$ = service.getValues();
 *   await expectObservableToEmit(values$, [1, 2, 3]);
 * });
 * ```
 * 
 * ## DOM Testing Pattern
 * ```typescript
 * it('should handle user interactions', () => {
 *   fillForm(fixture, {
 *     'email-input': 'test@example.com',
 *     'password-input': 'password123'
 *   });
 *   
 *   submitForm(fixture, 'form', 'submit-button');
 *   expect(component.submitted).toBe(true);
 * });
 * ```
 * 
 * ## Bootstrap Modal Testing Pattern
 * ```typescript
 * it('should open and close modals', () => {
 *   openBootstrapModal('my-modal');
 *   expect(isModalOpen('my-modal')).toBe(true);
 *   
 *   closeBootstrapModal('my-modal');
 *   expect(isModalOpen('my-modal')).toBe(false);
 * });
 * ```
 */
