# CLAUDE.md - SponsPay WebApp

This file provides guidance to Claude Code when working with the SponsPay Angular frontend.

## Project Overview

SponsPay WebApp is an Angular 19 frontend for the SponsPay creator payments platform. YouTube creators onboard (Google login → YouTube OAuth → revenue estimator → Telegram integration → terms), then track earnings and transactions on a dashboard. Fans can pay creators via public fan pages.

**Version**: 1.0.0-beta.64 | **Framework**: Angular 19.2 (standalone components, no NgModules)

**Key dependencies**: `@angular/fire` (Firebase Auth), `bootstrap 5.3`, `chart.js`/`ng2-charts`, `socket.io-client`, `ngx-toastr`, `qr-code-styling`, `rxjs 7.8`

## Dev Server

**IMPORTANT**: The Angular dev server runs on **HTTPS** (`https://localhost:4200`). Never use `http://localhost:4200` — it will not respond. Always use the `https://` scheme when navigating with Playwright or any browser tool.

**Auth-protected pages**: If you navigate to a dashboard route (e.g., `/transaction-activity`, `/dashboard`) and get redirected to the landing page (`/`), stop and ask the user to log in. Do NOT attempt to bypass auth yourself — wait for the user to confirm they have logged in, then retry navigation.

## CRITICAL: Running Unit Tests Safely

**NEVER run `npm test` directly** — Karma launches a browser that never terminates and locks up the environment. Always use `run_in_background` with a timeout so the process can be killed:

```bash
# Safe way to run tests (background + timeout)
timeout 120 npm run test:ci   # run_in_background=true, kills after 2 min
```

If you only need to validate compilation/types, prefer `npm run build` or `npm run lint:check` instead — they're faster and always terminate.

## Pre-Commit/Push Requirements

**Before every commit and push**, all CI checks must pass locally. These mirror the GitHub Actions CI pipeline (`enhanced-ci-cd.yml`):

1. **Lint + Types**: `npm run lint:check && npx tsc --noEmit`
2. **Unit Tests + Coverage**: `timeout 180 npm run test:coverage` (run_in_background=true; NOT `npm test` or `ng test --watch=false` — those skip coverage threshold enforcement)
3. **Integration Tests**: `timeout 180 npm run test:integration` (run_in_background=true)
4. **Build**: `npm run build`

Steps 2 and 3 can run in parallel. Always use `timeout` + `run_in_background` for test commands (Karma never terminates otherwise).

**CRITICAL**: `npm run test:coverage` enforces per-file coverage thresholds (70% statements, 65% branches, 80% functions, 70% lines). If you add or modify a component, you must also update its `.spec.ts` to meet these thresholds. Running tests without `--code-coverage` will miss this — always use `npm run test:coverage` as the final verification before pushing.

**Do NOT commit or push if any of these checks fail.** Fix the issue first.

## Quick Start Commands

```bash
# Development
npm start                      # Serve with local-local config (ngrok API)
npm run start:dev              # Serve with local-dev config (api-dev.sponspay.com)

# Build
npm run build                  # Production build

# Linting
npm run lint                   # ESLint (angular-eslint)
npm run lint:fix               # Auto-fix
npm run lint:check             # Zero warnings (CI gate)

# Unit Tests (Karma/Jasmine)
npm test                       # Watch mode
npm run test:ci                # Headless, excludes integration tests
npm run test:coverage          # Coverage report
npm run test:integration       # Integration tests only

# E2E Tests (Cypress 14)
npm run cypress:open           # GUI
npm run cypress:run            # Run all specs
npm run cypress:test:onboarding # Onboarding specs only
npm run cypress:test:landing   # Landing page specs only

# Release
npm run commit                 # Conventional Commits via commitizen
npm run release                # semantic-release
```

## Architecture

### Folder Structure

```
src/app/
├── auth/interceptor/          # headerTokenInterceptor, loaderInterceptor, alertInterceptor
├── components/                # Shared UI (alert, badge, button, step-tracker, phone-number, etc.)
├── layout/                    # Landing, Onboarding, Dashboard layout shells
├── pages/
│   ├── content-creator/
│   │   ├── onboarding/        # 6-step flow (get-started → youtube → estimator → integration → finish → welcome)
│   │   ├── cancellation/      # Cancel onboarding flow
│   │   └── dashboard/         # Dashboard, transaction-activity, compensation
│   ├── fan/                   # Public fan payment pages (/fan/:handle)
│   ├── landing-page/          # Marketing landing page
│   └── oauth-callback/        # YouTube OAuth popup callback
├── services/                  # All injectable services (root-provided singletons)
├── types/                     # TypeScript declaration files (.d.ts)
├── utils/                     # Constants, enums, URLs, SVG icons
├── pipes/                     # number-format pipe (K/M/B)
└── testing/                   # Shared test infrastructure (mocks, fixtures, helpers)
```

### Routing (app.routes.ts)

All routes use lazy-loaded standalone components via `loadComponent`.

| Path | Layout | Auth |
|---|---|---|
| `/`, `/contact-us` | LandingLayout | No |
| `/onboarding`, `/cancellation` | OnboardingLayout | No |
| `/fan/:handle` | OnboardingLayout | No |
| `/oauth/callback` | None (popup) | No |
| `/dashboard`, `/transaction-activity` | DashboardLayout | Yes (`authGuard`) |

The `authGuard` uses `TokenService.getToken()` — redirects to `/` if no valid Firebase ID token.

### Path Aliases (tsconfig.json)

```
@app-types/* → src/app/types/*    @services/*   → src/app/services/*
@components/* → src/app/components/*   @utils/*  → src/app/utils/*
@pages/*      → src/app/pages/*    @pipes/*      → src/app/pipes/*
```

## Key Patterns

### Authentication

1. Google Sign-In via `signInWithPopup(GoogleAuthProvider)` in `AuthService`
2. Google OAuth access token stored in localStorage (1h expiry)
3. POST to `{API_BASE}/creator/sign-in` registers user with backend
4. `CreatorSignInResponse` determines onboarding step via `OnboardingService.propagateUser()`
5. Firebase ID token managed separately by `TokenService` via `onAuthStateChanged`

### HTTP Interceptors (app.config.ts)

Three functional interceptors registered via `withInterceptors()`:

1. **`headerTokenInterceptor`** — Adds `api-key` + `Authorization: Bearer {firebaseIdToken}` to non-public API calls. If no token, redirects to `/`.
2. **`loaderInterceptor`** — Shows/hides global spinner based on `CUSTOM_REQUEST_CONTEXT.showLoader`.
3. **`alertInterceptor`** — Auto-shows toasts on success/error. Configurable via `CUSTOM_REQUEST_CONTEXT` (skipAlert, customSuccessAlert, etc.).

`PUBLIC_ENDPOINTS` (in `utils/constants.ts`) lists endpoints that skip the auth token requirement.

### State Management

No NgRx — all state via `BehaviorSubject` + `.asObservable()` in root-provided services. Angular signals used sparingly (e.g., `triggerGoogleAuth` in AuthService).

### Onboarding Steps (utils/enums.ts)

| Step | Value | Component | Condition to reach |
|---|---|---|---|
| GET_STARTED | 0 | GetStartedComponent | No auth |
| YOUTUBE_CHANNEL | 1 | YoutubeChannelSelectorComponent | Signed in, no YouTube |
| REVENUE_ESTIMATOR | 2 | EstimatorComponent | YouTube connected, not creator |
| INTEGRATION | 3 | IntegrationComponent | Creator, not co-admin or no terms |
| TERMS_CONDITIONS | 4 | FinishComponent | Co-admin, no terms accepted |
| WELCOME | 5 | WelcomeComponent | Terms accepted |

Fully onboarded (`youtubeConnected && isCreator && hasAcceptedTerms`) → redirect to `/dashboard`.

### Styling

Bootstrap 5.3 via SCSS + custom theme (`src/theme/`). Body font: Inter. Component-scoped SCSS files.

## Testing

### Unit Tests

Karma 6.4 + Jasmine 5.2 + ChromeHeadless. Coverage thresholds: 80% statements, 75% branches, 90% functions, 80% lines.

Shared test infrastructure in `src/testing/`:
- `mocks/` — Firebase, HTTP, services, storage mocks
- `fixtures/` — Channel, user, analytics factories
- `helpers/` — Async, component, DOM, performance utilities

### Environment Configuration

| Config | API_BASE |
|---|---|
| `environment.ts` (local-local) | ngrok tunnel |
| `environment.development.ts` (local-dev) | `https://api-dev.sponspay.com` |
| `environment.production.ts` | `https://api.sponspay.com` |

Firebase project: `sponspay-fassil` (same across envs, `authDomain` differs).

## Cypress E2E Test Debugging

### Running Tests

```bash
# CRITICAL: unset ELECTRON_RUN_AS_NODE or Cypress binary crashes with SIGILL
unset ELECTRON_RUN_AS_NODE

# Start Angular dev server first (required - Cypress needs localhost:4200)
npx ng serve &

# Run onboarding tests
npx cypress run --spec "cypress/e2e/onboarding/**/*.cy.ts" --browser chrome

# Run a specific test file
npx cypress run --spec "cypress/e2e/onboarding/00-get-started.cy.ts" --browser chrome
```

### Analyzing Test Videos with ffmpeg

Cypress records videos (`video: true` in config). Claude Code cannot read MP4 files directly — use ffmpeg to extract frames as PNG, then read those.

```bash
# Extract frames at 1 fps (frame numbers = seconds)
mkdir -p /tmp/cypress-frames
ffmpeg -i cypress/videos/<test-file>.cy.ts.mp4 -vf "fps=1" /tmp/cypress-frames/frame_%04d.png

# Higher fps around a specific failure (5fps starting at 30s for 10s)
ffmpeg -i cypress/videos/<test-file>.cy.ts.mp4 -vf "fps=5" -ss 00:00:30 -t 10 /tmp/cypress-frames/detail_%04d.png
```

**Also check failure screenshots** (auto-saved by Cypress):
```
cypress/screenshots/<spec-file>/<test-name> (failed).png
```

**Debugging workflow:**
1. Run the test, let it fail
2. Read failure screenshots first (most targeted info)
3. If screenshots don't explain the issue, extract video frames with ffmpeg
4. Look at frames around the failure timestamp to understand the sequence of events
5. Compare what the test expects vs what the page actually shows

### Auth Bypass for Mocked Tests

Tests use `__CYPRESS_AUTH_BYPASS__` window flag (set via `cy.visitOnboardingAs(fixture)`) to inject auth state without real Google login. The bypass in `auth.service.ts` also calls `tokenService.setTestToken()` with a mock JWT so that:
- `authGuard` on protected routes (e.g., `/dashboard`) allows navigation
- `headerTokenInterceptor` doesn't redirect to `/` for non-public API calls

The mock JWT uses `exp: 9999999999` (year 2286) so `TokenService.isTokenValid()` always passes.

### Common Cypress Pitfalls

- **ELECTRON_RUN_AS_NODE=1**: If set in environment, Cypress binary runs as Node.js instead of Electron and crashes. Always `unset ELECTRON_RUN_AS_NODE`.
- **Cookie consent banner**: Zoho PageSense injects a cookie banner that can cover bottom-of-viewport elements. Use `scrollIntoView()` before `should('be.visible')` assertions.
- **API calls without token**: Non-public endpoints require a Firebase JWT. The `headerTokenInterceptor` redirects to `/` if `TokenService.getToken()` returns null. The Cypress auth bypass handles this.
- **WebSocket/Socket.IO**: Don't mock Socket.IO in tests. Let it fail naturally (no server) and test via polling intercepts instead.
