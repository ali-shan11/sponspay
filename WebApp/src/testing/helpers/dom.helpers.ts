import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

/**
 * Gets an element by test ID attribute
 * 
 * @param fixture - The component fixture
 * @param testId - The test ID to search for
 * @returns The HTML element
 * @throws Error if element is not found
 * 
 * @example
 * ```typescript
 * const button = getByTestId(fixture, 'submit-button');
 * expect(button).toBeTruthy();
 * ```
 */
export function getByTestId(fixture: ComponentFixture<any>, testId: string): HTMLElement {
  const element = fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));
  if (!element) {
    throw new Error(`Element with test ID "${testId}" not found`);
  }
  return element.nativeElement;
}

/**
 * Queries for an element by test ID attribute (returns null if not found)
 * 
 * @param fixture - The component fixture
 * @param testId - The test ID to search for
 * @returns The HTML element or null if not found
 * 
 * @example
 * ```typescript
 * const optionalElement = queryByTestId(fixture, 'optional-element');
 * if (optionalElement) {
 *   // Element exists, perform actions
 * }
 * ```
 */
export function queryByTestId(fixture: ComponentFixture<any>, testId: string): HTMLElement | null {
  const element = fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));
  return element ? element.nativeElement : null;
}

/**
 * Gets all elements by test ID attribute
 * 
 * @param fixture - The component fixture
 * @param testId - The test ID to search for
 * @returns Array of HTML elements
 * 
 * @example
 * ```typescript
 * const items = getAllByTestId(fixture, 'list-item');
 * expect(items.length).toBe(3);
 * ```
 */
export function getAllByTestId(fixture: ComponentFixture<any>, testId: string): HTMLElement[] {
  const elements = fixture.debugElement.queryAll(By.css(`[data-testid="${testId}"]`));
  return elements.map(el => el.nativeElement);
}

/**
 * Safely clicks an element and triggers change detection
 * 
 * @param element - The element to click
 * @param fixture - Optional fixture for automatic change detection
 * 
 * @example
 * ```typescript
 * const button = getByTestId(fixture, 'submit-button');
 * clickElement(button, fixture);
 * expect(component.submitted).toBe(true);
 * ```
 */
export function clickElement(element: HTMLElement, fixture?: ComponentFixture<any>): void {
  if (!element) {
    throw new Error('Cannot click null or undefined element');
  }
  
  element.click();
  
  if (fixture) {
    fixture.detectChanges();
  }
}

/**
 * Types text into an input element and triggers appropriate events
 * 
 * @param input - The input element
 * @param value - The text to type
 * @param fixture - Optional fixture for automatic change detection
 * 
 * @example
 * ```typescript
 * const emailInput = getByTestId(fixture, 'email-input') as HTMLInputElement;
 * typeInInput(emailInput, 'test@example.com', fixture);
 * expect(component.email).toBe('test@example.com');
 * ```
 */
export function typeInInput(
  input: HTMLInputElement, 
  value: string, 
  fixture?: ComponentFixture<any>
): void {
  if (!input) {
    throw new Error('Cannot type in null or undefined input');
  }
  
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  
  if (fixture) {
    fixture.detectChanges();
  }
}

/**
 * Selects an option in a select element
 * 
 * @param select - The select element
 * @param value - The value to select
 * @param fixture - Optional fixture for automatic change detection
 * 
 * @example
 * ```typescript
 * const countrySelect = getByTestId(fixture, 'country-select') as HTMLSelectElement;
 * selectOption(countrySelect, 'US', fixture);
 * expect(component.selectedCountry).toBe('US');
 * ```
 */
export function selectOption(
  select: HTMLSelectElement, 
  value: string, 
  fixture?: ComponentFixture<any>
): void {
  if (!select) {
    throw new Error('Cannot select option in null or undefined select element');
  }
  
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  
  if (fixture) {
    fixture.detectChanges();
  }
}

/**
 * Checks or unchecks a checkbox element
 * 
 * @param checkbox - The checkbox element
 * @param checked - Whether to check or uncheck
 * @param fixture - Optional fixture for automatic change detection
 * 
 * @example
 * ```typescript
 * const agreeCheckbox = getByTestId(fixture, 'agree-checkbox') as HTMLInputElement;
 * setCheckbox(agreeCheckbox, true, fixture);
 * expect(component.agreed).toBe(true);
 * ```
 */
export function setCheckbox(
  checkbox: HTMLInputElement, 
  checked: boolean, 
  fixture?: ComponentFixture<any>
): void {
  if (!checkbox) {
    throw new Error('Cannot set checkbox state on null or undefined element');
  }
  
  checkbox.checked = checked;
  checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  
  if (fixture) {
    fixture.detectChanges();
  }
}

/**
 * Fills a form with the provided data
 * 
 * @param fixture - The component fixture
 * @param formData - Object mapping test IDs to values
 * 
 * @example
 * ```typescript
 * fillForm(fixture, {
 *   'email-input': 'test@example.com',
 *   'password-input': 'password123',
 *   'country-select': 'US',
 *   'agree-checkbox': true
 * });
 * ```
 */
export function fillForm(
  fixture: ComponentFixture<any>, 
  formData: Record<string, any>
): void {
  Object.entries(formData).forEach(([testId, value]) => {
    const element = getByTestId(fixture, testId);
    
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox' || element.type === 'radio') {
        setCheckbox(element, Boolean(value), fixture);
      } else {
        typeInInput(element, String(value), fixture);
      }
    } else if (element instanceof HTMLSelectElement) {
      selectOption(element, String(value), fixture);
    } else if (element instanceof HTMLTextAreaElement) {
      element.value = String(value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
    } else {
      throw new Error(`Unsupported form element type for test ID "${testId}"`);
    }
  });
}

/**
 * Submits a form by clicking the submit button or triggering submit event
 * 
 * @param fixture - The component fixture
 * @param formSelector - CSS selector for the form (default: 'form')
 * @param submitButtonTestId - Test ID of submit button (optional)
 * 
 * @example
 * ```typescript
 * fillForm(fixture, { 'email-input': 'test@example.com' });
 * submitForm(fixture, 'form', 'submit-button');
 * expect(component.submitted).toBe(true);
 * ```
 */
export function submitForm(
  fixture: ComponentFixture<any>, 
  formSelector = 'form',
  submitButtonTestId?: string
): void {
  if (submitButtonTestId) {
    const submitButton = getByTestId(fixture, submitButtonTestId);
    clickElement(submitButton, fixture);
  } else {
    const form = fixture.debugElement.query(By.css(formSelector));
    if (!form) {
      throw new Error(`Form with selector "${formSelector}" not found`);
    }
    
    form.nativeElement.dispatchEvent(new Event('submit', { bubbles: true }));
    fixture.detectChanges();
  }
}

/**
 * Expects an element to have the specified ARIA label
 * 
 * @param element - The element to check
 * @param label - Expected ARIA label
 * 
 * @example
 * ```typescript
 * const button = getByTestId(fixture, 'close-button');
 * expectElementToHaveAriaLabel(button, 'Close dialog');
 * ```
 */
export function expectElementToHaveAriaLabel(element: HTMLElement, label: string): void {
  const ariaLabel = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby');
  
  if (!ariaLabel) {
    throw new Error(`Element does not have aria-label or aria-labelledby attribute`);
  }
  
  if (element.getAttribute('aria-label')) {
    expect(element.getAttribute('aria-label')).toBe(label);
  } else {
    // For aria-labelledby, we'd need to check the referenced element
    const labelElement = document.getElementById(ariaLabel);
    if (labelElement) {
      expect(labelElement.textContent?.trim()).toBe(label);
    } else {
      throw new Error(`Element with ID "${ariaLabel}" referenced by aria-labelledby not found`);
    }
  }
}

/**
 * Expects an element to be focusable
 * 
 * @param element - The element to check
 * 
 * @example
 * ```typescript
 * const button = getByTestId(fixture, 'primary-button');
 * expectElementToBeFocusable(button);
 * ```
 */
export function expectElementToBeFocusable(element: HTMLElement): void {
  const focusableElements = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ];
  
  const isFocusable = focusableElements.some(selector => {
    return element.matches(selector);
  }) || element.tabIndex >= 0;
  
  expect(isFocusable).toBe(true);
}

/**
 * Expects an element to have the specified CSS class
 * 
 * @param element - The element to check
 * @param className - Expected CSS class name
 * 
 * @example
 * ```typescript
 * const button = getByTestId(fixture, 'primary-button');
 * expectElementToHaveClass(button, 'btn-primary');
 * ```
 */
export function expectElementToHaveClass(element: HTMLElement, className: string): void {
  expect(element.classList.contains(className)).toBe(true);
}

/**
 * Expects an element to not have the specified CSS class
 * 
 * @param element - The element to check
 * @param className - CSS class name that should not be present
 * 
 * @example
 * ```typescript
 * const button = getByTestId(fixture, 'disabled-button');
 * expectElementNotToHaveClass(button, 'btn-primary');
 * ```
 */
export function expectElementNotToHaveClass(element: HTMLElement, className: string): void {
  expect(element.classList.contains(className)).toBe(false);
}

/**
 * Expects an element to be visible (not hidden by CSS)
 * 
 * @param element - The element to check
 * 
 * @example
 * ```typescript
 * const modal = getByTestId(fixture, 'modal');
 * expectElementToBeVisible(modal);
 * ```
 */
export function expectElementToBeVisible(element: HTMLElement): void {
  const style = window.getComputedStyle(element);
  expect(style.display).not.toBe('none');
  expect(style.visibility).not.toBe('hidden');
  expect(style.opacity).not.toBe('0');
}

/**
 * Expects an element to be hidden
 * 
 * @param element - The element to check
 * 
 * @example
 * ```typescript
 * const hiddenElement = queryByTestId(fixture, 'hidden-element');
 * if (hiddenElement) {
 *   expectElementToBeHidden(hiddenElement);
 * }
 * ```
 */
export function expectElementToBeHidden(element: HTMLElement): void {
  const style = window.getComputedStyle(element);
  const isHidden = style.display === 'none' || 
                   style.visibility === 'hidden' || 
                   style.opacity === '0';
  expect(isHidden).toBe(true);
}

/**
 * Expects an element to contain the specified text
 * 
 * @param element - The element to check
 * @param text - Expected text content
 * @param exact - Whether to match exactly or just contain the text (default: false)
 * 
 * @example
 * ```typescript
 * const heading = getByTestId(fixture, 'page-title');
 * expectElementToContainText(heading, 'Welcome');
 * ```
 */
export function expectElementToContainText(
  element: HTMLElement, 
  text: string, 
  exact = false
): void {
  const elementText = element.textContent?.trim() || '';
  
  if (exact) {
    expect(elementText).toBe(text);
  } else {
    expect(elementText).toContain(text);
  }
}

/**
 * Triggers a keyboard event on an element
 * 
 * @param element - The element to trigger the event on
 * @param key - The key to press (e.g., 'Enter', 'Escape', 'ArrowDown')
 * @param eventType - Type of keyboard event (default: 'keydown')
 * @param fixture - Optional fixture for automatic change detection
 * 
 * @example
 * ```typescript
 * const input = getByTestId(fixture, 'search-input');
 * triggerKeyboardEvent(input, 'Enter', 'keydown', fixture);
 * expect(component.searchTriggered).toBe(true);
 * ```
 */
export function triggerKeyboardEvent(
  element: HTMLElement,
  key: string,
  eventType: 'keydown' | 'keyup' | 'keypress' = 'keydown',
  fixture?: ComponentFixture<any>
): void {
  const event = new KeyboardEvent(eventType, {
    key,
    bubbles: true,
    cancelable: true
  });
  
  element.dispatchEvent(event);
  
  if (fixture) {
    fixture.detectChanges();
  }
}

/**
 * Triggers a mouse event on an element
 * 
 * @param element - The element to trigger the event on
 * @param eventType - Type of mouse event
 * @param fixture - Optional fixture for automatic change detection
 * 
 * @example
 * ```typescript
 * const button = getByTestId(fixture, 'hover-button');
 * triggerMouseEvent(button, 'mouseenter', fixture);
 * expect(component.isHovered).toBe(true);
 * ```
 */
export function triggerMouseEvent(
  element: HTMLElement,
  eventType: 'click' | 'mouseenter' | 'mouseleave' | 'mousedown' | 'mouseup',
  fixture?: ComponentFixture<any>
): void {
  const event = new MouseEvent(eventType, {
    bubbles: true,
    cancelable: true
  });
  
  element.dispatchEvent(event);
  
  if (fixture) {
    fixture.detectChanges();
  }
}
