import { setupOnboardingIntercepts } from '../../support/onboarding-helpers';

describe('Onboarding Step 0: Get Started', () => {
  beforeEach(() => {
    setupOnboardingIntercepts();
  });

  it('shows the Get Started screen when visiting /onboarding without auth', () => {
    cy.visit('/onboarding');
    cy.get('[data-cy="step-get-started"]').should('exist');
    cy.contains('Let\'s get you onboarded').should('be.visible');
    cy.get('[data-cy="google-login-btn"]').scrollIntoView().should('be.visible');
  });

  it('does not show the step tracker at step 0', () => {
    cy.visit('/onboarding');
    cy.get('[data-cy="step-get-started"]').should('exist');
    cy.get('app-step-tracker').should('not.exist');
  });

  describe('Auth bypass → step routing', () => {
    it('new user (no YouTube) lands on YouTube Channel step', () => {
      setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-new-user.json' });
      cy.visitOnboardingAs('onboarding/sign-in-new-user.json');
      cy.get('[data-cy="step-youtube"]').should('exist');
      cy.contains('Connect Your YouTube Channel').should('be.visible');
    });

    it('user with YouTube connected lands on Estimator step', () => {
      setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-youtube-connected.json' });
      cy.visitOnboardingAs('onboarding/sign-in-youtube-connected.json');
      cy.get('[data-cy="step-estimator"]').should('exist');
    });

    it('creator not yet co-admin lands on Integration step 2', () => {
      setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-creator-not-coadmin.json' });
      cy.visitOnboardingAs('onboarding/sign-in-creator-not-coadmin.json');
      cy.get('[data-cy="step-integration"]').should('exist');
      cy.contains('Join Your Channel').should('be.visible');
    });

    it('creator with co-admin but no terms lands on Terms step', () => {
      setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-creator-coadmin-no-terms.json' });
      cy.visitOnboardingAs('onboarding/sign-in-creator-coadmin-no-terms.json');
      cy.get('[data-cy="step-terms"]').should('exist');
      cy.contains('Terms & Conditions').should('be.visible');
    });

    it('fully onboarded user redirects to dashboard', () => {
      setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-fully-onboarded.json' });
      cy.visitOnboardingAs('onboarding/sign-in-fully-onboarded.json');
      cy.url().should('include', '/dashboard');
    });
  });
});
