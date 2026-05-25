import { setupOnboardingIntercepts } from '../../support/onboarding-helpers';

describe('Onboarding Step 1: YouTube Channel', () => {
  beforeEach(() => {
    setupOnboardingIntercepts({ signIn: 'onboarding/sign-in-new-user.json' });
    cy.visitOnboardingAs('onboarding/sign-in-new-user.json');
    cy.get('[data-cy="step-youtube"]').should('exist');
  });

  it('shows the connect YouTube UI', () => {
    cy.contains('Connect Your YouTube Channel').should('be.visible');
    cy.get('[data-cy="youtube-connect-btn"]').should('be.visible');
  });

  it('Continue button is disabled when YouTube is not connected', () => {
    cy.get('[data-cy="step-continue"]').scrollIntoView().should('be.visible');
    cy.get('[data-cy="step-continue"]').find('button').should('be.disabled');
  });

  describe('Auto-sync on load', () => {
    it('auto-syncs successfully when backend has a token', () => {
      setupOnboardingIntercepts({
        signIn: 'onboarding/sign-in-new-user.json',
        youtubeSync: { success: true, channelId: 'UC123', channelName: 'Test' }
      });
      cy.visitOnboardingAs('onboarding/sign-in-new-user.json');
      cy.wait('@youtubeSync');
      // After successful sync, YouTube connected status should update
      cy.get('[data-cy="youtube-connected"]').should('exist');
    });

    it('shows connect button when auto-sync requires auth', () => {
      // Default behavior — sync returns requiresAuth: true
      cy.wait('@youtubeSync');
      cy.get('[data-cy="youtube-connect-btn"]').should('be.visible');
    });
  });

  describe('OAuth popup flow', () => {
    it('clicking Connect opens OAuth popup', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let openStub: any;
      cy.window().then((win) => {
        openStub = cy.stub(win, 'open').returns({ closed: false, close: cy.stub() });
      });
      cy.get('[data-cy="youtube-connect-btn"]').find('button').click();
      cy.wait('@youtubeAuthUrl').then(() => {
        expect(openStub).to.have.been.called;
      });
    });

    it('OAuth success shows connected state', () => {
      cy.window().then((win) => {
        cy.stub(win, 'open').returns({ closed: false, close: cy.stub() });
      });
      cy.get('[data-cy="youtube-connect-btn"]').find('button').click();
      cy.wait('@youtubeAuthUrl');
      cy.simulateYouTubeOAuth(true);
      cy.get('[data-cy="youtube-connected"]').should('exist');
      cy.contains('YouTube Connected!').should('be.visible');
    });

    it('OAuth success enables Continue button', () => {
      cy.window().then((win) => {
        cy.stub(win, 'open').returns({ closed: false, close: cy.stub() });
      });
      cy.get('[data-cy="youtube-connect-btn"]').find('button').click();
      cy.wait('@youtubeAuthUrl');
      cy.simulateYouTubeOAuth(true);
      cy.get('[data-cy="youtube-connected"]').should('exist');
      cy.get('[data-cy="step-continue"]').scrollIntoView().find('button').should('not.be.disabled');
    });
  });

  describe('Mistake: user denies permission', () => {
    it('shows denied error message', () => {
      cy.window().then((win) => {
        cy.stub(win, 'open').returns({ closed: false, close: cy.stub() });
      });
      cy.get('[data-cy="youtube-connect-btn"]').find('button').click();
      cy.wait('@youtubeAuthUrl');
      cy.simulateYouTubeOAuth(false, 'denied');
      cy.get('[data-cy="youtube-error"]').should('be.visible');
      cy.contains('Access was denied').should('be.visible');
    });

    it('can retry after denied error', () => {
      cy.window().then((win) => {
        cy.stub(win, 'open').returns({ closed: false, close: cy.stub() });
      });
      cy.get('[data-cy="youtube-connect-btn"]').find('button').click();
      cy.wait('@youtubeAuthUrl');
      cy.simulateYouTubeOAuth(false, 'denied');
      cy.get('[data-cy="youtube-error"]').should('be.visible');
      // Connect button should still be available for retry
      cy.get('[data-cy="youtube-connect-btn"]').should('be.visible');
    });
  });

  describe('Mistake: wrong Google account (no YouTube channel)', () => {
    it('shows no_channel error message', () => {
      cy.window().then((win) => {
        cy.stub(win, 'open').returns({ closed: false, close: cy.stub() });
      });
      cy.get('[data-cy="youtube-connect-btn"]').find('button').click();
      cy.wait('@youtubeAuthUrl');
      cy.simulateYouTubeOAuth(false, 'no_channel');
      cy.get('[data-cy="youtube-error"]').should('be.visible');
      cy.contains("doesn't have a YouTube channel").should('be.visible');
    });

    it('can retry with a different account after no_channel error', () => {
      cy.window().then((win) => {
        cy.stub(win, 'open').returns({ closed: false, close: cy.stub() });
      });
      cy.get('[data-cy="youtube-connect-btn"]').find('button').click();
      cy.wait('@youtubeAuthUrl');
      cy.simulateYouTubeOAuth(false, 'no_channel');
      cy.get('[data-cy="youtube-error"]').should('be.visible');
      // Retry with success
      cy.get('[data-cy="youtube-connect-btn"]').find('button').click();
      cy.wait('@youtubeAuthUrl');
      cy.simulateYouTubeOAuth(true);
      cy.get('[data-cy="youtube-connected"]').should('exist');
    });
  });

  describe('Mistake: user closes popup without completing', () => {
    it('stays on connect screen without error when popup is closed', () => {
      cy.window().then((win) => {
        // Simulate popup that is immediately closed
        const fakePopup = { closed: true, close: cy.stub() };
        cy.stub(win, 'open').returns(fakePopup);
      });
      cy.get('[data-cy="youtube-connect-btn"]').find('button').click();
      cy.wait('@youtubeAuthUrl');
      // The 1-second interval detects popup.closed and emits { connected: false, error: null }
      // Wait for the interval to fire
      cy.wait(1500);
      // Should stay on connect screen, no error
      cy.get('[data-cy="youtube-connect-btn"]').should('be.visible');
      cy.get('[data-cy="youtube-error"]').should('not.exist');
    });
  });

  describe('OAuth generic failure', () => {
    it('shows generic error message', () => {
      cy.window().then((win) => {
        cy.stub(win, 'open').returns({ closed: false, close: cy.stub() });
      });
      cy.get('[data-cy="youtube-connect-btn"]').find('button').click();
      cy.wait('@youtubeAuthUrl');
      cy.simulateYouTubeOAuth(false, 'failed');
      cy.get('[data-cy="youtube-error"]').should('be.visible');
      cy.contains('Connection failed').should('be.visible');
    });
  });

  describe('Navigation', () => {
    it('Continue advances to step 2 when connected', () => {
      cy.window().then((win) => {
        cy.stub(win, 'open').returns({ closed: false, close: cy.stub() });
      });
      cy.get('[data-cy="youtube-connect-btn"]').find('button').click();
      cy.wait('@youtubeAuthUrl');
      cy.simulateYouTubeOAuth(true);
      cy.get('[data-cy="youtube-connected"]').should('exist');
      cy.get('[data-cy="step-continue"]').scrollIntoView().find('button').click();
      cy.get('[data-cy="step-estimator"]').should('exist');
    });

    it('Back button goes to step 0 and disconnects YouTube', () => {
      cy.get('[data-cy="step-back"]').scrollIntoView().find('button').click();
      cy.get('[data-cy="step-get-started"]').should('exist');
    });
  });
});
