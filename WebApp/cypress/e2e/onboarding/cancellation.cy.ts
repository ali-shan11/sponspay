import { setupOnboardingIntercepts } from '../../support/onboarding-helpers';

describe('Cancellation Flow', () => {
  beforeEach(() => {
    setupOnboardingIntercepts();
    cy.visitWithAuth('/cancellation', 'onboarding/sign-in-youtube-connected.json');
  });

  it('shows cancellation confirmation page', () => {
    cy.contains('Are you sure you want to cancel?').should('be.visible');
  });

  it('shows reason textarea', () => {
    cy.get('[data-cy="cancel-reason"]').scrollIntoView().should('be.visible');
  });

  it('shows keep-me-updated checkbox', () => {
    cy.get('[data-cy="keep-updated-checkbox"]').should('exist');
  });

  describe('Mistake: empty or whitespace-only reason', () => {
    it('Continue is disabled when reason is empty', () => {
      cy.get('[data-cy="cancel-continue-btn"]').find('button').should('be.disabled');
    });

    it('Continue is disabled when reason is whitespace only', () => {
      cy.get('[data-cy="cancel-reason"]').type('   ');
      cy.get('[data-cy="cancel-continue-btn"]').find('button').should('be.disabled');
    });
  });

  describe('Submit cancellation', () => {
    it('typing a reason enables Continue', () => {
      cy.get('[data-cy="cancel-reason"]').type('Not ready yet');
      cy.get('[data-cy="cancel-continue-btn"]').find('button').should('not.be.disabled');
    });

    it('submitting cancellation shows thank you screen', () => {
      cy.get('[data-cy="cancel-reason"]').type('Not ready yet');
      cy.get('[data-cy="cancel-continue-btn"]').find('button').click();
      cy.wait('@cancelOnboarding');
      cy.contains('Thank you for using Sponspay').should('be.visible');
    });

    it('submitting with keep-me-updated checked', () => {
      cy.get('[data-cy="keep-updated-checkbox"]').check();
      cy.get('[data-cy="cancel-reason"]').type('Maybe later');
      cy.get('[data-cy="cancel-continue-btn"]').find('button').click();
      cy.wait('@cancelOnboarding');
      cy.contains('Thank you for using Sponspay').should('be.visible');
    });
  });

  describe('Thank you screen', () => {
    beforeEach(() => {
      cy.get('[data-cy="cancel-reason"]').type('Not ready yet');
      cy.get('[data-cy="cancel-continue-btn"]').find('button').click();
      cy.wait('@cancelOnboarding');
    });

    it('shows social media links', () => {
      cy.get('img[alt="youtube"]').should('exist');
      cy.get('img[alt="twitter"]').should('exist');
    });

    it('auto sign-out after 2 seconds redirects to home', () => {
      // The component uses setTimeout(2000) to call signOut which navigates to '/'
      // Wait for the redirect to happen naturally
      cy.url({ timeout: 5000 }).should('eq', Cypress.config('baseUrl') + '/');
    });
  });

  describe('Navigation', () => {
    it('"No, go back" returns to onboarding', () => {
      cy.get('[data-cy="cancel-back-btn"]').find('button').click();
      cy.url().should('include', '/onboarding');
    });
  });
});

describe('Cancel from Estimator step', () => {
  it('Cancel button on estimator navigates to cancellation', () => {
    setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-youtube-connected.json' });
    cy.visitOnboardingAs('onboarding/sign-in-youtube-connected.json');
    cy.get('[data-cy="step-estimator"]').should('exist');
    cy.get('[data-cy="step-cancel"]').find('button').click();
    cy.url().should('include', '/cancellation');
  });
});
