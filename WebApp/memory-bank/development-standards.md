# SponsPay WebApp - Development Standards

## Overview
This document defines mandatory development standards that align with our enhanced CI/CD pipeline quality gates. Every new task must meet these requirements to ensure code quality, performance, and reliability.

## Testing Requirements ✅ **MANDATORY FOR ALL NEW TASKS**

### 1. Unit Testing
**Requirement**: Every new component, service, or utility must include comprehensive unit tests.

**Standards**:
- **Coverage Thresholds**: 
  - Statements: 80%+
  - Branches: 75%+
  - Functions: 90%+
  - Lines: 80%+
- **Test Quality**: Tests must cover all public methods, error scenarios, and edge cases
- **Mocking**: External dependencies must be properly mocked
- **Async Testing**: Proper handling of observables and promises

**Pipeline Integration**: `npm run test:coverage` must pass in CI/CD

**Examples**:
```typescript
// Component testing pattern
describe('NewComponent', () => {
  it('should handle error scenarios', () => {
    // Test error handling
  });
  
  it('should cover all public methods', () => {
    // Test all component methods
  });
});

// Service testing pattern
describe('NewService', () => {
  it('should handle API failures gracefully', () => {
    // Test error scenarios
  });
});
```

### 2. Integration Testing
**Requirement**: When creating features that involve multiple components or services, integration tests are required.

**Standards**:
- **Component Interactions**: Test how components communicate
- **Service Integration**: Test service-to-service communication
- **API Integration**: Test frontend-backend integration points
- **Authentication Flows**: Test complete user authentication scenarios

**Pipeline Integration**: `npm run test:integration` must pass in CI/CD

**When Required**:
- New authentication flows
- Multi-component features (like revenue estimator)
- API integration points
- Cross-service communication

### 3. End-to-End (E2E) Testing
**Requirement**: When practical, new user-facing features should include E2E tests.

**Standards**:
- **User Journeys**: Test complete user workflows
- **Cross-Browser**: Tests must work in headless Chrome (CI environment)
- **Responsive**: Test mobile and desktop layouts
- **Performance**: Include basic performance assertions
- **Accessibility**: Basic accessibility checks

**Pipeline Integration**: Cypress tests run in parallel across 5 specs

**Current E2E Coverage**:
- `landing-page.cy.ts` - Landing page functionality
- `auth-flow.cy.ts` - Authentication workflows  
- `responsive.cy.ts` - Responsive design
- `performance-accessibility.cy.ts` - Performance and accessibility
- `revenue-estimator-flow.cy.ts` - Revenue estimator feature

**When Required**:
- New user-facing features
- Authentication changes
- Critical user workflows
- Payment or form submissions

**E2E Test Pattern**:
```typescript
describe('New Feature E2E', () => {
  it('should complete user workflow', () => {
    cy.visit('/');
    cy.get('[data-cy="new-feature-button"]').click();
    cy.get('[data-cy="result"]').should('be.visible');
  });
});
```

## Performance Requirements ⚡ **MANDATORY FOR ALL NEW TASKS**

### Angular Budget Constraints
**Critical**: All development must respect Angular bundle size budgets to ensure optimal performance for African users with slower internet connections.

**Budget Limits** (from angular.json):
- **Initial Bundle**: 1.2MB maximum (warning at 800kB)
- **Component Styles**: 5kB maximum (warning at 3kB)

**Why These Limits Matter**:
- **Target Market**: African users often have slower internet speeds and expensive mobile data
- **Network Constraints**: Limited bandwidth and higher latency in many regions
- **Device Limitations**: Users frequently have older devices with storage/processing constraints
- **Data Costs**: Mobile data is expensive, making users very sensitive to app size

### Performance Guidelines

#### 1. Bundle Size Management
```bash
# Always check bundle size before committing
ng build --configuration=production

# Monitor bundle composition
npm run build:stats
```

#### 2. Component Style Optimization
- **Use Bootstrap Classes**: Prioritize existing Bootstrap components over custom CSS
- **Leverage Theme Variables**: Use global SCSS variables and mixins from `src/theme/`
- **Avoid CSS Duplication**: Check for existing styles before creating new ones
- **Component Style Limit**: Keep individual component SCSS files under 3kB

#### 3. Code Optimization
- **Tree Shaking**: Ensure unused code is eliminated
- **Lazy Loading**: Use lazy loading for heavy features when possible
- **Asset Optimization**: Optimize SVGs and images
- **Import Optimization**: Import only what you need from libraries

### Performance Testing
**Requirement**: New features should include basic performance considerations.

**Standards**:
- **Bundle Size Check**: Verify bundle size doesn't exceed limits
- **Loading Performance**: Test initial load times
- **Runtime Performance**: Monitor for memory leaks or performance degradation
- **Mobile Performance**: Test on slower devices/connections

## Code Quality Requirements 🔍 **MANDATORY FOR ALL NEW TASKS**

### 1. Linting and Type Checking
**Pipeline Integration**: `npm run lint:ci` and `npx tsc --noEmit` must pass

**Standards**:
- **ESLint Rules**: All ESLint rules must pass
- **TypeScript Strict Mode**: No TypeScript errors allowed
- **Code Formatting**: Consistent code formatting
- **Import Organization**: Proper import ordering and organization

### 2. Security Standards
**Pipeline Integration**: `npm audit --audit-level=high` must pass

**Standards**:
- **No High/Critical Vulnerabilities**: Zero tolerance for high or critical security vulnerabilities
- **Dependency Management**: Keep dependencies up to date
- **Input Validation**: Proper validation for all user inputs
- **XSS Prevention**: Use Angular's built-in XSS protection

## Development Workflow 🔄

### 1. Pre-Development Checklist
Before starting any new task:
- [ ] Understand testing requirements for the feature
- [ ] Plan component architecture with performance in mind
- [ ] Identify integration points that need testing
- [ ] Consider E2E test scenarios if user-facing

### 2. During Development
- [ ] Write unit tests alongside code (TDD approach recommended)
- [ ] Monitor bundle size regularly
- [ ] Use existing Bootstrap components and theme variables
- [ ] Test on mobile devices/slower connections

### 3. Pre-Commit Checklist
- [ ] All unit tests pass (`npm run test`)
- [ ] Integration tests pass if applicable (`npm run test:integration`)
- [ ] E2E tests pass if applicable (`npm run e2e`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] Bundle size within limits (`ng build --configuration=production`)
- [ ] No high/critical security vulnerabilities (`npm audit --audit-level=high`)

### 4. Quality Gates
The CI/CD pipeline enforces these quality gates:
1. **Fast Tests**: Unit tests, integration tests, and linting run in parallel
2. **Build**: Application must build successfully
3. **E2E Tests**: All Cypress tests must pass
4. **Security Scan**: No high/critical vulnerabilities allowed
5. **Deployment**: Only occurs if all quality gates pass

## Testing Infrastructure 🧪

### Available Testing Tools
- **Unit Testing**: Jasmine + Karma
- **Integration Testing**: Custom integration test suite
- **E2E Testing**: Cypress with parallel execution
- **Coverage**: Istanbul with threshold enforcement
- **Performance**: Bundle analyzer and performance scripts

### Testing Utilities
- **Mocks**: Comprehensive service mocks in `src/testing/mocks/`
- **Fixtures**: Test data in `src/testing/fixtures/`
- **Helpers**: Integration test helpers in `src/app/testing/`

### Coverage Exclusions
The following are excluded from coverage measurement:
- `src/testing/**/*` (testing infrastructure)
- `src/app/testing/**/*` (integration helpers)
- `src/environments/environment*.ts` (Firebase config)
- `src/app/app.config.ts` (Firebase initialization)

## Performance Monitoring 📊

### Bundle Analysis
```bash
# Generate bundle stats
npm run build:stats

# Analyze bundle composition
npm run analyze
```

### Performance Scripts
- `scripts/test-performance.js` - Performance testing utilities
- `scripts/check-coverage.js` - Coverage validation
- `scripts/parallel-test.js` - Parallel test execution

## Best Practices Summary 📋

### For Every New Task:
1. **Plan Testing Strategy**: Identify unit, integration, and E2E test requirements
2. **Design for Performance**: Consider bundle size and mobile users from the start
3. **Use Existing Patterns**: Leverage established components and styles
4. **Test Early and Often**: Write tests alongside code, not after
5. **Monitor Quality Gates**: Ensure all pipeline checks pass before submission

### Performance-First Development:
1. **Bootstrap Over Custom CSS**: Use existing Bootstrap components
2. **Theme Variables**: Leverage global SCSS variables and mixins
3. **Bundle Awareness**: Regularly check bundle size during development
4. **Mobile Testing**: Test on slower devices and connections
5. **Lazy Loading**: Consider lazy loading for heavy features

### Quality Assurance:
1. **Comprehensive Testing**: Unit + Integration + E2E when applicable
2. **Security Awareness**: Regular dependency audits
3. **Type Safety**: Strict TypeScript usage
4. **Code Standards**: Consistent linting and formatting
5. **Documentation**: Update memory bank with new patterns and learnings

## Enforcement 🚨

These standards are enforced by:
- **CI/CD Pipeline**: Automated quality gates prevent deployment of non-compliant code
- **Bundle Size Limits**: Build fails if bundle exceeds 1.2MB
- **Test Coverage**: Build fails if coverage drops below thresholds
- **Security Scans**: Build fails if high/critical vulnerabilities found
- **Code Quality**: Build fails if linting or TypeScript errors exist

**Remember**: These standards exist to ensure our application performs well for users in Africa with slower internet connections and limited data plans. Every optimization and test contributes to a better user experience.
