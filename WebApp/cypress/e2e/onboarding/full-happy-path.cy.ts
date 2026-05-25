import { setupOnboardingIntercepts } from '../../support/onboarding-helpers';

/**
 * Full end-to-end happy path test. Uses {force: true} for button clicks because
 * the onboarding layout uses a fixed header (z-index: 1050, 80px) with a custom
 * scroll container (.onboarding-content-wrapper, overflow-y: auto). On CI's smaller
 * viewport (1280x633), buttons near the bottom of steps can be partially obscured
 * by the fixed header after Cypress scrolls them into view. Individual step tests
 * in other spec files validate proper button visibility and interactivity.
 */
describe('Full Onboarding Happy Path', () => {
  it('completes the entire onboarding flow from step 0 to dashboard', () => {
    setupOnboardingIntercepts({
      signIn: 'onboarding/sign-in-new-user.json',
      channelInvite: 'onboarding/channel-invite-already-promoted.json'
    });

    // Step 0: Get Started — bypass auth to land on YouTube step
    cy.visitOnboardingAs('onboarding/sign-in-new-user.json');
    cy.get('[data-cy="step-youtube"]').should('exist');
    cy.contains('Connect Your YouTube Channel').should('be.visible');

    // Step 1: YouTube Channel — simulate successful OAuth
    cy.window().then((win) => {
      cy.stub(win, 'open').returns({ closed: false, close: cy.stub() });
    });
    cy.get('[data-cy="youtube-connect-btn"]').find('button').click();
    cy.simulateYouTubeOAuth(true);
    cy.get('[data-cy="youtube-connected"]').should('exist');
    cy.get('[data-cy="step-continue"]').find('button').click({ force: true });

    // Step 2: Revenue Estimator
    cy.get('[data-cy="step-estimator"]').should('exist');
    cy.get('[data-cy="estimator-qualified"]').should('be.visible');
    cy.contains('you qualify to work with SponsPay').should('be.visible');
    cy.get('[data-cy="step-continue"]').find('button').click({ force: true });

    // Step 3: Integration — Handle Selection
    cy.get('[data-cy="step-integration"]').should('exist');
    cy.contains('Choose a Telegram channel handle').should('be.visible');
    cy.wait('@checkHandleAvailability');
    cy.get('[data-cy="handle-badge"]').first().click();
    cy.get('[data-cy="create-channel-btn"]').find('button').click({ force: true });
    cy.wait('@onboardCreator');

    // Step 3.2: QR Code — already promoted (mocked)
    cy.contains('Join Your Channel').should('be.visible');
    cy.wait('@channelInvite');
    cy.get('[data-cy="join-success"]').should('exist');
    cy.get('[data-cy="step-continue"]').find('button').click({ force: true });

    // Step 4: Terms & Conditions
    cy.get('[data-cy="step-terms"]').should('exist');
    cy.wait('@termsLatest');
    cy.get('[data-cy="terms-checkbox"]').check({ force: true });
    cy.get('[data-cy="step-continue"]').find('button').click({ force: true });
    cy.wait('@acceptTerms');

    // Step 5: Welcome
    cy.get('[data-cy="step-welcome"]').should('exist');
    cy.contains('Welcome to SponsPay').should('be.visible');
    cy.get('[data-cy="go-to-dashboard"]').find('button').click({ force: true });
    cy.url().should('include', '/dashboard');
  });
});
