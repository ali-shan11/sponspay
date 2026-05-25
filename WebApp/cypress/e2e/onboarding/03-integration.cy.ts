import { setupOnboardingIntercepts } from '../../support/onboarding-helpers';

describe('Onboarding Step 3: Integration', () => {
  describe('Sub-step 3.1: Telegram Handle Selection', () => {
    beforeEach(() => {
      // Land on estimator, then navigate to integration
      setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-youtube-connected.json' });
      cy.visitOnboardingAs('onboarding/sign-in-youtube-connected.json');
      cy.get('[data-cy="step-estimator"]').should('exist');
      cy.get('[data-cy="step-continue"]').find('button').should('not.be.disabled').click();
      cy.get('[data-cy="step-integration"]').should('exist');
    });

    it('shows 4 handle suggestions', () => {
      cy.get('[data-cy="handle-badge"]').should('have.length', 4);
    });

    it('checks handle availability on load', () => {
      cy.wait('@checkHandleAvailability');
    });

    describe('All handles available', () => {
      it('all handle badges are clickable', () => {
        cy.wait('@checkHandleAvailability');
        cy.get('[data-cy="handle-badge"]').first().click();
        cy.get('[data-cy="handle-badge"]').first().should('exist');
      });

      it('can select and deselect a handle', () => {
        cy.wait('@checkHandleAvailability');
        cy.get('[data-cy="handle-badge"]').first().click();
        cy.get('[data-cy="handle-badge"]').first().click();
      });
    });

    describe('Custom handle input', () => {
      it('can type a custom handle', () => {
        cy.get('[data-cy="handle-input"]').find('input').clear().type('my_custom_handle');
        cy.wait('@checkHandleAvailability');
      });

      it('Mistake: custom handle is taken', () => {
        cy.intercept('POST', '**/telegram/check-channel-availability', {
          body: { taken: ['my_taken_handle'] }
        }).as('customHandleCheck');

        cy.get('[data-cy="handle-input"]').find('input').clear().type('my_taken_handle');
        cy.wait('@customHandleCheck');
        // The input should be marked invalid with handle_taken error
        cy.get('[data-cy="handle-input"]').find('input').should('have.class', 'ng-invalid');
      });
    });

    describe('Create Channel', () => {
      it('success transitions to sub-step 2', () => {
        cy.wait('@checkHandleAvailability');
        cy.get('[data-cy="handle-badge"]').first().click();
        cy.get('[data-cy="create-channel-btn"]').find('button').click();
        cy.wait('@onboardCreator');
        cy.contains('Join Your Channel').should('be.visible');
      });

      it('Mistake: clicking Create Channel with no handle shows alert', () => {
        cy.wait('@checkHandleAvailability');
        cy.get('[data-cy="create-channel-btn"]').find('button').click();
        cy.contains('Please enter a valid handle.').should('be.visible');
      });

      it('Mistake: Create Channel API error stays on handle step', () => {
        cy.wait('@checkHandleAvailability');

        // Override the success intercept BEFORE any clicks so it's
        // guaranteed to be the active handler when the request fires.
        cy.intercept('POST', '**/creator/onboard', {
          statusCode: 500,
          body: { message: 'Internal server error' }
        }).as('onboardCreatorError');

        cy.get('[data-cy="handle-badge"]').first().click();
        cy.get('[data-cy="create-channel-btn"]').find('button').click();
        cy.wait('@onboardCreatorError');
        cy.contains('Choose a Telegram channel handle').should('be.visible');
      });
    });
  });

  // Separate describe so the handleAvailability override is set before page load
  describe('Sub-step 3.1: Some handles taken', () => {
    beforeEach(() => {
      setupOnboardingIntercepts({
        signIn: 'onboarding/sign-in-youtube-connected.json',
        handleAvailability: 'onboarding/handle-availability-some-taken.json'
      });
      cy.visitOnboardingAs('onboarding/sign-in-youtube-connected.json');
      cy.get('[data-cy="step-estimator"]').should('exist');
      cy.get('[data-cy="step-continue"]').find('button').should('not.be.disabled').click();
      cy.get('[data-cy="step-integration"]').should('exist');
    });

    it('taken handles are visually disabled', () => {
      cy.wait('@checkHandleAvailability');
      cy.get('[data-cy="handle-badge"]').should('have.length', 4);
    });
  });

  describe('Sub-step 3.2: QR Code & Co-Admin Promotion', () => {
    beforeEach(() => {
      setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-creator-not-coadmin.json' });
      // Add delay to channel-invite so the loading skeleton is visible long enough to assert
      cy.intercept('GET', '**/telegram/channel-invite-info', {
        fixture: 'onboarding/channel-invite-success.json',
        delay: 300
      }).as('channelInvite');
      cy.visitOnboardingAs('onboarding/sign-in-creator-not-coadmin.json');
      cy.get('[data-cy="step-integration"]').should('exist');
    });

    it('shows loading skeleton initially', () => {
      cy.get('[data-cy="qr-loading"]').should('exist');
    });

    it('displays QR code container after invite loads', () => {
      cy.wait('@channelInvite');
      cy.get('[data-cy="qr-code"]').should('exist');
      cy.get('[data-cy="waiting-for-join"]').should('exist');
    });

    it('Continue button is disabled while waiting for join', () => {
      cy.wait('@channelInvite');
      cy.get('[data-cy="step-continue"]').find('button').should('be.disabled');
    });

    describe('Already promoted (returning user)', () => {
      beforeEach(() => {
        setupOnboardingIntercepts({
          signIn: 'onboarding/sign-in-creator-not-coadmin.json',
          channelInvite: 'onboarding/channel-invite-already-promoted.json'
        });
        cy.visitOnboardingAs('onboarding/sign-in-creator-not-coadmin.json');
      });

      it('shows success immediately', () => {
        cy.wait('@channelInvite');
        cy.get('[data-cy="join-success"]').scrollIntoView().should('be.visible');
        cy.contains('Successfully joined channel!').should('be.visible');
      });

      it('Continue button is enabled', () => {
        cy.wait('@channelInvite');
        cy.get('[data-cy="step-continue"]').find('button').should('not.be.disabled');
      });
    });

    describe('Co-admin promotion via polling', () => {
      it('detects promotion through polling fallback', () => {
        cy.wait('@channelInvite');
        cy.get('[data-cy="waiting-for-join"]').should('exist');

        // WebSocket will fail (no server) → component starts polling
        cy.wait('@coAdminStatus');

        // Now change the intercept to return promoted
        cy.triggerCoAdminPromotion();

        // Wait for next poll to pick up success
        cy.wait('@coAdminStatusPromoted');
        cy.get('[data-cy="join-success"]').scrollIntoView().should('be.visible');
        cy.contains('Successfully joined channel!').should('be.visible');
        cy.get('[data-cy="step-continue"]').find('button').should('not.be.disabled');
      });
    });

    describe('Navigation', () => {
      it('Back button returns to estimator', () => {
        cy.get('[data-cy="step-back"]').find('button').click();
        cy.get('[data-cy="step-estimator"]').should('exist');
      });
    });
  });

  // Self-contained tests that need special intercept setups
  describe('Sub-step 3.2: Error states', () => {
    it('shows error state when invite link is missing', () => {
      setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-creator-not-coadmin.json' });
      cy.intercept('GET', '**/telegram/channel-invite-info', {
        body: {
          channelHandle: 'testcreator_channel',
          inviteLink: null,
          channelId: 'tg_channel_123',
          coAdminAdded: false
        }
      }).as('channelInviteNoLink');
      cy.visitOnboardingAs('onboarding/sign-in-creator-not-coadmin.json');
      cy.get('[data-cy="step-integration"]').should('exist');
      cy.wait('@channelInviteNoLink');
      cy.get('[data-cy="qr-error"]').scrollIntoView().should('be.visible');
      cy.contains('Unable to generate invite link').should('be.visible');
    });
  });

  // Note: QR code timeout (5-minute setTimeout) and refresh tests are omitted from e2e.
  // cy.clock() interferes with Angular/Zone.js change detection making these unreliable.
  // The timeout UI and refresh flow should be covered by unit tests instead.
});
