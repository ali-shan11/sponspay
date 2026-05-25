# SponsPay API - Active Context

## Current State
- Basic API structure implemented
- Marketing module with contact form endpoint
- Authentication system with JWT and API keys
- Health check endpoints configured
- Database connection established
- pgAdmin web client available via Docker Compose and Kubernetes manifests
- Email service integrated
- **Zoho CRM Integration**: Production-ready with automatic lead creation
- Role requirements now documented in Swagger via `x-roles` extension
- RolesGuard now reads creator/admin roles from the `User` entity instead of Firebase custom claims, with unit/controller tests overriding the guard when mocking modules
- **Creator Insights module added**: first analytics endpoint for daily revenue
- **Property-based testing introduced**: fast-check added to test critical analytics logic across randomized scenarios
- **Link Click Tracking & Channel Stats**: Added LinkClick entity (now references `TelegramChannel` via FK), API to check taken Telegram handles, and creator endpoint `/user/channel-statistics` returning channel handle, link click, transaction counts, and transaction trend percentage
- **Admin pre-seed fix**: Dev seeding now assigns a random `PaymentMethod` when creating accounts
- **E2E Test Status (2025-09-13)**: `top-earning-countries` e2e suite failing due to FK constraint; other creator insights e2e tests pass
- **Embedded Postgres option**: Added script to spin up local Postgres without Docker for running e2e tests
- **Transactions overview endpoint**: `GET /creator-insights/transactions` lists recent transactions with country, local/USD amounts, cumulative message counts, payout dates, configuration deadlines, returns **totalRecords** plus local currency codes, and **supports pagination via page & limit params**; uses new `PaymentProvider.payoutDelay` field
- **E2E Isolation improvements**: Creator Insights e2e specs now use unique Firebase UIDs and randomized payment method codes to avoid cross-suite data clashes and duplicate key violations
- **Payment Method entity deprecated**: all payment instrument references will use `Account`; `PaymentMethod` entity slated for removal
- **Transaction entity expanded**: added `payoutAt`, `messageType` (video/livestream), and `livestreamId` fields
- **Account statistics endpoint**: `GET /creator-insights/account-statistics` returns earnings, next payout, message counts, livestream totals, and fee metrics for a specific account or aggregated by country
- **Payment providers enriched**: now seeded from PawaPay docs with ISO 3166-1 alpha-3 country codes, currencies, and decimal support; top-earning-countries endpoint returns countryCode and account-statistics accepts accountId, country name or code
- **Payout tracking**: Introduced `Payout` entity tied to transactions and accounts; a payout can cover multiple transactions, which now reference payouts via `payoutId`
- **Creator payouts endpoint**: `GET /creator-insights/payouts` lists creator payouts filtered by provider country with pagination, search, and sort
- **PaymentProvider country codes**: `PaymentProvider` entities now store ISO country codes and the payouts endpoint accepts a `countryCode` query param alongside country name
- **Accounts module**: `GET /accounts` lists creator accounts with provider country/name and owner full name; `POST /accounts` and `PATCH /accounts/:id` allow creators to manage their payment accounts
- **Accounts module**: moved `Account` entity out of Transaction module, added `fullName` field, and exposed endpoints to list, create, and update creator-owned accounts
- **Accounts countries endpoint**: `GET /accounts/countries` returns unique payment provider countries **with ISO alpha-3 country codes**, documented in Swagger via `ProviderCountryDto` and explicit `ApiOkResponse`, with unit, HTTP-level, and e2e (requires embedded Postgres) coverage
- **PawaPay module**: new Nest module with deposit, payout, and refund services plus webhook callback controller using HMAC signature verification and raw-body capture
- **PawaPay provider availability**: controller now exposes `GET /pawapay/providers?countryCode=XXX` which returns local payment providers for a country with live availability from the PawaPay toolkit API, normalizing provider names and surfacing provider IDs for follow-up deposits
- **Account verification SMS**: Infobip integration issues 6-digit codes, logs outbound messages, and adds `/accounts/:id/verify` plus `/accounts/:id/resend-verification` with 5-minute validity and a 20-second resend cooldown
- **Account Soft Deletion**: Added `DELETE /accounts/:id` endpoint to soft-delete accounts. This adds a `deletedAt` timestamp to the `Account` entity and filters soft-deleted accounts from query results.
- **Enhanced Account Creation with Deleted Account Handling**: Completely refactored account creation process to handle soft-deleted accounts with sophisticated restoration and anonymization logic

## Recent Work

### Unit Test Fixes for Telegram Notification Service (COMPLETED 2026-01-11)
Fixed TypeScript compilation errors in `telegram-notification.service.spec.ts` where tests were attempting to directly assign to read-only properties (getters):
- **Issue**: Three test cases were trying to set `mockTelegramConfig.fromEmail = undefined` and `mockTelegramConfig.managementEmail = undefined` directly, which fails because these are getters in TelegramConfig
- **Solution**: Used `Object.defineProperty()` with configurable getters to properly mock the undefined values
- **Fixed Lines**: Lines 156, 285, and 296
- **Result**: All 666 tests passing, linter clean, zero errors

### Telegram Invite Link & Auto-Promotion System (COMPLETED 2025-11-02)
Complete overhaul of telegram channel invite link system with automatic co-admin promotion:

**Core Features Implemented:**
- **Single-Use Invite Links**: Real Telegram invite links generated via `messages.exportChatInvite` API (not constructed URLs)
- **Automatic Co-Admin Promotion**: Event-driven promotion when users join via invite link
- **WebSocket Notifications**: Real-time updates to frontend when promotion succeeds
- **Polling Fallback**: Status check endpoint for environments without WebSocket
- **Retry Logic**: 3 attempts with exponential backoff (1s, 5s, 15s delays)
- **Management Alerts**: Email notifications on promotion failures
- **Self-Healing Invite Links**: Auto-generation of missing invite links

**Technical Implementation:**
- **Database Schema**: Added `inviteLink`, `joinedUserId`, `promotionAttempts`, `lastPromotionError` to TelegramChannel entity
- **WebSocket Gateway**: Created TelegramGateway with Socket.IO in 'telegram' namespace
- **Event Listeners**: Telegram Raw event listener for `UpdateChannelParticipant` events
- **Auto-Promotion**: Detects new members, validates channel state, promotes with restricted admin rights
- **Management Email**: `MANAGEMENT_EMAIL` env variable with validation and k8s configuration
- **Endpoints Updated**:
  - `GET /telegram/channel-invite-info` - Returns stored invite link, self-heals if missing
  - `GET /telegram/co-admin-status` - Polling endpoint for promotion status (60 req/min limit)
  - Removed `POST /telegram/co-admin` - Manual promotion no longer needed

**Testing & Quality:**
- 58 comprehensive unit tests for telegram.service.ts (100% pass rate)
- Tests cover invite generation, event handling, retry logic, WebSocket notifications, management alerts
- All 412 total tests passing after removing 11 tests for deleted endpoint
- Complete documentation update in `docs/integrations/creator-onboarding-flow.md`

**Configuration:**
- `MANAGEMENT_EMAIL=sponspay-management@sponspay.com` (required)
- WebSocket dependencies: @nestjs/websockets@11.1.8, socket.io@4.8.1
- CORS configured for WebSocket connections

### WebSocket Multi-Pod Scaling (COMPLETED 2025-11-02)
Implemented Redis-based Socket.IO adapter for horizontal scaling:

**Features:**
- **Redis Adapter**: Socket.IO adapter using Redis pub/sub for cross-pod communication
- **Multi-Pod Support**: WebSocket events broadcast to all pods via Redis
- **Room-Based Messaging**: User-specific rooms work across pod boundaries
- **Socket.IO Admin UI**: Monitoring and debugging interface at `/admin` route
- **Kubernetes Ready**: Redis deployment and service in k8s manifests

**Technical Details:**
- Redis adapter configuration in TelegramGateway
- Redis StatefulSet with persistent volume in k8s
- Socket.IO Admin UI with CORS configuration
- Room naming standardization: `user:${firebaseUid}`

### Terms and Conditions Seeder (COMPLETED 2025-11-02)
Added seeding capability for terms and conditions:

**Implementation:**
- Seeder for pre-populating terms and conditions in database
- Supports versioned terms management
- Integrated into application bootstrap process

### Bug Fixes (2025-11-02)
- Fixed Socket.IO room naming inconsistencies
- Fixed issues with Telegram event listener for channel participant updates
- Added rate limiting to co-admin status endpoint (60 req/min)

- **COMPREHENSIVE SECURITY DOCUMENTATION (COMPLETED 2025-10-21)**: Implemented complete security documentation system for all API endpoints:
  - **Custom Swagger Decorators**: Created 8 reusable TypeScript decorators for standardized security documentation (`src/decorators/api-security-docs.decorator.ts`)
  - **Security Profile Component**: `ApiSecurityProfile()` generates formatted security sections with auth, authorization, rate limits, data sensitivity, audit logging, and error documentation
  - **Coverage**: 27/33 endpoints (82%) with full security profiles - 100% of Critical and Sensitive endpoints
  - **Enhanced Swagger UI**: Added comprehensive security overview to main.ts with proper Markdown formatting
  - **Endpoint Security Matrix**: Complete reference table (`docs/security/ENDPOINT-SECURITY-MATRIX.md`) tracking all endpoints with security status
  - **Documentation Guide**: 750+ line implementation guide with 5 security patterns and examples
  - **Controllers Updated**: Creator (4), Marketing (6), Accounts (8), Creator Insights (5), Health (1), File Upload (1), Terms (2)
  - **Security Features Documented**: Authentication methods, role requirements, rate limiting, data sensitivity levels, audit logging status, security considerations, common errors
  - **Benefits**: Improved developer experience, security transparency, compliance readiness, consistent patterns
  - **Quality**: All code passes linting, no breaking changes, fully backward compatible
- **NestJS 11 Upgrade (2025-10-02)**: Successfully upgraded from NestJS 10.4.20 to 11.1.6
  - All @nestjs/* packages updated to v11.x
  - Express v5 integrated automatically (no code changes required)
  - All 374 unit tests passing
  - Linter passing with no issues
  - Zero breaking changes required for this codebase
  - Branch: upgrade/nestjs-11 (commit 9fe1471)
- pgAdmin web client added to Docker Compose and Kubernetes with env-based auto-login
- NestJS project setup completed
- Module architecture established
- Authentication strategies implemented
- Marketing endpoints created
- SendGrid integration configured
- Docker containerization ready
- **Zoho CRM Integration**: Complete implementation with OAuth 2.0 authentication
- **Clean Architecture**: Direct REST API approach without SDK dependencies
- **Security Implementation**: Environment-driven configuration with proper token management
- **Fault-Tolerant Design**: Contact forms work even when Zoho CRM is unavailable
- Swagger documentation enhanced to list required roles for guarded endpoints
- **Creator Insights – Revenue per Day endpoint delivered**
  - Path: `GET /creator-insights/revenue-per-day`
  - Security: `FirebaseAuthGuard` + `RolesGuard`; minimum role `creator` (admins allowed)
  - Query: `days` (default 30, 1..365), `tzOffsetMinutes` (default 0, -720..840; local = UTC + offset)
  - Logic: Filters transactions for the authenticated creator (`beneficiary.firebaseUid == req.user.user_id`) and status `succeeded`; groups by local day using `date_trunc('day', createdAt + (:tzOffsetMinutes) * interval '1 minute')`; zero-fills missing local days; returns series with totals
  - Swagger: Query param schemas with min/max/defaults; detailed response DTO; 400/401/403 responses documented
  - Tests: Unit tests for controller/service + new property-based tests with fast-check to validate series invariants and totals
  - Implementation detail: timezone-stable mapping of SQL `day` back to `YYYY-MM-DD` without local TZ drift
- **Deterministic E2E Integration Tests (New)**
  - Added table-driven e2e suite: `test/creator-insights.revenue.math.e2e-spec.ts`
  - Freezes clock via `jest.spyOn(Date, 'now')` for deterministic windowing; aligns with service using `Date.now()`
  - Overrides FirebaseAuthGuard/RolesGuard to inject a Creator user; stubs FirebaseAdminService and Telegram client to avoid external calls
  - Inserts transactions via raw INSERT with explicit FKs and `createdAt` to avoid `@CreateDateColumn` interference
  - Verifies: timezone offsets (+/-), boundary inclusivity/exclusivity, zero-fill, per-day rounding, and total invariance
  - CI: Runs in GitHub Actions e2e job using a Postgres 16 service (parallel with lint and unit)
- **Transaction Fees entity added**: tracks per-transaction fees with percentage, local amount, USD estimate, and charged timestamp; Transaction entity now includes `totalFees` and generated `totalPayout` columns
- **Transaction payer refactor**: `Transaction` now stores `payerFullName` and `payerPhone` instead of referencing a `User`; dev seeding and admin pre-seed updated accordingly
- **Deterministic e2e insert fix**: revenue-per-day e2e raw INSERT updated for new payer fields and correct timestamp placeholders
- **Country statistics analytics**: service and controller with unit tests plus e2e spec (requires Postgres)
- **Country statistics e2e stabilized**: tests now use a unique provider/country and service account lookups include owner relation to surface mobile numbers correctly
- **PawaPay integration**: created provider HTTP client for deposits, payouts, refunds, and webhook signature verification with tests covering idempotency and error handling
- **Infobip SMS integration**: Added Infobip module, SMS logging entity, and account verification flows (send, verify, resend) with expiry and resend throttling
- **Account Soft Deletion**: Implemented soft-delete functionality for accounts, including entity changes, service logic, a new controller endpoint, and comprehensive tests.
- **Infobip v3 API Migration (2025-09-27)**: Updated sendSMS function to use new Infobip v3 API endpoint (`/sms/3/messages`) with updated request structure using `sender`, `destinations`, and `content` fields instead of the legacy v2 format
- **E2E Test Fix (2025-09-18)**: Fixed failing creator-insights.transactions e2e tests by ensuring proper currency setup with explicit ISO 4217 numeric codes and using direct currency references in transaction inserts instead of relying on provider.currency relationships
- **GitHub Actions E2E Fix (2025-09-27)**: Fixed failing creator-insights.top-earning-countries e2e test in GitHub Actions by adding country code validation to prevent malformed data from causing test failures
- **Currency Seeding Fix (2025-09-27)**: Resolved duplicate key constraint violations in currency seeding by implementing robust upsert logic that handles both shortCode and iso4217Numeric unique constraints, preventing race conditions during application bootstrap
- **Payment Provider Schema Fix (2025-09-27)**: Fixed PaymentProvider entity schema to allow multiple providers with the same name but different countries/currencies by removing unique constraint on name field and adding composite unique constraint on [name, countryCode, currency]; updated seeder to handle this business logic correctly
- **Enhanced Account Creation with Deleted Account Handling (2025-09-27)**: Completely refactored the account creation process to handle soft-deleted accounts with sophisticated restoration and anonymization logic:
  - **Phone Number Validation**: Prevents creation of accounts with phone numbers where all digits are 9 (prevents abuse of anonymization system)
  - **Account Restoration**: When same owner tries to recreate a deleted account, restores it by clearing `deletedAt`, preserving metadata, resetting verification status, and forcing re-verification
  - **Account Anonymization**: When different owner wants same phone number as deleted account, anonymizes old account's phone number (replaces all digits with 9s) and creates new account with original number
  - **Comprehensive Logging**: Added detailed audit logging for all restoration and anonymization events with relevant context
  - **Enhanced API Documentation**: Updated Swagger documentation to reflect all 5 scenarios now handled by account creation
  - **Extensive Test Coverage**: Added 6 new test cases covering all deleted account scenarios, bringing total to 26 passing tests
  - **Backward Compatibility**: Maintains full compatibility with existing account creation logic while adding new deleted account handling
- **CRITICAL SECURITY FIXES (2025-09-27)**: Addressed two critical security vulnerabilities in the accounts module:
  - **Cryptographically Secure Code Generation**: Fixed predictable verification code generation by replacing `Math.random()` with Node.js `crypto.randomInt()` for cryptographically secure 6-digit codes
  - **Rate Limiting Implementation**: Added comprehensive rate limiting using `@nestjs/throttler` to prevent abuse:
    - Account creation: 3 requests per minute per IP
    - Verification attempts: 5 attempts per minute per IP  
    - Resend verification: 3 requests per minute per IP
  - **ThrottlerModule Configuration**: Configured global rate limiting (10 requests/minute default) with specific overrides for vulnerable endpoints
  - **Test Coverage**: Updated controller tests to include ThrottlerGuard mocking
  - **Security Hardening**: Prevents SMS bombing, brute force attacks, and resource exhaustion on critical endpoints

## Active Features

### Completed
- Marketing contact form endpoint
- API key authentication
- JWT authentication setup
- Health monitoring
- Basic user entity
- Email sending capability
- File upload module structure
- Internationalization setup
- **Zoho CRM Lead Creation**: Automatic lead generation from contact form submissions
- **OAuth Token Management**: Automatic access token refresh using refresh tokens
- **CRM Data Mapping**: Contact form fields mapped to Zoho lead fields
- **Error Handling**: Graceful degradation when CRM is unavailable
- **Creator Insights: Revenue per Day**
  - Endpoint: `GET /creator-insights/revenue-per-day`
  - Inputs: `days`, `tzOffsetMinutes`
  - Output: fixed-length local-day series with `revenueUsd`, `startDate`, `endDate`, `totalRevenueUsd`
  - Data: `transactions.usdEstimatedValue` with status `succeeded`, scoped to authenticated creator
  - SQL: `date_trunc('day', t."createdAt" + (:tzOffsetMinutes) * interval '1 minute')`
  - Docs: Rich Swagger documentation for parameters and response
- **Deterministic E2E Suite for Creator Insights**
  - File: `test/creator-insights.revenue.math.e2e-spec.ts`
  - Scope: S1–S8 scenarios covering same-day sums, multi-day zero-fill, tz shifts, boundaries, and total invariance
  - Pattern: No external services, deterministic clock, raw inserts with explicit FKs and timestamps
- **Transaction Fees tracking**
  - New `TransactionFee` entity with percentage, amounts, and timestamp
  - `Transaction` entity expanded with `totalFees` column, generated `totalPayout` column, and fee relation
- **Transactions overview**
  - Endpoint: `GET /creator-insights/transactions`
  - Columns: country, local & USD amounts, cumulative messages, payout amount/date, pay deadline
  - Relies on `PaymentProvider.payoutDelay`; pay deadline one month after transaction if no account
  - Unit tests for service/controller and new e2e spec (DB required)
- **Enhanced Account Creation with Deleted Account Handling**
  - **5 Scenarios Handled**: No existing account, unverified takeover, verified same owner, verified different owner (error), and **NEW**: deleted account restoration/anonymization
  - **Phone Number Validation**: Rejects phone numbers with all digits as 9
  - **Account Restoration**: Same owner can restore deleted accounts with forced re-verification
  - **Account Anonymization**: Different owners get new accounts while old deleted accounts are anonymized
  - **Comprehensive Logging**: Audit trail for all restoration and anonymization events
  - **Full Test Coverage**: 26 tests covering all scenarios including edge cases

### In Progress
- No active development tasks

### Recently Completed
- **ONBOARDING CANCELLATION ENDPOINT (COMPLETED)**: Marks Zoho contacts when users cancel onboarding
  - **New Endpoint**: `POST /user/cancel-onboarding` (API key protected)
  - **Zoho Update**: Appends cancellation note and department update
  - **Unit Tests**: Coverage for service, controller, and Zoho service
- **TERMS AND CONDITIONS MODULE (COMPLETED)**: Versioned terms management with user acceptance tracking
  - **New Endpoints**:
    - `GET /terms/latest` for fetching current HTML and version
    - `POST /terms` (API key protected) for publishing new versions
    - `POST /user/accept-terms` (Firebase auth) to record acceptance timestamp and link to a specific version
  - **Database Changes**: Added `Terms` entity and User-to-Terms relationship for acceptance tracking
  - **Unit Tests**: Coverage for service and controller logic

- **TELEGRAM CO-ADMIN ENDPOINT (COMPLETED)**: Add endpoint to promote a Telegram user to co-admin with restricted rights
  - **New Endpoint**: `POST /telegram/co-admin` (API key protected)
  - **Input DTO**: `{ telegramUserId: string, creatorFirebaseUid: string }` where `telegramUserId` accepts `@username` or numeric ID
  - **Permissions Applied**: postMessages, editMessages, deleteMessages = true; all other admin rights = false
  - **Business Logic**:
    - Resolve creator by Firebase UID and load the single Telegram channel
    - Resolve private channel via session dialogs (by stored channelId/handle) with fallback to `getEntity(channelHandle)`
    - Resolve target user via username or numeric ID
    - Invite to channel if not member (non-fatal if already a participant)
    - Promote via `Api.channels.EditAdmin` with restricted `Api.ChatAdminRights`
  - **Assumptions**: Session is the channel owner; each creator has at most one channel
  - **Error Handling**: Helpful messages for creator not found, channel not found, invalid user, and Telegram permission errors
  - **Swagger**: Documented with summary and example response
  - **Unit Tests**: Added service and controller tests covering success and key failure scenarios
- **CREATOR STATUS CHECK ENDPOINT (JUST COMPLETED)**: Complete implementation of creator status checking endpoint:
  - **New Endpoint**: `GET /user/creator-status/:firebaseUid` to check if user is onboarded as creator
  - **Comprehensive Response**: Returns detailed status including role, onboarding date, and channel counts
  - **Role-Based Logic**: Admin and Creator roles considered "onboarded", Fan role not onboarded
  - **Database Optimization**: Efficient queries with relations and counting for performance
  - **Complete Test Coverage**: 100% unit test coverage for both service and controller
  - **Error Handling**: Graceful handling of database errors and missing users
  - **API Documentation**: Full Swagger documentation with response examples
  - **Security**: Protected by API key authentication following existing patterns

- **CREATOR ONBOARDING ENDPOINT (COMPLETED)**: Complete implementation of creator onboarding with privacy-first architecture and role hierarchy:
  - **Privacy-First Design**: Removed personal data from database, using Firebase as single source of truth
  - **Role Hierarchy**: Admin > Creator > Fan with proper role preservation logic
  - **Database Entities**: User, YouTubeChannel, ChannelSnapshot, TelegramChannel entities with relationships
  - **Admin Role Preservation**: Admin users maintain Admin role when onboarding as creators
  - **Firebase Integration**: Custom claims assignment for role-based access control
  - **Telegram Channel Creation**: Private channel creation with handle tracking
  - **Complete Test Coverage**: 238 tests passing across 20 test suites (100% unit test coverage)
  - **Transaction Safety**: Database transactions ensure data consistency
  - **Error Handling**: Comprehensive validation and conflict detection
  - **API Endpoint**: `POST /user/onboard-creator` with Firebase authentication

- **CREATOR ONBOARDING STATUS ENHANCEMENT (COMPLETED)**: `POST /user/creator-onboard` now returns onboarding state flags
  - **Status Flags**: indicates if user is already a creator, if a co-admin has been added, and whether terms are accepted
  - **Database Update**: added `co_admin_added` column on `telegram_channels` to track co-admin addition
  - **Service/Controller Logic**: new `getCreatorOnboardingStatus` method with controller-level checks for idempotent responses
  - **Documentation & Tests**: updated docs and unit tests for new response shape and status tracking

- **TELEGRAM INTEGRATION MODULE (COMPLETED)**: Full implementation of Telegram API integration for channel name availability checking:
  - **Telegram Client Setup**: Complete TelegramClient configuration with StringSession authentication
  - **Channel Name Validation**: Service to check if Telegram channel/username is available
  - **API Endpoint**: `POST /telegram/is-channel-name-available` with API key protection
  - **Environment Configuration**: Added TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION_STRING to config validation
  - **Session Generation Script**: `scripts/generate-telegram-session.js` for obtaining session strings
  - **Complete Test Coverage**: Unit tests for both service and controller with proper mocking
  - **Error Handling**: Robust error handling for USERNAME_NOT_OCCUPIED and other API errors
  - **Security**: API key authentication required for all Telegram endpoints
  - **Module Integration**: Fully integrated into main AppModule with proper dependency injection

- **ZohoCRM Contact Integration for Sign-ins (COMPLETED)**: Implemented streamlined ZohoCRM integration that creates contacts when users sign in, working within free ZohoCRM constraints:
  - **Architecture Changes**: Switched from Leads to Contacts for sign-ins, Contact form → Contact creation → Lead promotion
  - **API Implementation**: New ZohoService methods for contact creation and management
  - **Data Mapping**: Standard fields only (First_Name, Last_Name, Email, Company, Lead_Source, Department, Description)
  - **Duplicate Prevention**: Email-based search and update logic for existing contacts
  - **WebApp Integration**: New endpoint `POST /user/sign-in-contact` for authentication flow
  - **Scope Update**: Updated OAuth scope to `ZohoCRM.modules.contacts.ALL,ZohoCRM.modules.leads.ALL`
  - **Error Handling**: Fixed "Unexpected end of JSON input" error with proper response validation
  - **Setup Documentation**: Created comprehensive setup guide and troubleshooting docs

- **COMPREHENSIVE UNIT TEST SUITE (COMPLETED)**: 100%+ coverage for new work; robust patterns for mocking and error handling
- Database: Currencies entity updated to include iso4217Numeric (ISO 4217 numeric code, e.g., 840 for USD); removed legacy internationalCode column; dev seeder assigns 840 to USD and backfills if missing.

## Technical Decisions

### Recent Choices
1. **NestJS**: Enterprise-grade framework
2. **PostgreSQL**: Reliable relational database
3. **TypeORM**: Mature ORM with good NestJS integration
4. **Firebase Auth**: Proven authentication service
5. **SendGrid**: Reliable email delivery
6. **Direct REST API**: Chose lightweight REST calls over heavy SDK for Zoho integration
7. **OAuth 2.0 Flow**: Implemented proper authorization code flow with refresh tokens
8. **Fault-Tolerant Integration**: CRM failures don't break contact form functionality
9. **Creator Insights analytics**: Grouping by local day via interval-shifted `date_trunc`
10. **Property-based testing**: Adopted `fast-check` to validate analytics invariants across randomized inputs
11. **Deterministic E2E Integration Testing**: Adopted for correctness-critical endpoints; clock freeze + env bootstrap + provider/guard overrides + raw DB inserts with explicit FKs/timestamps
12. **Sophisticated Deleted Account Handling**: Implemented restoration for same owners and anonymization for different owners to balance user experience with privacy protection

### Architectural Patterns
- Module-based architecture
- Repository pattern for data access
- DTO validation with class-validator
- Guard-based authentication
- Service layer for business logic
- **OAuth Token Lifecycle Management**: Automatic token refresh with proper error handling
- **Environment Variable Configuration**: Secure credential storage
- **Service Isolation**: Zoho service operates independently from core functionality
- **Analytics Pattern**: timezone-stable local day bucketing using SQL interval shift and zero-filling on the API side
- **Testing Pattern**: property-based tests for analytics invariants, classic unit tests for deterministic cases
- **Deterministic E2E Pattern**: see Testing Mandate below
- **Deleted Account Handling Pattern**: Comprehensive logic for account lifecycle management with restoration, anonymization, and audit logging

## Known Issues
- ✅ ~~No rate limiting implemented~~ - RESOLVED: Comprehensive rate limiting added to accounts module
- Missing comprehensive error handling
- No caching layer
- ✅ ~~Limited test coverage~~ - RESOLVED: high coverage with added property-based tests
- No API versioning
- Obsolete `zoho_tokens.txt` file needs removal

## Testing Mandate (Policy)
For complex or correctness-sensitive operations (time windowing, rounding, currency/FX handling, grouping/binning, multi-status pipelines, idempotency), we SHALL:
- Add a deterministic, table-driven e2e suite that:
  - Freezes time via `jest.spyOn(Date, 'now')` (service must use `Date.now()` to honor this)
  - Provides a test-only env bootstrap (Jest `setupFiles`) to satisfy ConfigModule and avoid real external services
  - Overrides guards/providers to avoid network calls (Firebase/Telegram/etc.)
  - Seeds data with a single raw INSERT per row, explicitly specifying FK columns and timestamps to avoid ORM timestamp side effects
  - Mirrors service windowing/grouping/rounding logic in a `computeExpected` helper
  - Verifies per-day series (dates, zero-fill), totals, and boundary rules (start inclusive, end exclusive)
- Ensure the CI e2e job uses a Postgres service and runs in parallel with lint/unit before build/deploy
- Keep property-based tests for invariants where applicable

## Next Steps

### Immediate Priorities
1. Remove obsolete `zoho_tokens.txt` file
2. Remove `PaymentMethod` entity and update accounts to reference `PaymentProvider` directly
3. Implement user registration endpoint
4. Create creator profile endpoints
5. Add payment provider integration
6. Build transaction processing
7. OPTIONAL: Add Testcontainers-based Postgres integration tests for Insights SQL grouping
8. Replicate deterministic e2e pattern for upcoming complex endpoints (payments, transaction processing, additional analytics)

### Technical Improvements
1. Add Redis for caching
2. Implement rate limiting
3. Add comprehensive logging
4. Set up monitoring/alerting
5. Improve test coverage with mutation testing (Stryker) on analytics logic

### Feature Development
1. Payment gateway integration
2. Webhook processing
3. Analytics API (extend Creator Insights)
4. Admin dashboard API
5. Batch processing jobs

## API Endpoints

### Current Endpoints
```
POST /marketing/contactus                             - Submit contact form (with CRM integration)
GET  /marketing/landing-page-details                  - Get landing page details
POST /user/sign-in-contact                            - Create/update contact from sign-in (with CRM integration)
POST /user/cancel-onboarding                          - Mark Zoho contact when onboarding is cancelled
POST /telegram/is-channel-name-available              - Check Telegram channel name availability
POST /telegram/co-admin                               - Promote a user to co-admin (limited rights)
GET  /creator-insights/revenue-per-day                - Creator daily revenue (USD estimate) grouped by local day
GET  /accounts                                        - List verified accounts for authenticated creator
GET  /accounts/countries                              - List unique countries supported by payment providers
POST /accounts                                        - Create new account (with enhanced deleted account handling)
PATCH /accounts/:id                                   - Update existing account
POST /accounts/:id/verify                             - Verify account using SMS code
POST /accounts/:id/resend-verification                - Resend verification code
DELETE /accounts/:id                                  - Soft delete account
GET  /accounts/:id/audit-logs                         - Get audit logs for specific account (Creator access only)
GET  /health                                          - Health check
```

### Planned Endpoints
```
POST /auth/register                                   - User registration
POST /auth/login                                      - User login
GET  /auth/profile                                    - Get user profile
PUT  /auth/profile                                    - Update profile

POST /payments/initialize                             - Start payment
POST /payments/confirm                                - Confirm payment
GET  /payments/history                                - Payment history

GET  /analytics/dashboard                             - Creator analytics
GET  /analytics/transactions                          - Transaction data
```

## Environment Notes

### Local Development
- PostgreSQL on Docker
- Port 3000 for API
- Debug port 9229
- Hot reload enabled
- **Zoho Setup**: Use setup scripts for OAuth configuration

### Deployment
- Docker container ready
- Kubernetes manifests
- Environment injection
- Health checks configured
- **Environment Variables**: Secure credential management in production

## Performance Considerations
- Database connection pooling
- Async operations throughout
- Efficient query design
- Response caching needed
- CDN for static assets
- **CRM Integration**: Non-blocking, fault-tolerant design

## Security Checklist
- [x] JWT authentication
- [x] API key authentication
- [x] Input validation
- [x] SQL injection prevention
- [x] **OAuth Tokens**: Secure storage and automatic refresh
- [x] **Scoped Permissions**: Minimal required access (leads only)
- [x] **Phone Number Validation**: Prevents abuse of anonymization system
- [x] **Rate limiting**: Implemented for accounts module with appropriate limits
- [x] **Cryptographically Secure Random Generation**: Using crypto.randomInt for verification codes
- [ ] Request logging
- [ ] Security headers
- [ ] CORS configuration
- [ ] API versioning
- [ ] Audit logging

## Monitoring Setup
- Health endpoints ready
- Error tracking needed
- Performance metrics needed
- Uptime monitoring needed
- Alert configuration pending
- **CRM Integration**: Built-in health checks and status monitoring
- **Account Operations**: Comprehensive logging for restoration and anonymization events

## Testing Requirements
- ✅ Unit tests for services and controllers on all new work
- ✅ Mock external services (TypeORM, Firebase, HTTP, telegram, GCS)
- ✅ Error scenarios and edge cases covered
- ✅ Maintain 100% coverage for new code
- ✅ Property-based tests (fast-check) for analytics invariants (length, contiguity, non-negativity, rounding, totals)
- ✅ Clean test output via `jest.setup.ts`
- ✅ Deterministic, table-driven E2E tests for complex operations (see Testing Mandate)
- ✅ **Enhanced Account Creation Tests**: 26 comprehensive tests covering all scenarios including deleted account handling
- 🔜 Optional: Testcontainers integration tests for SQL grouping and mutation testing for stronger guarantees

### Notes
- Embedded Postgres script failed during e2e test run (init script exit code 1)
- **GitHub Actions Country Code Issue (RESOLVED 2025-09-27)**: Fixed intermittent e2e test failures in CI where malformed country codes (e.g., "W2c") were causing validation errors. Added filtering in AdminDevService to only use payment providers with valid ISO 3166-1 alpha-3 country codes, and added entity-level validation to prevent future data corruption.
- **Enhanced Account Creation (COMPLETED 2025-09-27)**: Successfully implemented sophisticated deleted account handling with restoration, anonymization, comprehensive logging, and full test coverage. All 26 tests pass and linter issues resolved.
- **COMPREHENSIVE AUDIT LOGGING (COMPLETED 2025-09-27)**: Implemented complete audit logging system for accounts module as recommended in SECURITY-REVIEW.md:
  - **AccountAuditLog Entity**: New audit log table with proper indexes and relationships
  - **AuditLogService**: Centralized service with 12 specialized audit event types covering all account operations
  - **Request Context Middleware**: Captures IP address, user agent, and Firebase UID for all requests
  - **Full Integration**: Audit logging integrated into all account operations (creation, updates, deletion, restoration, anonymization, verification flows)
  - **API Endpoint**: `GET /accounts/:id/audit-logs` for retrieving paginated audit logs (Creator access only)
  - **Security Features**: Phone number masking, structured logging, error resilience
  - **Complete Test Coverage**: 9 unit tests covering all audit logging scenarios
  - **Production Ready**: All linting passed, TypeScript errors resolved, comprehensive error handling
