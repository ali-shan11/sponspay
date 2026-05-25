// ***********************************************
// Onboarding API Intercept Helpers
// ***********************************************
//
// Provides a shared function to intercept all API endpoints
// used during the onboarding flow. Call setupOnboardingIntercepts()
// in beforeEach and override specific endpoints per-test.

export interface OnboardingInterceptOverrides {
  signIn?: string;
  youtubeSync?: string | object;
  channelData?: string;
  youtubeAuthUrl?: object;
  youtubeDisconnect?: object;
  countries?: string;
  marketData?: string;
  analytics?: string;
  handleAvailability?: string;
  onboardCreator?: string;
  channelInvite?: string;
  coAdminStatus?: string;
  terms?: string;
  acceptTerms?: string;
  cancelOnboarding?: object;
}

/**
 * Set up all API intercepts for onboarding tests.
 * Call in beforeEach. Override specific endpoints per-test.
 */
export function setupOnboardingIntercepts(overrides: OnboardingInterceptOverrides = {}) {
  // Sign-in
  cy.intercept('POST', '**/creator/sign-in', {
    fixture: overrides.signIn || 'onboarding/sign-in-new-user.json'
  }).as('creatorSignIn');

  // YouTube sync
  if (typeof overrides.youtubeSync === 'object') {
    cy.intercept('POST', '**/creator/youtube/sync', { body: overrides.youtubeSync }).as('youtubeSync');
  } else {
    cy.intercept('POST', '**/creator/youtube/sync', {
      body: { success: false, requiresAuth: true }
    }).as('youtubeSync');
  }

  // YouTube auth URL (use regex because the query param ?returnUrl=/onboarding
  // contains a '/' which minimatch's '*' glob does not match)
  cy.intercept('GET', /\/creator\/youtube\/auth-url/, {
    body: overrides.youtubeAuthUrl || { authUrl: 'https://accounts.google.com/o/oauth2/auth?mock=true' }
  }).as('youtubeAuthUrl');

  // YouTube channel data
  cy.intercept('GET', '**/creator/youtube/channel-data', {
    fixture: overrides.channelData || 'onboarding/channel-data-single.json'
  }).as('channelData');

  // YouTube disconnect
  cy.intercept('DELETE', '**/creator/youtube/disconnect', {
    body: overrides.youtubeDisconnect || { success: true }
  }).as('youtubeDisconnect');

  // YouTube analytics report
  cy.intercept('GET', '**/creator/youtube/analytics-report*', {
    fixture: overrides.analytics || 'onboarding/analytics-with-viewers.json'
  }).as('analyticsReport');

  // Countries list
  cy.intercept('GET', '**/accounts/countries', {
    fixture: overrides.countries || 'onboarding/countries-list.json'
  }).as('countriesList');

  // Country market data
  cy.intercept('GET', '**/marketing/country-market-data', {
    fixture: overrides.marketData || 'onboarding/country-market-data.json'
  }).as('countryMarketData');

  // Telegram handle availability
  cy.intercept('POST', '**/telegram/check-channel-availability', {
    fixture: overrides.handleAvailability || 'onboarding/handle-availability-all-free.json'
  }).as('checkHandleAvailability');

  // Onboard creator
  cy.intercept('POST', '**/creator/onboard', {
    fixture: overrides.onboardCreator || 'onboarding/onboard-creator-success.json'
  }).as('onboardCreator');

  // Channel invite info
  cy.intercept('GET', '**/telegram/channel-invite-info', {
    fixture: overrides.channelInvite || 'onboarding/channel-invite-success.json'
  }).as('channelInvite');

  // Co-admin status (polling)
  cy.intercept('GET', '**/telegram/co-admin-status', {
    fixture: overrides.coAdminStatus || 'onboarding/co-admin-status-pending.json'
  }).as('coAdminStatus');

  // Terms latest
  cy.intercept('GET', '**/terms/latest', {
    fixture: overrides.terms || 'onboarding/terms-latest.json'
  }).as('termsLatest');

  // Accept terms
  cy.intercept('POST', '**/creator/accept-terms', {
    fixture: overrides.acceptTerms || 'onboarding/accept-terms-success.json'
  }).as('acceptTerms');

  // Cancel onboarding
  cy.intercept('POST', '**/creator/onboard/cancel', {
    body: overrides.cancelOnboarding || { success: true }
  }).as('cancelOnboarding');
}
