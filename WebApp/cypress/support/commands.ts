// ***********************************************
// Custom Commands for SponsPay WebApp E2E Testing
// ***********************************************

/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to select DOM element by data-cy attribute.
     * @example cy.dataCy('submit-button')
     */
    dataCy(value: string): Chainable<JQuery<HTMLElement>>;

    /**
     * Custom command to wait for Angular to be ready
     * @example cy.waitForAngular()
     */
    waitForAngular(): Chainable<void>;

    /**
     * Custom command to fill and submit contact form
     * @example cy.fillContactForm('John Doe', 'john@example.com', 'Test message')
     */
    fillContactForm(name: string, email: string, message: string): Chainable<void>;

    /**
     * Custom command to check responsive behavior
     * @example cy.checkResponsive('mobile')
     */
    checkResponsive(device: 'mobile' | 'tablet' | 'desktop'): Chainable<void>;

    /**
     * Custom command to verify accessibility
     * @example cy.checkA11y()
     */
    checkA11y(): Chainable<void>;

    /**
     * Custom command to mock API responses
     * @example cy.mockApiResponse('/api/contact', { success: true })
     */
    mockApiResponse(endpoint: string, response: any): Chainable<void>;

    /**
     * Visit /onboarding with auth bypass injected.
     * Sets __CYPRESS_AUTH_BYPASS__ on the window before the app loads.
     * @example cy.visitOnboardingAs('onboarding/sign-in-new-user.json')
     */
    visitOnboardingAs(signInFixture: string): Chainable<void>;

    /**
     * Visit any path with auth bypass injected.
     * Sets __CYPRESS_AUTH_BYPASS__ on the window before the app loads.
     * @example cy.visitWithAuth('/cancellation', 'onboarding/sign-in-youtube-connected.json')
     */
    visitWithAuth(path: string, signInFixture: string): Chainable<void>;

    /**
     * Simulate YouTube OAuth result via postMessage.
     * The YouTubeOAuthService listens for messages with type 'youtube-oauth-result'.
     * @example cy.simulateYouTubeOAuth(true)
     * @example cy.simulateYouTubeOAuth(false, 'denied')
     */
    simulateYouTubeOAuth(success: boolean, error?: 'denied' | 'failed' | 'no_channel'): Chainable<void>;

    /**
     * Trigger co-admin promotion by changing the polling intercept to return success.
     * @example cy.triggerCoAdminPromotion()
     */
    triggerCoAdminPromotion(): Chainable<void>;
  }
}

// Custom command to select elements by data-cy attribute
Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy=${value}]`);
});

// Custom command to wait for Angular to be ready
Cypress.Commands.add('waitForAngular', () => {
  cy.window().then((win) => {
    return new Cypress.Promise((resolve) => {
      // Wait for Angular to be defined and stable
      const checkAngular = () => {
        if ((win as any).ng && (win as any).ng.getComponent) {
          // Angular is ready
          resolve();
        } else {
          setTimeout(checkAngular, 100);
        }
      };
      checkAngular();
    });
  });
});

// Custom command to fill and submit contact form
Cypress.Commands.add('fillContactForm', (name: string, email: string, message: string) => {
  const [firstName, lastName] = name.split(' ');
  cy.get('[data-cy=contact-first-name]').clear().type(firstName);
  cy.get('[data-cy=contact-last-name]').clear().type(lastName || 'User');
  cy.get('[data-cy=contact-email]').clear().type(email);
  cy.get('[data-cy=contact-interest]').select('creator');
  cy.get('[data-cy=contact-message]').clear().type(message);
  cy.get('[data-cy=contact-submit]').click();
});

// Custom command to check responsive behavior
Cypress.Commands.add('checkResponsive', (device: 'mobile' | 'tablet' | 'desktop') => {
  const viewports = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 }
  };

  const viewport = viewports[device];
  cy.viewport(viewport.width, viewport.height);

  // Check device-specific elements
  if (device === 'mobile') {
    cy.get('[data-cy=mobile-menu-button]').should('be.visible');
    cy.get('[data-cy=desktop-menu]').should('not.be.visible');
  } else {
    cy.get('[data-cy=desktop-menu]').should('be.visible');
    cy.get('[data-cy=mobile-menu-button]').should('not.be.visible');
  }
});

// Custom command for basic accessibility checks
Cypress.Commands.add('checkA11y', () => {
  // Check for basic accessibility requirements
  cy.get('img').each(($img) => {
    cy.wrap($img).should('have.attr', 'alt');
  });

  // Check that visible interactive elements exist (but allow disabled state for form validation)
  cy.get('button:visible, a:visible').should('have.length.greaterThan', 0);

  // Check for proper heading hierarchy
  cy.get('h1').should('exist');
});

// Custom command to mock API responses
Cypress.Commands.add('mockApiResponse', (endpoint: string, response: any) => {
  cy.intercept('POST', `**${endpoint}`, {
    statusCode: 200,
    body: response
  }).as('apiCall');
});

/**
 * Visit /onboarding with auth bypass injected.
 * Sets __CYPRESS_AUTH_BYPASS__ on the window before the app loads.
 */
Cypress.Commands.add('visitOnboardingAs', (signInFixture: string) => {
  // JWT with exp=9999999999 (year 2286) so TokenService.isTokenValid() passes
  const mockJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVpZC0xMjMiLCJleHAiOjk5OTk5OTk5OTl9.mock';

  cy.fixture(signInFixture).then((signInResponse) => {
    cy.visit('/onboarding', {
      onBeforeLoad(win) {
        (win as any).__CYPRESS_AUTH_BYPASS__ = {
          signInResponse,
          accessToken: mockJwt
        };
      }
    });
  });
});

/**
 * Visit any path with auth bypass injected (skips onboarding navigation).
 * Sets __CYPRESS_AUTH_BYPASS__ with skipNavigation=true so the app stays on the visited path.
 */
Cypress.Commands.add('visitWithAuth', (path: string, signInFixture: string) => {
  const mockJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVpZC0xMjMiLCJleHAiOjk5OTk5OTk5OTl9.mock';

  cy.fixture(signInFixture).then((signInResponse) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        (win as any).__CYPRESS_AUTH_BYPASS__ = {
          signInResponse,
          accessToken: mockJwt,
          skipNavigation: true
        };
      }
    });
  });
});

/**
 * Simulate YouTube OAuth result via postMessage.
 * The YouTubeOAuthService listens for messages with type 'youtube-oauth-result'.
 */
Cypress.Commands.add('simulateYouTubeOAuth', (success: boolean, error?: 'denied' | 'failed' | 'no_channel') => {
  cy.window().then((win) => {
    win.postMessage({
      type: 'youtube-oauth-result',
      success,
      error: error || null
    }, win.location.origin);
  });
});

/**
 * Trigger co-admin promotion by changing the polling intercept to return success.
 */
Cypress.Commands.add('triggerCoAdminPromotion', () => {
  cy.intercept('GET', '**/telegram/co-admin-status', {
    fixture: 'onboarding/co-admin-status-added.json'
  }).as('coAdminStatusPromoted');
});

// Prevent Cypress from failing on uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignore specific errors that don't affect functionality
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }
  if (err.message.includes('Firebase')) {
    return false;
  }
  return true;
});
