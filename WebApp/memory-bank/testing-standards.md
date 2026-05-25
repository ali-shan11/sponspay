# SponsPay WebApp - Testing Standards & Guidelines

## Overview

This document establishes comprehensive testing standards for the SponsPay WebApp Angular application. These standards are based on the existing codebase patterns, testing infrastructure (Tasks 1-6), and Angular best practices to ensure consistent, maintainable, and reliable test code.

## Testing Philosophy & Principles

### Core Principles

1. **Isolation**: Each unit tested in isolation with mocked dependencies
2. **Comprehensive Coverage**: All public methods, edge cases, and error scenarios
3. **Maintainability**: Clear, readable tests that serve as documentation
4. **Performance**: Fast-running tests suitable for CI/CD
5. **Reliability**: Consistent, deterministic test results

### Testing Pyramid Strategy

```
    /\
   /  \     E2E Tests (5%)
  /____\    Integration Tests (15%)
 /      \   Unit Tests (80%)
/__________\
```

- **Unit Tests (80%)**: Services, components, utilities, pipes
- **Integration Tests (15%)**: Component interactions, service integration
- **E2E Tests (5%)**: Critical user journeys (authentication, revenue estimator)

### Quality Goals

- **80%+ Line Coverage**: Minimum threshold for all code
- **75%+ Branch Coverage**: Ensure all code paths are tested
- **90%+ Function Coverage**: All public methods must be tested
- **Zero Flaky Tests**: Tests must be deterministic and reliable

## File Organization & Naming

### Test File Structure

```
src/
├── app/
│   ├── components/
│   │   └── hero-section/
│   │       ├── hero-section.component.ts
│   │       ├── hero-section.component.spec.ts    ← Component test
│   │       ├── hero-section.component.html
│   │       └── hero-section.component.scss
│   ├── services/
│   │   ├── auth.service.ts
│   │   └── auth.service.spec.ts                  ← Service test
│   └── utils/
│       ├── phone-countrycode.ts
│       └── phone-countrycode.spec.ts             ← Utility test
└── testing/                                      ← Testing utilities
    ├── index.ts                                  ← Public API
    ├── mocks/                                    ← Mock implementations
    ├── helpers/                                  ← Testing helpers
    └── fixtures/                                 ← Test data
```

### Naming Conventions

#### Test Files
- **Pattern**: `{filename}.spec.ts`
- **Location**: Co-located with source files
- **Examples**: 
  - `auth.service.spec.ts`
  - `hero-section.component.spec.ts`
  - `phone-countrycode.spec.ts`

#### Test Suites (describe blocks)
- **Component Tests**: Use component class name
  ```typescript
  describe('HeroSectionComponent', () => {
  ```
- **Service Tests**: Use service class name
  ```typescript
  describe('AuthService', () => {
  ```
- **Utility Tests**: Use descriptive function/module name
  ```typescript
  describe('Phone Country Code Utils', () => {
  ```

#### Test Cases (it blocks)
- **Pattern**: `should {expected behavior} when {condition}`
- **Examples**:
  ```typescript
  it('should emit click event when button is clicked');
  it('should return null when token is expired');
  it('should handle authentication errors gracefully');
  ```

## Test Structure & Patterns

### Standard Test Structure

```typescript
describe('ComponentName', () => {
  // 1. Variable declarations
  let component: ComponentName;
  let fixture: ComponentFixture<ComponentName>;
  let mockService: jasmine.SpyObj<ServiceType>;

  // 2. Setup (beforeEach)
  beforeEach(async () => {
    // TestBed configuration
  });

  // 3. Test groups (nested describe blocks)
  describe('Component Lifecycle', () => {
    // Lifecycle tests
  });

  describe('User Interactions', () => {
    // Interaction tests
  });

  describe('Error Handling', () => {
    // Error scenario tests
  });

  // 4. Cleanup (afterEach - if needed)
  afterEach(() => {
    // Cleanup code
  });
});
```

### Test Organization Patterns

#### Nested Describe Blocks
Group related tests using descriptive nested `describe` blocks:

```typescript
describe('AuthService', () => {
  describe('Authentication Flow', () => {
    it('should handle successful Google OAuth');
    it('should handle authentication cancellation');
    it('should handle authentication errors');
  });

  describe('Token Management', () => {
    it('should store tokens securely');
    it('should validate stored tokens');
    it('should refresh expired tokens');
  });

  describe('Channel Management', () => {
    it('should fetch owned channels');
    it('should handle API errors gracefully');
  });
});
```

#### Test Data Setup
Use consistent patterns for test data:

```typescript
// Use fixtures for complex data
import { mockUsers, mockChannels } from '../testing';

// Use factory functions for customization
const testUser = createMockUser({ email: 'test@example.com' });

// Use constants for simple values
const TEST_CHANNEL_ID = 'UC123456789';
const TEST_ACCESS_TOKEN = 'test-token-123';
```

## Component Testing Standards

### Component Test Template

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentName } from './component-name.component';
import { ServiceDependency } from '../services/service-dependency.service';
import { createComponentWithMocks, mockUsers } from '../testing';

describe('ComponentName', () => {
  let component: ComponentName;
  let fixture: ComponentFixture<ComponentName>;
  let mockService: jasmine.SpyObj<ServiceDependency>;

  beforeEach(async () => {
    const { component: comp, fixture: fix, mocks } = createComponentWithMocks(
      ComponentName,
      {
        ServiceDependency: ['method1', 'method2']
      },
      {
        inputs: { title: 'Test Title' }
      }
    );

    component = comp;
    fixture = fix;
    mockService = mocks.ServiceDependency;
  });

  describe('Component Lifecycle', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.title).toBe('Test Title');
    });
  });

  describe('Input Properties', () => {
    it('should update when input changes', () => {
      component.title = 'New Title';
      fixture.detectChanges();
      
      expect(component.title).toBe('New Title');
    });
  });

  describe('Output Events', () => {
    it('should emit event when action occurs', async () => {
      const eventData = await testOutputEvent(
        fixture,
        'itemClicked',
        () => component.handleClick()
      );
      
      expect(eventData).toEqual({ id: 123 });
    });
  });

  describe('Template Rendering', () => {
    it('should display title in template', () => {
      const titleElement = getByTestId(fixture, 'component-title');
      expect(titleElement.textContent).toContain('Test Title');
    });
  });

  describe('User Interactions', () => {
    it('should handle button clicks', () => {
      spyOn(component, 'handleClick');
      const button = getByTestId(fixture, 'action-button');
      
      clickElement(button);
      
      expect(component.handleClick).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when service fails', () => {
      mockService.method1.and.returnValue(throwError('Service error'));
      
      component.loadData();
      fixture.detectChanges();
      
      expect(component.errorMessage).toBe('Failed to load data');
    });
  });
});
```

### Component Testing Patterns

#### Testing Input Properties
```typescript
describe('Input Properties', () => {
  it('should accept user input', () => {
    const testUser = mockUsers.authenticatedUser;
    component.user = testUser;
    fixture.detectChanges();
    
    expect(component.user).toBe(testUser);
  });

  it('should handle null input gracefully', () => {
    component.user = null;
    fixture.detectChanges();
    
    expect(component.user).toBeNull();
    expect(component.isAuthenticated).toBe(false);
  });
});
```

#### Testing Output Events
```typescript
describe('Output Events', () => {
  it('should emit channelSelected when channel is chosen', async () => {
    const testChannel = mockChannels.ownedChannel;
    
    const emittedData = await testOutputEvent(
      fixture,
      'channelSelected',
      () => component.selectChannel(testChannel)
    );
    
    expect(emittedData).toEqual(testChannel);
  });
});
```

#### Testing Bootstrap Modals
```typescript
describe('Modal Interactions', () => {
  it('should open modal when triggered', () => {
    component.openModal();
    fixture.detectChanges();
    
    expect(isModalOpen('revenue-estimator-modal')).toBe(true);
  });

  it('should close modal on cancel', () => {
    openBootstrapModal('revenue-estimator-modal');
    
    component.onCancel();
    fixture.detectChanges();
    
    expect(isModalOpen('revenue-estimator-modal')).toBe(false);
  });
});
```

#### Testing Async Operations
```typescript
describe('Async Operations', () => {
  it('should handle loading states', fakeAsync(() => {
    mockService.loadData.and.returnValue(of(testData).pipe(delay(1000)));
    
    component.loadData();
    expect(component.isLoading).toBe(true);
    
    tick(1000);
    fixture.detectChanges();
    
    expect(component.isLoading).toBe(false);
    expect(component.data).toEqual(testData);
  }));
});
```

## Service Testing Standards

### Service Test Template

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ServiceName } from './service-name.service';
import { DependencyService } from './dependency.service';
import { mockUsers, MockFirebaseAuth } from '../testing';

describe('ServiceName', () => {
  let service: ServiceName;
  let httpMock: HttpTestingController;
  let mockDependency: jasmine.SpyObj<DependencyService>;
  let mockAuth: MockFirebaseAuth;

  beforeEach(() => {
    const dependencySpy = jasmine.createSpyObj('DependencyService', ['method1', 'method2']);
    mockAuth = new MockFirebaseAuth();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ServiceName,
        { provide: DependencyService, useValue: dependencySpy },
        { provide: 'firebase-auth', useValue: mockAuth }
      ]
    });

    service = TestBed.inject(ServiceName);
    httpMock = TestBed.inject(HttpTestingController);
    mockDependency = TestBed.inject(DependencyService) as jasmine.SpyObj<DependencyService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Core Functionality', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('HTTP Operations', () => {
    it('should make GET request', () => {
      const testData = { id: 1, name: 'Test' };
      
      service.getData().subscribe(data => {
        expect(data).toEqual(testData);
      });

      const req = httpMock.expectOne('/api/data');
      expect(req.request.method).toBe('GET');
      req.flush(testData);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors gracefully', () => {
      service.getData().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne('/api/data');
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });
});
```

### Service Testing Patterns

#### Testing Firebase Authentication
```typescript
describe('Authentication', () => {
  it('should handle successful sign in', async () => {
    const testUser = mockUsers.authenticatedUser;
    mockAuth.setMockUser(testUser);
    
    const result = await service.signIn();
    
    expect(result).toBeTruthy();
    expect(service.currentUser).toEqual(testUser);
  });

  it('should handle sign in errors', async () => {
    mockAuth.setMockError(new Error('Authentication failed'));
    
    try {
      await service.signIn();
      fail('Should have thrown error');
    } catch (error) {
      expect(error.message).toBe('Authentication failed');
    }
  });
});
```

#### Testing HTTP Calls
```typescript
describe('API Integration', () => {
  it('should fetch user channels', () => {
    const testChannels = [mockChannels.ownedChannel];
    
    service.getChannels().subscribe(channels => {
      expect(channels).toEqual(testChannels);
    });

    const req = httpMock.expectOne('/api/channels');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush(testChannels);
  });
});
```

#### Testing Observable Streams
```typescript
describe('Observable Streams', () => {
  it('should emit user state changes', () => {
    const testUser = mockUsers.authenticatedUser;
    const userStates: any[] = [];
    
    service.user$.subscribe(user => userStates.push(user));
    
    service.setUser(testUser);
    service.setUser(null);
    
    expect(userStates).toEqual([null, testUser, null]);
  });
});
```

#### Testing Token Management
```typescript
describe('Token Management', () => {
  it('should store tokens with expiration', () => {
    const testToken = 'test-access-token';
    const expiresIn = 3600;
    
    service.storeTokens(testToken, expiresIn);
    
    expect(service.getStoredToken()).toBe(testToken);
  });

  it('should return null for expired tokens', () => {
    const testToken = 'test-access-token';
    const expiresIn = -1; // Already expired
    
    service.storeTokens(testToken, expiresIn);
    
    expect(service.getStoredToken()).toBeNull();
  });
});
```

## Code Coverage Requirements

### Coverage Thresholds

```javascript
// karma.conf.js coverage configuration
coverageReporter: {
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
  }
}
```

### Coverage Exclusions

Files and code patterns that should be excluded from coverage requirements:

```typescript
// Environment configuration files
src/environments/*

// Third-party integrations (comment-based exclusion)
/* istanbul ignore next */
private initializeThirdPartyLibrary() {
  // Third-party initialization code
}

// Generated code and type definitions
*.d.ts
```

### Coverage Quality Guidelines

1. **Focus on Business Logic**: Prioritize testing business logic over boilerplate code
2. **Test Edge Cases**: Ensure error conditions and boundary cases are covered
3. **Avoid Coverage Gaming**: Don't write tests just to increase coverage numbers
4. **Document Exclusions**: Clearly document why certain code is excluded

## Best Practices & Common Patterns

### DRY Principles in Testing

#### Shared Test Setup
```typescript
// Create reusable setup functions
function setupAuthServiceTest() {
  const mockAuth = new MockFirebaseAuth();
  const mockHttp = jasmine.createSpyObj('HttpClient', ['get', 'post']);
  
  TestBed.configureTestingModule({
    providers: [
      AuthService,
      { provide: 'firebase-auth', useValue: mockAuth },
      { provide: HttpClient, useValue: mockHttp }
    ]
  });

  return {
    service: TestBed.inject(AuthService),
    mockAuth,
    mockHttp
  };
}
```

#### Reusable Test Data
```typescript
// Use fixtures for consistent test data
import { mockUsers, mockChannels, createMockUser } from '../testing';

// Create test-specific variations
const testUserWithChannels = createMockUser({
  email: 'creator@example.com',
  channels: [mockChannels.ownedChannel]
});
```

### Mock Creation and Management

#### Service Mocks
```typescript
// Create comprehensive service mocks
const mockAuthService = jasmine.createSpyObj('AuthService', [
  'signIn',
  'signOut',
  'getCurrentUser',
  'getStoredToken',
  'getAllAccessibleChannels'
], {
  // Properties
  user$: of(mockUsers.authenticatedUser),
  channelStatus$: of('found')
});
```

#### Firebase Auth Mocks
```typescript
// Use the provided Firebase Auth mock
import { MockFirebaseAuth } from '../testing';

const mockAuth = new MockFirebaseAuth();
mockAuth.setMockUser(mockUsers.authenticatedUser);
```

### Performance Considerations

#### Fast Test Execution
```typescript
// Use fakeAsync for timer-based tests
it('should debounce search input', fakeAsync(() => {
  component.searchTerm = 'test';
  tick(300); // Debounce delay
  
  expect(mockService.search).toHaveBeenCalledWith('test');
}));

// Use synchronous observables when possible
mockService.getData.and.returnValue(of(testData));
```

#### Memory Management
```typescript
// Clean up subscriptions in tests
afterEach(() => {
  // Unsubscribe from any test subscriptions
  if (subscription) {
    subscription.unsubscribe();
  }
});
```

### Debugging Test Failures

#### Useful Debug Techniques
```typescript
// Add debug output for failing tests
it('should calculate revenue correctly', () => {
  const result = component.calculateRevenue();
  
  // Debug output
  console.log('Input data:', component.inputData);
  console.log('Calculation result:', result);
  
  expect(result).toBe(expectedValue);
});

// Use fixture.whenStable() for async operations
it('should load data on init', async () => {
  component.ngOnInit();
  await fixture.whenStable();
  fixture.detectChanges();
  
  expect(component.data).toBeDefined();
});
```

## Examples & Templates

### Complete Component Test Example

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeroSectionComponent } from './hero-section.component';
import { AuthFlowService } from '../../services/auth-flow.service';
import { LoadingStateService } from '../../services/loading-state.service';
import { createComponentWithMocks, getByTestId, clickElement } from '../../testing';

describe('HeroSectionComponent', () => {
  let component: HeroSectionComponent;
  let fixture: ComponentFixture<HeroSectionComponent>;
  let mockAuthFlow: jasmine.SpyObj<AuthFlowService>;
  let mockLoadingState: jasmine.SpyObj<LoadingStateService>;

  beforeEach(async () => {
    const { component: comp, fixture: fix, mocks } = createComponentWithMocks(
      HeroSectionComponent,
      {
        AuthFlowService: ['initiateRevenueEstimatorFlow'],
        LoadingStateService: ['isLoading$', 'errorMessage$', 'clearError']
      }
    );

    component = comp;
    fixture = fix;
    mockAuthFlow = mocks.AuthFlowService;
    mockLoadingState = mocks.LoadingStateService;

    // Setup default mock returns
    mockLoadingState.isLoading$ = of(false);
    mockLoadingState.errorMessage$ = of(null);
  });

  describe('Component Lifecycle', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default state', () => {
      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toBeNull();
    });
  });

  describe('Revenue Estimator Flow', () => {
    it('should initiate flow when button is clicked', () => {
      mockAuthFlow.initiateRevenueEstimatorFlow.and.returnValue(Promise.resolve());
      
      const button = getByTestId(fixture, 'revenue-estimator-button');
      clickElement(button);
      
      expect(mockAuthFlow.initiateRevenueEstimatorFlow).toHaveBeenCalled();
    });

    it('should show loading state during authentication', () => {
      mockLoadingState.isLoading$ = of(true);
      
      component.ngOnInit();
      fixture.detectChanges();
      
      expect(component.isLoading).toBe(true);
      
      const button = getByTestId(fixture, 'revenue-estimator-button');
      expect(button.disabled).toBe(true);
    });

    it('should display error message when authentication fails', () => {
      const errorMessage = 'Authentication failed';
      mockLoadingState.errorMessage$ = of(errorMessage);
      
      component.ngOnInit();
      fixture.detectChanges();
      
      expect(component.errorMessage).toBe(errorMessage);
      
      const errorElement = getByTestId(fixture, 'error-message');
      expect(errorElement.textContent).toContain(errorMessage);
    });

    it('should clear error when retry is clicked', () => {
      component.errorMessage = 'Previous error';
      fixture.detectChanges();
      
      const retryButton = getByTestId(fixture, 'retry-button');
      clickElement(retryButton);
      
      expect(mockLoadingState.clearError).toHaveBeenCalled();
    });
  });

  describe('Template Rendering', () => {
    it('should display hero title', () => {
      const titleElement = getByTestId(fixture, 'hero-title');
      expect(titleElement.textContent).toContain('Unlock Your Revenue Potential');
    });

    it('should show call-to-action button', () => {
      const button = getByTestId(fixture, 'revenue-estimator-button');
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('See Your Local Payments Impact');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const button = getByTestId(fixture, 'revenue-estimator-button');
      expect(button.getAttribute('aria-label')).toBeTruthy();
    });

    it('should be keyboard navigable', () => {
      const button = getByTestId(fixture, 'revenue-estimator-button');
      expect(button.tabIndex).not.toBe(-1);
    });
  });
});
```

### Complete Service Test Example

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { SessionStorageService } from './session-storage.service';
import { MockFirebaseAuth, mockUsers, mockChannels } from '../testing';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let mockSessionStorage: jasmine.SpyObj<SessionStorageService>;
  let mockAuth: MockFirebaseAuth;

  beforeEach(() => {
    const sessionStorageSpy = jasmine.createSpyObj('SessionStorageService', [
      'setLocalItem', 'getLocalItem', 'removeLocalItem'
    ]);
    mockAuth = new MockFirebaseAuth();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: SessionStorageService, useValue: sessionStorageSpy },
        { provide: 'firebase-auth', useValue: mockAuth }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    mockSessionStorage = TestBed.inject(SessionStorageService) as jasmine.SpyObj<SessionStorageService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Authentication Flow', () => {
    it('should handle successful Google OAuth', async () => {
      const testUser = mockUsers.authenticatedUser;
      const testToken = 'test-access-token';
      
      mockAuth.setMockUser(testUser);
      mockAuth.setMockCredential({ accessToken: testToken });
      
      const result = await service.processNewAuthentication(testToken);
      
      expect(result).toBe(true);
      expect(service.getCurrentAccessToken()).toBe(testToken);
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      mockAuth.setMockError(authError);
      
      try {
        await service.processNewAuthentication('invalid-token');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('Authentication failed');
      }
    });
  });

  describe('Token Management', () => {
    it('should store tokens with expiration', () => {
      const testToken = 'test-access-token';
      const expiresIn = 3600;
      
      service.storeTokens(testToken, expiresIn);
      
      expect(mockSessionStorage.setLocalItem).toHaveBeenCalledWith(
        'youtube_access_token', 
        testToken
      );
      expect(mockSessionStorage.setLocalItem).toHaveBeenCalledWith(
        'youtube_token_expires', 
        jasmine.any(String)
      );
    });

    it('should return null for expired tokens', () => {
      mockSessionStorage.getLocalItem.and.callFake((key: string) => {
        if (key === 'youtube_access_token') return 'test-token';
        if (key === 'youtube_token_expires') return '0'; // Expired
        return null;
      });
      
      const token = service.getStoredToken();
      
      expect(token).toBeNull();
      expect(mockSessionStorage.removeLocalItem).toHaveBeenCalledWith('youtube_access_token');
      expect(mockSessionStorage.removeLocalItem).toHaveBeenCalledWith('youtube_token_expires');
    });
  });

  describe('Channel Management', () => {
    it('should fetch owned channels', async () => {
      const testChannels = [mockChannels.ownedChannel];
      const testToken = 'test-access-token';
      
      const channels = await service.getAllAccessibleChannels(testToken);
      
      const req = httpMock.expectOne(req => 
        req.url.includes('youtube/v3/channels') && 
        req.params.get('mine') === 'true'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
      
      req.flush({
        items: [{
          id: testChannels[0].id,
          snippet: { title: testChannels[0].title },
          statistics: { subscriberCount: testChannels[0].subscriberCount }
        }]
      });
      
      expect(channels).toEqual(jasmine.arrayContaining([
        jasmine.objectContaining({
          id: testChannels[0].id,
          title: testChannels[0].title
        })
      ]));
    });

    it('should handle API errors gracefully', async () => {
      const testToken = 'test-access-token';
      
      const channelsPromise = service.getAllAccessibleChannels(testToken);
      
      const req = httpMock.expectOne(req => req.url.includes('youtube/v3/channels'));
      req.flush('API Error', { status: 403, statusText: 'Forbidden' });
      
      const channels = await channelsPromise;
      expect(channels).toEqual([]);
    });
  });

  describe('Session Restoration', () => {
    it('should restore valid session on initialization', async () => {
      const testUser = mockUsers.authenticatedUser;
      const testToken = 'valid-token';
      const futureExpiry = (Date.now() + 3600000).toString();
      
      mockAuth.setMockUser(testUser);
      mockSessionStorage.getLocalItem.and.callFake((key: string) => {
        if (key === 'youtube_access_token') return testToken;
        if (key === 'youtube_token_expires') return futureExpiry;
        return null;
      });
      
      // Trigger session restoration
      await service['restoreSession']();
      
      expect(service.getCurrentAccessToken()).toBe(testToken);
    });
  });
});
```

## Project-Specific Patterns

### Testing Revenue Estimator Components

```typescript
describe('RevenueEstimatorComponent', () => {
  // Test modal lifecycle
  it('should open modal with user data', () => {
    component.user = mockUsers.authenticatedUser;
    component.hasYouTubeChannel = true;
    
    component.ngAfterViewInit();
    
    expect(component.availableChannels.length).toBeGreaterThan(0);
  });

  // Test revenue calculations
  it('should calculate revenue increase correctly', async () => {
    component.totalViewersInSupportedCountries = 1000;
    component.youtubeSupport = 8;
    component.sponspaySupport = 62;
    
    await component['calculateRevenueImpact']();
    
    expect(component.revenueIncrease).toBe(7.8); // 62/8 = 7.75, rounded to 7.8
  });

  // Test mock data integration
  it('should use mock data when enabled', () => {
    component.useMockData = true;
    component.totalSubscribers = 10000;
    
    component['generateMockData']();
    
    expect(component.totalViewersInSupportedCountries).toBeGreaterThan(0);
  });
});
```

### Testing Authentication Integration

```typescript
describe('Authentication Integration', () => {
  it('should handle popup authentication flow', async () => {
    mockAuthService.signInWithPopup.and.returnValue(
      Promise.resolve(mockCredentials.validCredential)
    );
    
    await service.initiateRevenueEstimatorFlow();
    
    expect(mockAuthService.signInWithPopup).toHaveBeenCalled();
  });

  it('should handle redirect authentication flow', async () => {
    mockAuthService.signInWithRedirect.and.returnValue(Promise.resolve());
    
    await service.initiateRevenueEstimatorFlow();
    
    expect(mockAuthService.signInWithRedirect).toHaveBeenCalled();
  });
});
```

### Testing Bootstrap Components

```typescript
describe('Modal Component Integration', () => {
  it('should open Bootstrap modal programmatically', () => {
    openBootstrapModal('revenue-estimator-modal');
    
    expect(isModalOpen('revenue-estimator-modal')).toBe(true);
    expect(document.body.classList.contains('modal-open')).toBe(true);
  });

  it('should handle modal backdrop clicks', () => {
    openBootstrapModal('revenue-estimator-modal');
    spyOn(component, 'onCancel');
    
    const backdrop = document.querySelector('.modal-backdrop');
    backdrop?.dispatchEvent(new Event('click'));
    
    expect(component.onCancel).toHaveBeenCalled();
  });

  it('should clean up modal state on close', () => {
    openBootstrapModal('revenue-estimator-modal');
    closeBootstrapModal('revenue-estimator-modal');
    
    expect(isModalOpen('revenue-estimator-modal')).toBe(false);
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });
});
```

### Testing Step Progress Components

```typescript
describe('StepProgressComponent', () => {
  it('should display correct step states', () => {
    const steps = [
      { id: 'step1', label: 'Step 1', status: 'complete' },
      { id: 'step2', label: 'Step 2', status: 'current' },
      { id: 'step3', label: 'Step 3', status: 'pending' }
    ];
    
    component.steps = steps;
    fixture.detectChanges();
    
    const completeStep = getByTestId(fixture, 'step-step1');
    const currentStep = getByTestId(fixture, 'step-step2');
    const pendingStep = getByTestId(fixture, 'step-step3');
    
    expect(completeStep.classList.contains('complete')).toBe(true);
    expect(currentStep.classList.contains('current')).toBe(true);
    expect(pendingStep.classList.contains('pending')).toBe(true);
  });
});
```

## Troubleshooting & Common Issues

### Common Test Failures

#### Async Operation Timeouts
```typescript
// Problem: Test times out waiting for async operation
it('should load data', async () => {
  // ❌ This might timeout
  await component.loadData();
  
  // ✅ Better approach with explicit waiting
  const loadPromise = component.loadData();
  await fixture.whenStable();
  await loadPromise;
  fixture.detectChanges();
});
```

#### Mock Configuration Issues
```typescript
// Problem: Mock not properly configured
beforeEach(() => {
  // ❌ Mock returns undefined by default
  mockService.getData.and.returnValue(undefined);
  
  // ✅ Provide meaningful return values
  mockService.getData.and.returnValue(of(testData));
  mockService.saveData.and.returnValue(Promise.resolve());
});
```

#### Change Detection Problems
```typescript
// Problem: Template not updated after property change
it('should display updated title', () => {
  component.title = 'New Title';
  // ❌ Missing change detection
  
  // ✅ Trigger change detection
  fixture.detectChanges();
  
  const titleElement = getByTestId(fixture, 'title');
  expect(titleElement.textContent).toContain('New Title');
});
```

### Debugging Strategies

#### Console Logging in Tests
```typescript
it('should process data correctly', () => {
  // Add debug output for complex scenarios
  console.log('Input data:', component.inputData);
  
  const result = component.processData();
  
  console.log('Processing result:', result);
  expect(result).toBeDefined();
});
```

#### Fixture State Inspection
```typescript
it('should render correctly', () => {
  fixture.detectChanges();
  
  // Debug the rendered HTML
  console.log('Rendered HTML:', fixture.nativeElement.innerHTML);
  
  // Debug component state
  console.log('Component state:', {
    isLoading: component.isLoading,
    data: component.data,
    errorMessage: component.errorMessage
  });
});
```

## CI/CD Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Unit Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:ci
      
      - name: Check coverage thresholds
        run: npm run test:coverage-check
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: true
```

### Quality Gates

```javascript
// karma.conf.js - Enforce quality gates
module.exports = function (config) {
  config.set({
    // ... other configuration
    
    coverageReporter: {
      check: {
        global: {
          statements: 80,
          branches: 75,
          functions: 90,
          lines: 80
        }
      },
      // Fail build if coverage is below thresholds
      thresholds: {
        emitWarning: false, // Don't just warn, fail the build
        global: {
          statements: 80,
          lines: 80,
          branches: 75,
          functions: 90
        }
      }
    }
  });
};
```

## Team Workflow Integration

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:affected && npm run lint"
    }
  }
}
```

### Code Review Checklist

#### For Test Authors
- [ ] Tests follow naming conventions
- [ ] All public methods are tested
- [ ] Error scenarios are covered
- [ ] Mocks are properly configured
- [ ] Tests are deterministic (no random data)
- [ ] Async operations are properly handled

#### For Code Reviewers
- [ ] Test descriptions are clear and meaningful
- [ ] Test setup is minimal and focused
- [ ] Assertions are specific and comprehensive
- [ ] No test code duplication
- [ ] Coverage requirements are met
- [ ] Tests actually test the intended behavior

## Maintenance & Evolution

### Updating Test Standards

This document should be updated when:
- New testing patterns emerge in the codebase
- Angular testing best practices evolve
- New testing tools are adopted
- Coverage requirements change
- Team feedback identifies gaps

### Version History

- **v1.0** (Current): Initial testing standards based on Phase 1 infrastructure
- **Future versions**: Will incorporate learnings from Phase 2-4 implementation

### Feedback and Improvements

Team members should contribute to these standards by:
1. Documenting new patterns discovered during testing
2. Sharing solutions to common testing challenges
3. Proposing improvements to testing utilities
4. Updating examples with real-world scenarios

---

## Quick Reference

### Essential Imports
```typescript
// Standard Angular testing
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

// Project testing utilities
import { 
  createComponentWithMocks,
  mockUsers,
  mockChannels,
  MockFirebaseAuth,
  getByTestId,
  clickElement
} from '../testing';

// RxJS testing
import { of, throwError } from 'rxjs';
```

### Common Test Patterns
```typescript
// Component creation with mocks
const { component, fixture, mocks } = createComponentWithMocks(
  MyComponent,
  { ServiceName: ['method1', 'method2'] }
);

// Async testing
await fixture.whenStable();
fixture.detectChanges();

// Event testing
const eventData = await testOutputEvent(fixture, 'eventName', triggerAction);

// Error testing
mockService.method.and.returnValue(throwError('Error message'));
```

### NPM Scripts Reference
```bash
# Development testing
npm run test              # Watch mode
npm run test:coverage     # Generate coverage report

# CI/CD testing  
npm run test:ci           # Single run with coverage
npm run test:coverage-check # Coverage threshold validation

# Utilities
npm run coverage:open     # Open coverage report
npm run coverage:serve    # Serve coverage on localhost
```

---

*This document serves as the definitive guide for testing standards in the SponsPay WebApp project. It should be referenced for all testing activities and updated as the project evolves.*
