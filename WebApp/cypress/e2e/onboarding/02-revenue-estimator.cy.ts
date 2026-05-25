import { setupOnboardingIntercepts } from '../../support/onboarding-helpers';

describe('Onboarding Step 2: Revenue Estimator', () => {
  beforeEach(() => {
    setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-youtube-connected.json' });
    cy.visitOnboardingAs('onboarding/sign-in-youtube-connected.json');
    cy.get('[data-cy="step-estimator"]').should('exist');
  });

  describe('Qualified with viewers in supported countries', () => {
    it('shows qualified message with revenue increase', () => {
      cy.get('[data-cy="estimator-qualified"]').should('be.visible');
      cy.contains('you qualify to work with SponsPay').should('be.visible');
    });

    it('displays channel info card', () => {
      cy.contains('Test Creator Channel').should('be.visible');
    });

    it('Continue button is enabled', () => {
      cy.get('[data-cy="step-continue"]').find('button').should('not.be.disabled');
    });
  });

  describe('Qualified but no viewers in supported countries', () => {
    beforeEach(() => {
      setupOnboardingIntercepts({
        signIn: 'onboarding/sign-in-youtube-connected.json',
        analytics: 'onboarding/analytics-no-viewers.json'
      });
      cy.visitOnboardingAs('onboarding/sign-in-youtube-connected.json');
      cy.get('[data-cy="step-estimator"]').should('exist');
    });

    it('shows no-viewers message', () => {
      cy.get('[data-cy="estimator-no-viewers"]').should('be.visible');
      cy.contains('no viewers in countries').should('be.visible');
    });

    it('Continue button is still enabled', () => {
      cy.get('[data-cy="step-continue"]').find('button').should('not.be.disabled');
    });
  });

  describe('Mistake: channel has too few subscribers', () => {
    beforeEach(() => {
      setupOnboardingIntercepts({
        signIn: 'onboarding/sign-in-youtube-connected.json',
        channelData: 'onboarding/channel-data-low-subs.json'
      });
      cy.visitOnboardingAs('onboarding/sign-in-youtube-connected.json');
      cy.get('[data-cy="step-estimator"]').should('exist');
    });

    it('shows not-qualified message', () => {
      cy.get('[data-cy="estimator-not-qualified"]').should('be.visible');
      cy.contains("don't yet have the minimum required").should('be.visible');
    });
  });

  describe('Multiple channels', () => {
    beforeEach(() => {
      setupOnboardingIntercepts({
        signIn: 'onboarding/sign-in-youtube-connected.json',
        channelData: 'onboarding/channel-data-multiple.json'
      });
      cy.visitOnboardingAs('onboarding/sign-in-youtube-connected.json');
      cy.get('[data-cy="step-estimator"]').should('exist');
    });

    it('displays channel selection when multiple channels exist', () => {
      cy.contains('Main Creator Channel').should('be.visible');
    });
  });

  describe('API failures', () => {
    it('handles countries API failure gracefully (uses fallback)', () => {
      cy.intercept('GET', '**/accounts/countries', { statusCode: 500 }).as('countriesError');
      setupOnboardingIntercepts({
        signIn: 'onboarding/sign-in-youtube-connected.json'
      });
      cy.visitOnboardingAs('onboarding/sign-in-youtube-connected.json');
      // Should still render the estimator (uses fallback country list)
      cy.get('[data-cy="step-estimator"]').should('exist');
    });

    it('handles analytics API failure', () => {
      cy.intercept('GET', '**/creator/youtube/analytics-report*', { statusCode: 500 }).as('analyticsError');
      setupOnboardingIntercepts({
        signIn: 'onboarding/sign-in-youtube-connected.json'
      });
      cy.visitOnboardingAs('onboarding/sign-in-youtube-connected.json');
      cy.get('[data-cy="step-estimator"]').should('exist');
    });
  });

  describe('See Detail button', () => {
    it('clicking See Detail shows potential earning details', () => {
      cy.get('[data-cy="see-detail-btn"]').should('be.visible');
      cy.get('[data-cy="see-detail-btn"]').click();
      cy.get('app-potential-earning').should('exist');
    });
  });

  describe('Navigation', () => {
    it('Back button disconnects YouTube and goes to step 1', () => {
      cy.get('[data-cy="step-back"]').find('button').click();
      cy.wait('@youtubeDisconnect');
      cy.get('[data-cy="step-youtube"]').should('exist');
    });

    it('Cancel button navigates to cancellation page', () => {
      cy.get('[data-cy="step-cancel"]').find('button').click();
      cy.url().should('include', '/cancellation');
    });

    it('Continue advances to Integration step', () => {
      cy.get('[data-cy="step-continue"]').find('button').click();
      cy.get('[data-cy="step-integration"]').should('exist');
    });
  });
});
