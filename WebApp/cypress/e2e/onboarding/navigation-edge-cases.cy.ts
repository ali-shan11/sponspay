import { setupOnboardingIntercepts } from '../../support/onboarding-helpers';

describe('Navigation Edge Cases', () => {
  beforeEach(() => {
    setupOnboardingIntercepts();
  });

  describe('Direct URL access', () => {
    it('visiting /onboarding without auth lands on step 0', () => {
      cy.visit('/onboarding');
      cy.get('[data-cy="step-get-started"]').should('exist');
      cy.contains('Let\'s get you onboarded').should('be.visible');
    });

    it('visiting /cancellation directly loads cancellation page', () => {
      cy.visit('/cancellation');
      cy.contains('Are you sure you want to cancel?').should('be.visible');
    });
  });

  describe('Browser refresh mid-flow', () => {
    it('refreshing at step 2 re-evaluates user state', () => {
      setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-youtube-connected.json' });
      cy.visitOnboardingAs('onboarding/sign-in-youtube-connected.json');
      cy.get('[data-cy="step-estimator"]').should('exist');

      // Refresh the page — auth bypass is set per-visit, so re-visit
      cy.visitOnboardingAs('onboarding/sign-in-youtube-connected.json');
      cy.get('[data-cy="step-estimator"]').should('exist');
    });
  });

  describe('OAuth callback query params', () => {
    it('youtube_connected=true shows success alert', () => {
      cy.visit('/onboarding?youtube_connected=true');
      cy.contains('YouTube Connected').should('be.visible');
    });

    it('youtube_error=no_channel shows error alert', () => {
      cy.visit('/onboarding?youtube_error=no_channel');
      cy.contains('No YouTube Channel').should('be.visible');
    });

    it('youtube_error=denied shows info alert', () => {
      cy.visit('/onboarding?youtube_error=denied');
      cy.contains('Connection Cancelled').should('be.visible');
    });
  });

  describe('Step routing consistency', () => {
    it('creator with all steps complete always redirects to dashboard', () => {
      setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-fully-onboarded.json' });
      cy.visitOnboardingAs('onboarding/sign-in-fully-onboarded.json');
      cy.url().should('include', '/dashboard');
    });

    it('creator with co-admin but no terms always lands on terms', () => {
      setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-creator-coadmin-no-terms.json' });
      cy.visitOnboardingAs('onboarding/sign-in-creator-coadmin-no-terms.json');
      cy.get('[data-cy="step-terms"]').should('exist');
    });
  });
});
