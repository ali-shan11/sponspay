# Phase 1 Tasks: Testing Foundation Setup

## Overview
Phase 1 establishes the testing infrastructure and standards for the SponsPay WebApp unit testing initiative. Each task is designed to be completed in a single focused session (2-4 hours).

## Task Dependencies
```
Task 1 (Firebase Mocks) → Task 2 (Storage/HTTP Mocks) → Task 3 (Helpers) → Task 5 (Main Index)
                                                      ↘
Task 4 (Fixtures) → Task 5 (Main Index)
                                                      ↘
Task 6 (Karma Config) → Task 7 (Package Scripts) → Task 8 (Documentation)
```

---

## Task 1: Firebase Auth Mock Infrastructure
**Status**: ✅ COMPLETED  
**Estimated Effort**: 3-4 hours  
**Priority**: High (Foundation dependency)

### Objective
Create comprehensive Firebase Auth mocking utilities to enable isolated testing of authentication-dependent components and services.

### Files to Create
- `src/testing/mocks/firebase-auth.mock.ts`
- `src/testing/mocks/index.ts` (initial exports)

### Detailed Specifications

#### Firebase Auth Mock (`firebase-auth.mock.ts`)
```typescript
// Required mock features:
export interface MockFirebaseAuth {
  // User state management
  currentUser: MockUser | null;
  
  // Authentication methods
  signInWithPopup(provider: any): Promise<MockUserCredential>;
  signInWithRedirect(provider: any): Promise<void>;
  getRedirectResult(): Promise<MockUserCredential | null>;
  signOut(): Promise<void>;
  
  // Token management
  getIdToken(forceRefresh?: boolean): Promise<string>;
  getIdTokenResult(forceRefresh?: boolean): Promise<MockIdTokenResult>;
  
  // Event handling
  onAuthStateChanged(callback: (user: MockUser | null) => void): () => void;
  
  // Test utilities
  setMockUser(user: MockUser | null): void;
  setMockError(error: Error | null): void;
  simulateTokenExpiry(): void;
  resetMock(): void;
}

// Mock user interface
export interface MockUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  getIdToken(forceRefresh?: boolean): Promise<string>;
  getIdTokenResult(forceRefresh?: boolean): Promise<MockIdTokenResult>;
}

// Mock credential interface
export interface MockUserCredential {
  user: MockUser;
  credential: any;
  operationType: string;
}
```

### Acceptance Criteria
- [ ] Mock supports all authentication methods used in AuthService
- [ ] Mock can simulate success and error scenarios
- [ ] Mock provides realistic user data and tokens
- [ ] Mock includes test utilities for state manipulation
- [ ] Mock is properly typed with TypeScript interfaces
- [ ] Mock includes comprehensive JSDoc documentation

### Test Coverage Requirements
- Mock behavior verification tests
- Error simulation tests
- State management tests
- Token handling tests

---

## Task 2: Storage & HTTP Mock Infrastructure
**Status**: ✅ COMPLETED  
**Estimated Effort**: 2-3 hours  
**Priority**: High (Service testing dependency)

### Objective
Create mocking utilities for browser storage APIs and HTTP client to enable isolated service testing.

### Files to Create
- `src/testing/mocks/storage.mock.ts`
- `src/testing/mocks/http.mock.ts`
- `src/testing/mocks/services.mock.ts`
- Update `src/testing/mocks/index.ts`

### Detailed Specifications

#### Storage Mock (`storage.mock.ts`)
```typescript
// Required features:
export class MockStorage implements Storage {
  private store: { [key: string]: string } = {};
  
  get length(): number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  
  // Test utilities
  getStore(): { [key: string]: string };
  setStore(store: { [key: string]: string }): void;
  resetStore(): void;
}

// Factory functions
export function createMockLocalStorage(): MockStorage;
export function createMockSessionStorage(): MockStorage;
```

#### HTTP Mock (`http.mock.ts`)
```typescript
// Required features:
export class MockHttpClient {
  private responses: Map<string, any> = new Map();
  private errors: Map<string, Error> = new Map();
  
  get<T>(url: string, options?: any): Observable<T>;
  post<T>(url: string, body: any, options?: any): Observable<T>;
  put<T>(url: string, body: any, options?: any): Observable<T>;
  delete<T>(url: string, options?: any): Observable<T>;
  
  // Test utilities
  setMockResponse(url: string, response: any): void;
  setMockError(url: string, error: Error): void;
  clearMocks(): void;
  getRequestHistory(): Array<{ method: string; url: string; body?: any }>;
}
```

### Acceptance Criteria
- [ ] Storage mock implements complete Storage interface
- [ ] HTTP mock supports all HTTP methods used in services
- [ ] Mocks provide test utilities for response/error simulation
- [ ] Mocks track interactions for verification
- [ ] Mocks are properly typed and documented
- [ ] Export functions are available in index.ts

---

## Task 3: Testing Helper Functions
**Status**: ✅ COMPLETED  
**Estimated Effort**: 3-4 hours  
**Priority**: Medium (Component testing dependency)

### Objective
Create reusable helper functions to simplify component testing, async operations, and DOM manipulation.

### Files to Create
- `src/testing/helpers/component.helpers.ts`
- `src/testing/helpers/async.helpers.ts`
- `src/testing/helpers/dom.helpers.ts`
- `src/testing/helpers/index.ts`

### Detailed Specifications

#### Component Helpers (`component.helpers.ts`)
```typescript
// Required helper functions:

// Component creation with mocked dependencies
export function createComponentWithMocks<T>(
  component: Type<T>,
  mocks: { [key: string]: any },
  inputs?: Partial<T>
): { component: T; fixture: ComponentFixture<T>; mocks: any };

// Input property testing
export function testInputProperty<T>(
  fixture: ComponentFixture<T>,
  propertyName: keyof T,
  testValue: any
): void;

// Output event testing
export function testOutputEvent<T>(
  fixture: ComponentFixture<T>,
  eventName: string,
  triggerAction: () => void
): Promise<any>;

// Bootstrap modal testing
export function openBootstrapModal(modalId: string): void;
export function closeBootstrapModal(modalId: string): void;
export function isModalOpen(modalId: string): boolean;
```

#### Async Helpers (`async.helpers.ts`)
```typescript
// Required helper functions:

// Promise testing utilities
export function flushPromises(): Promise<void>;
export function waitForCondition(
  condition: () => boolean,
  timeout?: number
): Promise<void>;

// Observable testing utilities
export function expectObservableToEmit<T>(
  observable: Observable<T>,
  expectedValues: T[]
): Promise<void>;

// Timer testing utilities
export function advanceTimers(ms: number): void;
export function flushTimers(): void;
```

#### DOM Helpers (`dom.helpers.ts`)
```typescript
// Required helper functions:

// Element selection and interaction
export function getByTestId(fixture: ComponentFixture<any>, testId: string): HTMLElement;
export function queryByTestId(fixture: ComponentFixture<any>, testId: string): HTMLElement | null;
export function clickElement(element: HTMLElement): void;
export function typeInInput(input: HTMLInputElement, value: string): void;

// Form testing utilities
export function fillForm(fixture: ComponentFixture<any>, formData: { [key: string]: any }): void;
export function submitForm(fixture: ComponentFixture<any>, formSelector?: string): void;

// Accessibility testing helpers
export function expectElementToHaveAriaLabel(element: HTMLElement, label: string): void;
export function expectElementToBeFocusable(element: HTMLElement): void;
```

### Acceptance Criteria
- [ ] Component helpers simplify TestBed setup and mocking
- [ ] Async helpers handle promises, observables, and timers
- [ ] DOM helpers provide safe element interaction
- [ ] All helpers include error handling and validation
- [ ] Helpers are well-documented with usage examples
- [ ] Helper functions are exported through index.ts

---

## Task 4: Test Data Fixtures
**Status**: ✅ COMPLETED  
**Estimated Effort**: 2-3 hours  
**Priority**: Medium (Test data dependency)

### Objective
Create realistic, consistent test data fixtures for users, channels, and analytics to ensure predictable test scenarios.

### Files to Create
- `src/testing/fixtures/user.fixtures.ts`
- `src/testing/fixtures/channel.fixtures.ts`
- `src/testing/fixtures/analytics.fixtures.ts`
- `src/testing/fixtures/index.ts`

### Detailed Specifications

#### User Fixtures (`user.fixtures.ts`)
```typescript
// Required fixtures:
export const mockUsers = {
  authenticatedUser: {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    emailVerified: true
  },
  
  unauthenticatedUser: null,
  
  userWithoutEmail: {
    uid: 'test-user-456',
    email: null,
    displayName: 'Anonymous User',
    photoURL: null,
    emailVerified: false
  }
};

export const mockTokens = {
  validToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  expiredToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  invalidToken: 'invalid-token'
};

// Factory functions
export function createMockUser(overrides?: Partial<MockUser>): MockUser;
export function createMockToken(claims?: any): string;
```

#### Channel Fixtures (`channel.fixtures.ts`)
```typescript
// Required fixtures based on channel.model.ts:
export const mockChannels = {
  ownedChannel: {
    id: 'UC123456789',
    title: 'Test Channel',
    description: 'A test YouTube channel',
    thumbnails: { default: { url: 'https://example.com/thumb.jpg' } },
    statistics: {
      subscriberCount: '10000',
      videoCount: '50',
      viewCount: '500000'
    },
    isOwned: true,
    isManaged: false
  },
  
  managedChannel: {
    id: 'UC987654321',
    title: 'Managed Channel',
    description: 'A managed YouTube channel',
    thumbnails: { default: { url: 'https://example.com/thumb2.jpg' } },
    statistics: {
      subscriberCount: '50000',
      videoCount: '100',
      viewCount: '2000000'
    },
    isOwned: false,
    isManaged: true
  }
};

// Factory functions
export function createMockChannel(overrides?: Partial<Channel>): Channel;
export function createMockChannelList(count: number): Channel[];
```

#### Analytics Fixtures (`analytics.fixtures.ts`)
```typescript
// Required fixtures for revenue estimation:
export const mockAnalytics = {
  countryViewerData: [
    { country: 'US', viewers: 5000, countryCode: 'US' },
    { country: 'UK', viewers: 2000, countryCode: 'GB' },
    { country: 'Canada', viewers: 1500, countryCode: 'CA' }
  ],
  
  revenueEstimates: {
    totalRevenue: 1250.50,
    supportedCountryRevenue: 1000.25,
    unsupportedCountryRevenue: 250.25,
    breakdown: [
      { country: 'US', revenue: 500.00, supported: true },
      { country: 'UK', revenue: 300.00, supported: true },
      { country: 'Canada', revenue: 200.25, supported: true }
    ]
  }
};

// Factory functions
export function createMockAnalyticsData(subscriberCount: number): any;
export function createMockCountryData(totalViewers: number): any[];
```

### Acceptance Criteria
- [ ] Fixtures cover all major data types used in the application
- [ ] Fixtures provide both valid and edge case scenarios
- [ ] Factory functions allow customization for specific test needs
- [ ] Data is realistic and consistent across fixtures
- [ ] Fixtures are properly typed and documented
- [ ] All fixtures are exported through index.ts

---

## Task 5: Main Testing Index & Public API
**Status**: ✅ COMPLETED  
**Estimated Effort**: 1-2 hours  
**Priority**: Low (Organization task)

### Objective
Create a clean public API for all testing utilities, making them easily accessible throughout the test suite.

### Files to Create/Update
- `src/testing/index.ts` (main export file)

### Detailed Specifications

#### Main Index (`index.ts`)
```typescript
// Organized exports for easy consumption:

// Mocks
export * from './mocks';

// Helpers
export * from './helpers';

// Fixtures
export * from './fixtures';

// Convenience re-exports for common testing utilities
export {
  TestBed,
  ComponentFixture,
  fakeAsync,
  tick,
  flush,
  discardPeriodicTasks
} from '@angular/core/testing';

export {
  of,
  throwError,
  EMPTY,
  NEVER
} from 'rxjs';

// Common Jasmine utilities
export {
  jasmine,
  expect,
  spyOn,
  createSpy,
  createSpyObj
} from 'jasmine';
```

### Acceptance Criteria
- [ ] All testing utilities are accessible through single import
- [ ] Exports are logically organized and documented
- [ ] Common Angular and RxJS testing utilities are re-exported
- [ ] Import paths are clean and intuitive
- [ ] No circular dependencies exist

---

## Task 6: Karma Configuration Updates
**Status**: ✅ COMPLETED  
**Estimated Effort**: 2-3 hours  
**Priority**: High (CI/CD dependency)

### Objective
Update Karma configuration to include coverage reporting, quality gates, and CI-friendly settings.

### Files to Modify
- `karma.conf.js`

### Detailed Specifications

#### Enhanced Karma Configuration
```javascript
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    
    // Coverage configuration
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/sponspay'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcov' },
        { type: 'cobertura' }
      ],
      check: {
        global: {
          statements: 80,
          branches: 75,
          functions: 90,
          lines: 80
        },
        each: {
          statements: 70,
          branches: 65,
          functions: 80,
          lines: 70
        }
      },
      watermarks: {
        statements: [70, 80],
        functions: [80, 90],
        branches: [65, 75],
        lines: [70, 80]
      }
    },
    
    // Browser configuration
    browsers: ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-web-security']
      }
    },
    
    // Test execution settings
    singleRun: false,
    restartOnFileChange: true,
    autoWatch: true,
    
    // Performance settings
    browserNoActivityTimeout: 60000,
    browserDisconnectTimeout: 10000,
    browserDisconnectTolerance: 3,
    
    // Logging
    logLevel: config.LOG_INFO,
    colors: true
  });
};
```

### Acceptance Criteria
- [ ] Coverage reporting is properly configured
- [ ] Quality thresholds are set according to plan
- [ ] CI-friendly browser launcher is configured
- [ ] Performance settings are optimized
- [ ] Multiple coverage report formats are generated
- [ ] Configuration supports both development and CI environments

---

## Task 7: Package.json Script Updates
**Status**: Completed
**Estimated Effort**: 1-2 hours  
**Priority**: Medium (Developer experience)

### Objective
Add comprehensive npm scripts for testing, coverage reporting, and CI integration.

### Files to Modify
- `package.json`

### Detailed Specifications

#### New Test Scripts
```json
{
  "scripts": {
    "test": "ng test",
    "test:watch": "ng test --watch",
    "test:coverage": "ng test --code-coverage --watch=false",
    "test:ci": "ng test --watch=false --browsers=ChromeHeadlessCI --code-coverage",
    "test:coverage-check": "ng test --code-coverage --watch=false --browsers=ChromeHeadlessCI",
    "test:debug": "ng test --source-map=true",
    "test:single": "ng test --watch=false --browsers=ChromeHeadless",
    "test:affected": "nx affected:test",
    "coverage:open": "open coverage/sponspay/index.html",
    "coverage:serve": "npx http-server coverage/sponspay -p 8080 -o"
  }
}
```

#### Script Descriptions
- `test`: Standard test runner with watch mode
- `test:watch`: Explicit watch mode for development
- `test:coverage`: Generate coverage report without watch
- `test:ci`: CI-optimized test run with coverage
- `test:coverage-check`: Coverage with threshold checking
- `test:debug`: Test with source maps for debugging
- `test:single`: Single run without watch
- `coverage:open`: Open coverage report in browser (macOS)
- `coverage:serve`: Serve coverage report on local server

### Acceptance Criteria
- [ ] Scripts cover all common testing scenarios
- [ ] CI script is optimized for automated environments
- [ ] Coverage scripts generate and display reports
- [ ] Scripts are documented with clear descriptions
- [ ] Scripts work across different operating systems

---

## Task 8: Testing Standards Documentation
**Status**: ✅ COMPLETED  
**Estimated Effort**: 2-3 hours  
**Priority**: Medium (Team alignment)

### Objective
Create comprehensive documentation of testing standards, patterns, and guidelines for the team.

### Files to Create
- `memory-bank/testing-standards.md`

### Detailed Specifications

#### Documentation Sections
1. **Testing Philosophy & Principles**
   - Unit testing goals and benefits
   - Testing pyramid and strategy
   - Quality over quantity approach

2. **File Organization & Naming**
   - Test file naming conventions
   - Directory structure standards
   - Import organization patterns

3. **Test Structure & Patterns**
   - Describe block organization
   - Test naming conventions
   - Setup and teardown patterns
   - Mock creation and management

4. **Component Testing Standards**
   - TestBed configuration patterns
   - Input/output testing approaches
   - Template testing strategies
   - Accessibility testing requirements

5. **Service Testing Standards**
   - Dependency injection mocking
   - Async operation testing
   - Error handling verification
   - State management testing

6. **Code Coverage Requirements**
   - Coverage thresholds and goals
   - Coverage exclusion guidelines
   - Quality metrics definitions

7. **Best Practices & Common Patterns**
   - DRY principles in testing
   - Test data management
   - Performance considerations
   - Debugging test failures

8. **Examples & Templates**
   - Component test template
   - Service test template
   - Mock creation examples
   - Common testing scenarios

### Acceptance Criteria
- [ ] Documentation covers all major testing scenarios
- [ ] Examples are practical and copy-pasteable
- [ ] Standards align with Angular best practices
- [ ] Guidelines are clear and actionable
- [ ] Document includes troubleshooting section
- [ ] Standards support maintainable test code

---

## Phase 1 Completion Criteria

### Definition of Done
- [ ] All 8 tasks completed with acceptance criteria met
- [ ] Testing infrastructure is fully functional
- [ ] Coverage reporting works correctly
- [ ] CI scripts execute successfully
- [ ] Documentation is comprehensive and accessible
- [ ] Team can begin Phase 2 service testing

### Quality Gates
- [ ] All new code follows TypeScript strict mode
- [ ] All utilities include comprehensive JSDoc documentation
- [ ] Mock implementations cover all required use cases
- [ ] Helper functions include error handling
- [ ] Configuration files are validated and tested

### Success Metrics
- [ ] Test infrastructure setup time: <30 minutes for new developers
- [ ] Mock creation time: <5 minutes for new service mocks
- [ ] Test execution time: <10 seconds for full suite (when empty)
- [ ] Coverage report generation: <30 seconds
- [ ] Zero configuration issues in CI environment

---

## Next Steps After Phase 1

1. **Phase 2 Preparation**: Review service testing priorities
2. **Team Training**: Conduct testing standards workshop
3. **Tool Validation**: Verify all utilities work as expected
4. **Process Refinement**: Adjust standards based on initial usage
5. **Phase 2 Kickoff**: Begin service layer testing implementation

---

*This task breakdown serves as a detailed roadmap for Phase 1 implementation. Each task should be completed in order due to dependencies, with regular progress updates and quality checks.*
