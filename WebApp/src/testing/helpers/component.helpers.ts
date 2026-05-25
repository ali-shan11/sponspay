import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Type, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

/**
 * Configuration options for creating components with mocks
 */
export interface ComponentMockConfig<T> {
  /** Input properties to set on the component */
  inputs?: Partial<T>;
  /** Additional providers to include in TestBed */
  providers?: any[];
  /** Additional declarations to include in TestBed */
  declarations?: any[];
  /** Additional imports to include in TestBed */
  imports?: any[];
}

/**
 * Result of creating a component with mocks
 */
export interface ComponentWithMocks<T> {
  /** The component instance */
  component: T;
  /** The component fixture */
  fixture: ComponentFixture<T>;
  /** Object containing all created mocks */
  mocks: Record<string, jasmine.SpyObj<any>>;
}

/**
 * Creates an Angular component with automatically mocked dependencies
 * 
 * @param componentType - The component class to create
 * @param mockServices - Object mapping service names to arrays of method names to mock
 * @param config - Additional configuration options
 * @returns Object containing component, fixture, and mocks
 * 
 * @example
 * ```typescript
 * const { component, fixture, mocks } = createComponentWithMocks(
 *   MyComponent,
 *   { 
 *     AuthService: ['signIn', 'signOut'],
 *     DataService: ['getData', 'saveData']
 *   },
 *   { inputs: { title: 'Test Title' } }
 * );
 * 
 * // Use the mocks
 * mocks.AuthService.signIn.and.returnValue(Promise.resolve());
 * ```
 */
export function createComponentWithMocks<T>(
  componentType: Type<T>,
  mockServices: Record<string, string[]> = {},
  config: ComponentMockConfig<T> = {}
): ComponentWithMocks<T> {
  const mocks: Record<string, jasmine.SpyObj<any>> = {};
  const providers = [...(config.providers || [])];

  // Create spy objects for each service
  Object.entries(mockServices).forEach(([serviceName, methods]) => {
    const mockService = jasmine.createSpyObj(serviceName, methods);
    mocks[serviceName] = mockService;
    
    // Try to find the actual service class for proper typing
    // This is a best-effort approach - if the service isn't available,
    // we'll use the string name as a token
    try {
      const serviceClass = (window as any)[serviceName];
      if (serviceClass) {
        providers.push({ provide: serviceClass, useValue: mockService });
      } else {
        providers.push({ provide: serviceName, useValue: mockService });
      }
    } catch {
      providers.push({ provide: serviceName, useValue: mockService });
    }
  });

  // Configure TestBed - handle standalone components
  const testBedConfig: any = {
    providers
  };

  // Check if component is standalone
  const isStandalone = (componentType as any).ɵcmp?.standalone;
  
  if (isStandalone) {
    // For standalone components, add to imports
    testBedConfig.imports = [componentType, ...(config.imports || [])];
    if (config.declarations && config.declarations.length > 0) {
      testBedConfig.declarations = config.declarations;
    }
  } else {
    // For non-standalone components, add to declarations
    testBedConfig.declarations = [componentType, ...(config.declarations || [])];
    testBedConfig.imports = config.imports || [];
  }

  TestBed.configureTestingModule(testBedConfig);

  // Create component
  const fixture = TestBed.createComponent(componentType);
  const component = fixture.componentInstance;

  // Set input properties if provided
  if (config.inputs) {
    Object.keys(config.inputs).forEach(key => {
      (component as any)[key] = (config.inputs as any)[key];
    });
  }

  // Initial change detection
  fixture.detectChanges();

  return { component, fixture, mocks };
}

/**
 * Tests that an input property correctly updates the component
 * 
 * @param fixture - The component fixture
 * @param propertyName - Name of the input property to test
 * @param testValue - Value to set and verify
 * 
 * @example
 * ```typescript
 * testInputProperty(fixture, 'title', 'New Title');
 * expect(component.title).toBe('New Title');
 * ```
 */
export function testInputProperty<T>(
  fixture: ComponentFixture<T>,
  propertyName: keyof T,
  testValue: any
): void {
  const component = fixture.componentInstance;
  
  // Set the property
  (component as any)[propertyName] = testValue;
  fixture.detectChanges();
  
  // Verify it was set
  expect((component as any)[propertyName]).toBe(testValue);
}

/**
 * Tests that an output event is emitted when an action is triggered
 * 
 * @param fixture - The component fixture
 * @param eventName - Name of the output event to test
 * @param triggerAction - Function that should trigger the event
 * @returns Promise that resolves with the emitted event data
 * 
 * @example
 * ```typescript
 * const eventData = await testOutputEvent(
 *   fixture,
 *   'itemClicked',
 *   () => clickElement(getByTestId(fixture, 'click-button'))
 * );
 * expect(eventData).toEqual({ id: 123 });
 * ```
 */
export function testOutputEvent<T>(
  fixture: ComponentFixture<T>,
  eventName: string,
  triggerAction: () => void,
  timeoutMs = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const component = fixture.componentInstance;
    const eventEmitter = (component as any)[eventName];

    if (!eventEmitter || typeof eventEmitter.subscribe !== 'function') {
      reject(new Error(`Event emitter '${eventName}' not found or not subscribable`));
      return;
    }

    // Set up timeout to prevent hanging tests
    const timeout = setTimeout(() => {
      reject(new Error(`Event '${eventName}' was not emitted within timeout`));
    }, timeoutMs);

    // Subscribe to the event
    const subscription = eventEmitter.subscribe((data: any) => {
      clearTimeout(timeout);
      subscription.unsubscribe();
      resolve(data);
    });

    // Trigger the action
    try {
      triggerAction();
      fixture.detectChanges();
    } catch (error) {
      clearTimeout(timeout);
      subscription.unsubscribe();
      reject(error);
    }
  });
}

/**
 * Opens a Bootstrap modal by ID
 * 
 * @param modalId - The ID of the modal element
 * 
 * @example
 * ```typescript
 * openBootstrapModal('revenue-estimator-modal');
 * expect(isModalOpen('revenue-estimator-modal')).toBe(true);
 * ```
 */
export function openBootstrapModal(modalId: string): void {
  const modalElement = document.getElementById(modalId);
  if (!modalElement) {
    throw new Error(`Modal with ID '${modalId}' not found`);
  }

  // Add Bootstrap modal classes to simulate opened state
  modalElement.classList.add('show');
  modalElement.style.display = 'block';
  modalElement.setAttribute('aria-modal', 'true');
  modalElement.removeAttribute('aria-hidden');

  // Add backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop fade show';
  backdrop.id = `${modalId}-backdrop`;
  document.body.appendChild(backdrop);

  // Add body class
  document.body.classList.add('modal-open');
}

/**
 * Closes a Bootstrap modal by ID
 * 
 * @param modalId - The ID of the modal element
 * 
 * @example
 * ```typescript
 * closeBootstrapModal('revenue-estimator-modal');
 * expect(isModalOpen('revenue-estimator-modal')).toBe(false);
 * ```
 */
export function closeBootstrapModal(modalId: string): void {
  const modalElement = document.getElementById(modalId);
  if (!modalElement) {
    throw new Error(`Modal with ID '${modalId}' not found`);
  }

  // Remove Bootstrap modal classes
  modalElement.classList.remove('show');
  modalElement.style.display = 'none';
  modalElement.setAttribute('aria-hidden', 'true');
  modalElement.removeAttribute('aria-modal');

  // Remove backdrop
  const backdrop = document.getElementById(`${modalId}-backdrop`);
  if (backdrop) {
    backdrop.remove();
  }

  // Remove body class if no other modals are open
  const openModals = document.querySelectorAll('.modal.show');
  if (openModals.length === 0) {
    document.body.classList.remove('modal-open');
  }
}

/**
 * Checks if a Bootstrap modal is currently open
 * 
 * @param modalId - The ID of the modal element
 * @returns True if the modal is open, false otherwise
 * 
 * @example
 * ```typescript
 * if (isModalOpen('revenue-estimator-modal')) {
 *   // Modal is open, perform test actions
 * }
 * ```
 */
export function isModalOpen(modalId: string): boolean {
  const modalElement = document.getElementById(modalId);
  if (!modalElement) {
    return false;
  }

  return modalElement.classList.contains('show') && 
         modalElement.style.display === 'block';
}

/**
 * Gets a component's DebugElement by CSS selector
 * 
 * @param fixture - The component fixture
 * @param selector - CSS selector to find the element
 * @returns The DebugElement or null if not found
 * 
 * @example
 * ```typescript
 * const buttonDebugElement = getDebugElement(fixture, 'button.primary');
 * expect(buttonDebugElement).toBeTruthy();
 * ```
 */
export function getDebugElement(
  fixture: ComponentFixture<any>, 
  selector: string
): DebugElement | null {
  return fixture.debugElement.query(By.css(selector));
}

/**
 * Gets all component DebugElements matching a CSS selector
 * 
 * @param fixture - The component fixture
 * @param selector - CSS selector to find the elements
 * @returns Array of DebugElements
 * 
 * @example
 * ```typescript
 * const buttons = getAllDebugElements(fixture, 'button');
 * expect(buttons.length).toBe(3);
 * ```
 */
export function getAllDebugElements(
  fixture: ComponentFixture<any>, 
  selector: string
): DebugElement[] {
  return fixture.debugElement.queryAll(By.css(selector));
}

/**
 * Triggers change detection and waits for async operations to complete
 * 
 * @param fixture - The component fixture
 * @returns Promise that resolves when all async operations are complete
 * 
 * @example
 * ```typescript
 * component.loadData();
 * await detectChangesAsync(fixture);
 * expect(component.data).toBeDefined();
 * ```
 */
export async function detectChangesAsync(fixture: ComponentFixture<any>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}
