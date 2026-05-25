import { setupOnboardingIntercepts } from '../../support/onboarding-helpers';

describe('Onboarding Step 4: Terms & Conditions', () => {
  beforeEach(() => {
    setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-creator-coadmin-no-terms.json' });
    cy.visitOnboardingAs('onboarding/sign-in-creator-coadmin-no-terms.json');
    cy.get('[data-cy="step-terms"]').should('exist');
  });

  it('loads and displays terms HTML', () => {
    cy.wait('@termsLatest');
    cy.get('[data-cy="terms-content"]').should('exist');
    cy.get('[data-cy="terms-content"]').should('contain.html', 'Terms and Conditions');
  });

  it('terms load failure is handled gracefully', () => {
    cy.intercept('GET', '**/terms/latest', { statusCode: 500 }).as('termsError');
    setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-creator-coadmin-no-terms.json' });
    cy.visitOnboardingAs('onboarding/sign-in-creator-coadmin-no-terms.json');
    // Should not crash — page still renders
    cy.get('[data-cy="step-terms"]').should('exist');
  });

  describe('Mistake: trying to continue without accepting', () => {
    it('Continue is disabled when checkbox is unchecked', () => {
      cy.get('[data-cy="terms-checkbox"]').should('not.be.checked');
      cy.get('[data-cy="step-continue"]').find('button').should('be.disabled');
    });
  });

  describe('Checkbox toggle', () => {
    it('checking checkbox enables Continue', () => {
      cy.get('[data-cy="terms-checkbox"]').check();
      cy.get('[data-cy="step-continue"]').find('button').should('not.be.disabled');
    });

    it('unchecking checkbox disables Continue again', () => {
      cy.get('[data-cy="terms-checkbox"]').check();
      cy.get('[data-cy="step-continue"]').find('button').should('not.be.disabled');
      cy.get('[data-cy="terms-checkbox"]').uncheck();
      cy.get('[data-cy="step-continue"]').find('button').should('be.disabled');
    });
  });

  describe('Accept terms and advance', () => {
    it('accepting terms advances to Welcome step', () => {
      cy.get('[data-cy="terms-checkbox"]').check();
      cy.get('[data-cy="step-continue"]').find('button').click();
      cy.wait('@acceptTerms');
      cy.get('[data-cy="step-welcome"]').should('exist');
      cy.contains('Welcome to SponsPay').should('be.visible');
    });

    it('accept terms API failure stays on terms step', () => {
      cy.intercept('POST', '**/creator/accept-terms', { statusCode: 500 }).as('acceptTermsError');
      cy.get('[data-cy="terms-checkbox"]').check();
      cy.get('[data-cy="step-continue"]').find('button').click();
      cy.wait('@acceptTermsError');
      // Should still be on terms step
      cy.get('[data-cy="step-terms"]').should('exist');
    });
  });

  describe('Navigation', () => {
    it('has no Back button on terms step', () => {
      cy.get('[data-cy="step-back"]').should('not.exist');
    });
  });
});

describe('Onboarding Step 5: Welcome', () => {
  beforeEach(() => {
    // Get to Welcome step by accepting terms
    setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-creator-coadmin-no-terms.json' });
    cy.visitOnboardingAs('onboarding/sign-in-creator-coadmin-no-terms.json');
    cy.get('[data-cy="step-terms"]').should('exist');
    cy.get('[data-cy="terms-checkbox"]').check();
    cy.get('[data-cy="step-continue"]').find('button').click();
    cy.wait('@acceptTerms');
    cy.get('[data-cy="step-welcome"]').should('exist');
  });

  it('shows welcome message', () => {
    cy.contains('Welcome to SponsPay').should('be.visible');
    cy.contains('Your account is all set up').should('be.visible');
  });

  // Social media links are currently commented out in the welcome component
  // Re-enable this test when they are added back
  // it('shows social media links', () => {
  //   cy.get('img[alt="youtube"]').should('exist');
  //   cy.get('img[alt="twitter"]').should('exist');
  //   cy.get('img[alt="facebook"]').should('exist');
  //   cy.get('img[alt="linkedin"]').should('exist');
  // });

  it('Go to Dashboard navigates to /dashboard', () => {
    cy.get('[data-cy="go-to-dashboard"]').find('button').click();
    cy.url().should('include', '/dashboard');
  });

  it('has no Back button on welcome step', () => {
    cy.get('[data-cy="step-back"]').should('not.exist');
  });
});
