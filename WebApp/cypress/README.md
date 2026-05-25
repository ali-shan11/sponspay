# Cypress E2E Testing for SponsPay WebApp

This directory contains comprehensive end-to-end (E2E) tests for the SponsPay WebApp using Cypress.

## Overview

Our E2E testing suite covers:
- **Landing Page User Journey** - Complete user flow from landing to contact
- **Authentication Flow** - Google OAuth and revenue estimator authentication
- **Responsive Design** - Cross-device compatibility testing
- **Performance & Accessibility** - Performance metrics and accessibility compliance

## Test Structure

```
cypress/
├── e2e/                          # Test specifications
│   ├── landing-page.cy.ts        # Landing page user journey tests
│   ├── auth-flow.cy.ts           # Authentication and revenue estimator tests
│   ├── responsive.cy.ts          # Responsive design tests
│   └── performance-accessibility.cy.ts # Performance and accessibility tests
├── support/                      # Support files and custom commands
│   ├── commands.ts               # Custom Cypress commands
│   └── e2e.ts                   # Global configuration and imports
├── cypress.config.ts            # Cypress configuration
└── README.md                    # This file
```

## Custom Commands

We've created several custom commands to streamline testing:

### `cy.dataCy(selector)`
Select elements by `data-cy` attribute for more reliable element selection.
```typescript
cy.dataCy('submit-button').click();
```

### `cy.mockGoogleAuth()`
Mock Google authentication for testing authenticated flows.
```typescript
cy.mockGoogleAuth();
cy.dataCy('revenue-estimator-button').click();
```

### `cy.waitForAngular()`
Wait for Angular application to be ready and stable.
```typescript
cy.visit('/');
cy.waitForAngular();
```

### `cy.fillContactForm(name, email, message)`
Fill and submit the contact form with provided data.
```typescript
cy.fillContactForm('John Doe', 'john@example.com', 'Test message');
```

### `cy.checkResponsive(device)`
Test responsive behavior for different device types.
```typescript
cy.checkResponsive('mobile');
cy.checkResponsive('tablet');
cy.checkResponsive('desktop');
```

### `cy.checkA11y()`
Perform basic accessibility checks.
```typescript
cy.checkA11y();
```

### `cy.mockApiResponse(endpoint, response)`
Mock API responses for testing error handling and success scenarios.
```typescript
cy.mockApiResponse('/api/contact', { success: true });
```

## Running Tests

### Development
```bash
# Open Cypress Test Runner (interactive)
npm run cypress:open

# Run all tests headlessly
npm run cypress:run

# Run tests with specific browser
npm run cypress:run:chrome
npm run cypress:run:firefox
npm run cypress:run:edge
```

### Specific Test Suites
```bash
# Landing page tests
npm run cypress:test:landing

# Authentication flow tests
npm run cypress:test:auth

# Performance and accessibility tests
npm run cypress:test:performance

# Responsive design tests (all viewports)
npm run cypress:test:responsive
```

### Device-Specific Testing
```bash
# Mobile viewport (375x667)
npm run cypress:test:mobile

# Tablet viewport (768x1024)
npm run cypress:test:tablet

# Desktop viewport (1280x720)
npm run cypress:test:desktop
```

### CI/CD
```bash
# Headless run for CI/CD pipelines
npm run cypress:test:ci
```

## Test Categories

### 1. Landing Page Tests (`landing-page.cy.ts`)

**Page Load and Basic Elements**
- Verifies page loads successfully
- Checks hero section content and layout
- Validates navigation menu functionality

**Navigation Flow**
- Tests navigation from hero to contact form
- Validates FAQ modal opening and closing
- Ensures smooth scrolling and anchor navigation

**Contact Form Interaction**
- Form field validation (required fields, email format)
- Successful form submission with API mocking
- Error handling for API failures

**FAQ Modal Functionality**
- Modal opening/closing behavior
- FAQ item expansion/collapse
- Keyboard and mouse interaction

**Accessibility Checks**
- Heading hierarchy validation
- Keyboard navigation support
- Image alt text verification

### 2. Authentication Flow Tests (`auth-flow.cy.ts`)

**Revenue Estimator Authentication**
- Google sign-in flow simulation
- Authentication error handling
- User session persistence

**Revenue Estimator Modal Flow**
- Step progress indicator functionality
- Channel selection for multiple channels
- Analytics loading states
- Revenue calculation display
- Different subscriber scenarios

**Mock Data Controls**
- Development mode mock controls
- Slider interactions for testing scenarios
- Scenario cycling and validation

**Error Handling**
- Network error scenarios
- YouTube API quota exceeded
- Insufficient permissions handling

### 3. Responsive Design Tests (`responsive.cy.ts`)

**Multi-Device Testing**
- iPhone SE (375x667) - Mobile
- iPad (768x1024) - Tablet  
- Desktop (1280x720) - Desktop

**Navigation Behavior**
- Mobile hamburger menu functionality
- Desktop navigation menu
- Touch target sizing validation

**Layout Validation**
- Hero section responsive layout
- Feature cards stacking/alignment
- Contact form responsive behavior
- Modal sizing across devices

**Touch and Interaction**
- Touch target minimum sizes (44x44px)
- Swipe gestures on mobile
- Keyboard navigation consistency

### 4. Performance & Accessibility Tests (`performance-accessibility.cy.ts`)

**Performance Metrics**
- Page load time validation (< 3 seconds)
- Image optimization checks
- Layout shift minimization
- Bundle size validation
- Resource loading efficiency

**Accessibility Compliance**
- WCAG heading hierarchy
- Form label associations
- Button accessibility
- Link accessibility
- Image alt text quality
- Color contrast validation
- Keyboard navigation
- ARIA attributes
- Focus management

**SEO & Meta Tags**
- Essential meta tags validation
- Open Graph tags
- Structured data (JSON-LD)
- Canonical URLs

**Security**
- Security headers validation
- HTTPS enforcement in production

## Data Attributes for Testing

To ensure reliable element selection, use `data-cy` attributes in components:

```html
<!-- Navigation -->
<nav data-cy="header">
  <a data-cy="nav-home">Home</a>
  <a data-cy="nav-faq">FAQ</a>
  <a data-cy="nav-contact">Contact</a>
</nav>

<!-- Hero Section -->
<section data-cy="hero-section">
  <button data-cy="revenue-estimator-button">Get Started</button>
</section>

<!-- Contact Form -->
<form data-cy="contact-form">
  <input data-cy="contact-name" />
  <input data-cy="contact-email" />
  <textarea data-cy="contact-message"></textarea>
  <button data-cy="contact-submit">Submit</button>
</form>

<!-- Modals -->
<div data-cy="faq-modal">
  <button data-cy="faq-close">×</button>
  <div data-cy="faq-item">...</div>
</div>

<!-- Mobile Navigation -->
<button data-cy="mobile-menu-button">☰</button>
<nav data-cy="mobile-sidenav">
  <button data-cy="mobile-menu-close">×</button>
  <a data-cy="mobile-nav-home">Home</a>
  <a data-cy="mobile-nav-faq">FAQ</a>
  <a data-cy="mobile-nav-contact">Contact</a>
</nav>
```

## Configuration

### Cypress Configuration (`cypress.config.ts`)

Key configuration settings:
- **Base URL**: `http://localhost:4200`
- **Default viewport**: 1280x720
- **Timeouts**: 10 seconds for commands, requests, and responses
- **Retries**: 2 retries in run mode, 0 in open mode
- **Video recording**: Enabled
- **Screenshots**: On failure

### Environment Variables

Set in `cypress.config.ts` under `env`:
- `apiUrl`: API endpoint for mocking
- `coverage`: Enable/disable coverage collection

## Best Practices

### 1. Element Selection
- Always use `data-cy` attributes for test element selection
- Avoid selecting by CSS classes or IDs that may change
- Use semantic selectors when `data-cy` is not available

### 2. Test Independence
- Each test should be independent and not rely on previous test state
- Use `beforeEach` hooks to set up consistent test state
- Clean up after tests when necessary

### 3. Waiting and Timing
- Use `cy.waitForAngular()` after page navigation
- Prefer explicit waits over arbitrary `cy.wait(ms)`
- Use `cy.intercept()` to wait for specific API calls

### 4. Mocking and Stubbing
- Mock external services (Google Auth, APIs) for consistent testing
- Use realistic mock data that represents actual use cases
- Test both success and error scenarios

### 5. Accessibility Testing
- Include accessibility checks in all test suites
- Test keyboard navigation paths
- Verify ARIA attributes and semantic HTML

### 6. Responsive Testing
- Test critical user flows on all supported device sizes
- Verify touch targets meet minimum size requirements
- Ensure content is readable and accessible on all devices

## Debugging

### Debug Mode
```bash
# Run with debug information
npm run test:debug
```

### Browser DevTools
- Use `cy.debug()` to pause execution and inspect state
- Use `cy.pause()` to pause test execution
- Open browser DevTools during test execution

### Screenshots and Videos
- Screenshots are automatically taken on test failures
- Videos are recorded for all test runs
- Files are saved in `cypress/screenshots/` and `cypress/videos/`

## CI/CD Integration

For continuous integration, use:
```bash
npm run cypress:test:ci
```

This command:
- Runs tests headlessly
- Uses Chrome browser
- Disables video recording for faster execution
- Provides detailed test results for CI systems

## Maintenance

### Regular Updates
- Update test data attributes when UI changes
- Review and update mock data to match API changes
- Add new tests for new features and user flows
- Update accessibility checks as standards evolve

### Performance Monitoring
- Monitor test execution times
- Update performance thresholds as application grows
- Review and optimize slow-running tests

### Coverage Analysis
- Ensure critical user paths are covered
- Add tests for edge cases and error scenarios
- Review test coverage reports regularly
