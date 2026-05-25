# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SponsPay API is a NestJS-based platform for managing creator payments, accounts, and analytics. It integrates with multiple external services (Firebase, SendGrid, Zoho CRM, Telegram, PawaPay, Infobip) and provides comprehensive creator insights with deterministic analytics endpoints.

**Development Status**: This is a pre-production application in active development.

**CRITICAL: NO BACKWARD COMPATIBILITY REQUIRED**
- Do NOT worry about backward compatibility or breaking changes
- Prioritize clean, correct implementations over maintaining deprecated code
- Remove obsolete code immediately - there are no legacy clients to support
- Breaking changes are acceptable and encouraged if they improve the architecture

**YAGNI Principle**: Only implement what is currently needed. Do not add methods, services, or features "for future use" - add them when they're actually required. This keeps the codebase lean and reduces maintenance burden.

## Quick Start Commands

### Development
```bash
# Install dependencies
npm install

# Start development environment with Docker Compose
docker-compose up -d

# Start local dev server with hot reload
npm run start:dev

# Access services:
# - API: http://localhost:3000
# - pgAdmin: http://localhost:8080
# - API docs: http://localhost:3000/api
```

### Code Quality
```bash
# Check linting
npm run lint:check

# Fix linting issues
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

### Testing
```bash
# Run unit tests
npm test

# Run specific test file
npm test -- path/to/file.spec.ts

# Watch mode
npm run test:watch

# Test coverage
npm run test:cov

# E2E tests with Docker Postgres
npm run test:e2e

# E2E tests with embedded Postgres (no Docker)
npm run test:e2e:embedded
```

## Architecture Overview

### Module Structure
- **auth/** - Authentication strategies (API keys, JWT)
- **accounts/** - Payment account management with verification, soft-deletion, and audit logging
- **creator-insights/** - Analytics endpoints (revenue-per-day, transactions, account stats, payouts, channel stats)
- **marketing/** - Contact form and landing page endpoints
- **telegram/** - Telegram channel management and co-admin promotion with WebSocket notifications
- **zoho/** - CRM integration (contacts, leads, token management)
- **mail/** - Email service abstraction
- **transaction/** - Transaction and payment data models
- **pawapay/** - PawaPay deposit/payout integration with webhook support
- **infobip/** - SMS verification and messaging
- **health/** - Health check endpoints
- **shared/** - Common utilities, decorators, middleware
- **file-upload/** - File handling infrastructure
- **terms/** - Terms and conditions versioning

### Request Flow
```
Client → Express/NestJS → Middleware → Guards (Auth) → Controllers
→ Services → Repositories → PostgreSQL/External Services
```

### External Service Integrations
- **Firebase**: User authentication and token verification
- **SendGrid**: Transactional email
- **Zoho CRM**: Lead/contact creation from forms and sign-ins
- **Telegram**: Channel availability checks, co-admin promotion, event-driven webhook notifications
- **PawaPay**: Deposit, payout, refund processing with HMAC verification
- **Infobip**: SMS verification codes for account verification
- **Redis**: Session management, Socket.IO adapter for multi-pod WebSocket scaling

## Code Patterns & Standards

### Authentication & Authorization
- **API Key**: `@UseGuards(ApiKeyGuard)` for external service access
- **Firebase JWT**: `@UseGuards(FirebaseAuthGuard)` for authenticated users
- **Role-Based**: `@UseGuards(RolesGuard)` with `@Roles(UserRole.Creator, UserRole.Admin)` for role-scoped endpoints
- Rate limiting via `@Throttle(limit, ttl)` for vulnerable endpoints (accounts module)

### Database & Entities
- **ORM**: TypeORM with PostgreSQL
- **Pattern**: Repository pattern via `@InjectRepository(Entity)` in services
- **Soft Deletes**: Use `deletedAt: Date | null` column for logical deletion (e.g., accounts)
- **Timestamps**: `@CreateDateColumn()`, `@UpdateDateColumn()` handled automatically
- **Relationships**: Use proper FK constraints and cascade rules; explicit join relations for analytics queries
- **Transactions**: Use `DataSource.transaction()` for multi-statement operations (account creation, payout allocation)

### DTOs & Validation
- Use `class-validator` decorators: `@IsString()`, `@IsNotEmpty()`, `@IsPhoneNumber()`, etc.
- Add `@ApiProperty()` from Swagger for documentation
- Whitelist properties with `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`

### Services & Controllers
- Inject dependencies via constructor: `constructor(private readonly repo: Repository<Entity>) {}`
- Declare logger: `private readonly logger = new Logger(ClassName.name)`
- Throw NestJS exceptions: `BadRequestException`, `NotFoundException`, `ConflictException`, etc.
- Controllers: Use `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()` for Swagger documentation
- Services: Focus on business logic; log errors with context

### Error Handling
- Throw specific HTTP exceptions with descriptive messages
- Log errors with sufficient context for debugging
- Don't expose sensitive information (DB errors, stack traces) to clients
- Use guard overrides in tests to avoid external calls

### Swagger Security Documentation
- Use custom decorators from `src/decorators/api-security-docs.decorator.ts` for standardized security profiles
- Apply `@ApiSecurityProfile()` to document auth, roles, rate limits, data sensitivity, audit logging
- All 82%+ of endpoints (27/33) have comprehensive security profiles
- Reference `docs/security/ENDPOINT-SECURITY-MATRIX.md` for coverage status

## Testing Requirements

### Unit Tests
- Mock external services (Firebase, Telegram, HTTP clients, repositories)
- Use `Test.createTestingModule()` for isolated testing
- Provide `useValue` for mocked dependencies
- Test both success and error scenarios
- Aim for 100% coverage on new code

### Property-Based Tests (fast-check)
- **When**: Correctness-sensitive logic (date bucketing, rounding, aggregation, timezone offsets)
- **How**: Use `fc.assert()` with randomized inputs; validate invariants (length, contiguity, totals, rounding)
- **Example**: `src/creator-insights/creator-insights.service.property.spec.ts`
- **Current usage**: Revenue-per-day analytics

### Deterministic E2E Integration Tests
- **When**: Complex operations with database interactions (time windowing, multi-status pipelines, idempotent operations)
- **How**:
  1. Freeze time via `jest.spyOn(Date, 'now').mockReturnValue(timestamp)`
  2. Override guards/providers to inject test data and avoid network calls
  3. Seed data with raw `INSERT` statements specifying explicit FKs and timestamps
  4. Mirror service logic in `computeExpected()` helper
  5. Assert per-item values, totals, boundaries (start inclusive, end exclusive)
- **Setup**: `test/e2e.env.setup.ts` provides safe dummy env values; Postgres service in GitHub Actions
- **Current usage**: `test/creator-insights.revenue.math.e2e-spec.ts` for revenue-per-day analytics
- **CI**: E2E job runs in parallel with lint/unit; gates build/deploy on all three

### E2E Test Example Structure
```typescript
// Clock freeze
beforeAll(() => {
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-01-05T12:00:00Z').getTime());
});

// Guard/provider overrides
.overrideGuard(FirebaseAuthGuard).useValue({
  canActivate: (ctx) => { ctx.switchToHttp().getRequest().user = { user_id: 'uid', role: 'creator' }; return true; }
})

// Raw seeding with explicit FKs and timestamps
await repo.query(`INSERT INTO "transactions" (...) VALUES (...)`, [params]);

// Assertions mirror service math
const expected = computeExpected(days, tzOffset);
expect(result).toEqual(expected);
```

## Key Implementation Patterns

### Analytics Pattern (Revenue-Per-Day, Transactions, etc.)
- Timezone-stable grouping using `date_trunc('day', col + (:offset) * interval '1 minute')`
- Zero-fill missing days in the API layer (service returns fixed-length array)
- Rounding to 2 decimals per day, then per total
- Deterministic e2e tests with frozen clock to validate boundaries and totals

### Deleted Account Handling Pattern
- **Same Owner Restoration**: Deleted account restores by clearing `deletedAt`, forcing re-verification
- **Different Owner Anonymization**: Phone number replaced with all 9s, new account created with original number
- **Comprehensive Logging**: All operations logged via `AccountAuditLogService` with IP, user agent, timestamps
- **Phone Validation**: Reject phone numbers with all digits as 9 to prevent abuse

### Telegram Integration Pattern
- **Single-Use Invite Links**: Real links via `messages.exportChatInvite` (not constructed URLs)
- **Event-Driven Auto-Promotion**: Listen for `UpdateChannelParticipant` events, promote new members
- **Retry Logic**: 3 attempts with exponential backoff (1s, 5s, 15s delays)
- **WebSocket Notifications**: Emit real-time promotions via Socket.IO in `telegram` namespace
- **Management Alerts**: Email notifications on final promotion failure
- **Self-Healing**: Auto-generate missing invite links when accessed

### Multi-Pod WebSocket Scaling Pattern
- **Redis Adapter**: Socket.IO configured with `@socket.io/redis-adapter` for cross-pod broadcasting
- **Room-Based Messaging**: User-specific rooms (`user:${firebaseUid}`) work across all pods
- **Admin UI**: Socket.IO Admin UI available at `/admin` for monitoring

### Rate Limiting Pattern
- Configure `ThrottlerModule` with global and endpoint-specific limits
- Use `@Throttle(limit, ttl)` on vulnerable endpoints (account creation: 3/min, verification: 5/min, resend: 3/min)
- Mock `ThrottlerGuard` in tests with `useValue: { canActivate: () => true }`

### Account Verification Pattern
- Cryptographically secure codes via `crypto.randomInt()`
- 6-digit codes, 5-minute expiry, 20-second resend cooldown
- Infobip SMS integration for code delivery
- Verification status reset on account restoration

## Memory Bank Protocol

**CRITICAL**: The memory bank in `memory-bank/` contains project context for future sessions.

**Core Files** (read in this order):
1. `projectbrief.md` - Project scope and requirements
2. `productContext.md` - Problems solved, user goals
3. `activeContext.md` - Current work, recent changes, next steps (37KB - most important)
4. `systemPatterns.md` - Architecture, design patterns, component relationships
5. `techContext.md` - Technologies, setup, constraints, dependencies
6. `progress.md` - Status, what works, known issues, testing requirements

**Update memory bank when**:
- Discovering new project patterns or important insights
- After implementing significant changes
- User requests "update memory bank" (review all files, focus on activeContext and progress)

## Database & Environment Setup

### Docker Compose Services
```yaml
api:       Node.js app on port 3000 (hot reload enabled)
db:        PostgreSQL 17 (port 5432)
redis:     Redis server (port 6379)
pgadmin:   Web DB client (port 8080)
```

### Environment Variables
**Database**:
- `DB_HOST=localhost`, `DB_PORT=5432`, `DB_USER=filip`, `DB_PASSWORD=startervesna`, `DB_NAME=dev`, `DB_SYNC=true` (dev only)

**External Services**:
- `SERVICE_ACCOUNT`, `SERVICE_ACCOUNT_PRIVATE_KEY`, `SERVICE_ACCOUNT_USER` - API key auth
- `SENDGRID_API_KEY` - Email delivery
- `FIREBASE_SERVICE_ACCOUNT` - User authentication
- `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_REDIRECT_URI` - CRM
- `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_SESSION_STRING` - Telegram channel management
- `PAWAPAY_API_TOKEN` - Payment processing
- `INFOBIP_API_KEY` - SMS verification
- `REDIS_URL=redis://redis:6379` - Session/WebSocket scaling
- `EXCHANGE_RATE_API_KEY` - Currency conversion
- `ANONYMIZATION_SALT` - Account phone anonymization
- `MANAGEMENT_EMAIL` - Telegram promotion failure alerts

### Database Migrations
**IMPORTANT**: Currently using `DB_SYNC=true` in development. All entity changes are automatically synchronized to the database. **DO NOT generate or run migrations** - schema changes happen automatically on application restart.

```bash
# Migration commands (NOT CURRENTLY USED - auto-sync is enabled)
# npm run migration:generate -- -n MigrationName
# npm run migration:run
# npm run migration:revert
```

## Security Checklist

- [x] JWT authentication with Firebase
- [x] API key authentication with domain validation
- [x] Role-based access control (Admin > Creator > Fan)
- [x] Input validation via DTOs and class-validator
- [x] SQL injection prevention via TypeORM/parameterized queries
- [x] Rate limiting on sensitive endpoints (accounts module)
- [x] Cryptographically secure code generation (`crypto.randomInt()`)
- [x] Phone number validation and anonymization
- [x] Comprehensive audit logging for account operations
- [x] Request context capture (IP, user agent, Firebase UID)
- [x] Swagger security documentation with `@ApiSecurityProfile()`
- [ ] API versioning (future)
- [ ] Security headers (future)
- [ ] CORS configuration hardening (future)

## Deployment

### Docker
```bash
# Build production image
docker build -t api-production .

# Run with production environment
docker run -p 3000:3000 --env-file .env api-production
```

### Kubernetes
- Manifests in `k8s/` with Kustomize base/overlays for dev/prod
- Environment-specific configurations (replicas, resources, logging)
- Health checks via `/health` endpoint
- Redis StatefulSet for WebSocket multi-pod scaling
- Google Managed Certificates for SSL

## Known Issues & Next Steps

### Known Issues
- Obsolete `zoho_tokens.txt` file needs removal
- `PaymentMethod` entity deprecated; refactor accounts to reference `PaymentProvider` directly

### Immediate Priorities
1. Remove obsolete files
2. Complete PaymentMethod → PaymentProvider refactoring
3. Implement user registration endpoint
4. Build transaction processing and settlement workflows
5. Enhance monitoring and alerting

## Google Cloud Log Analysis

When the user asks to analyze logs, use `gcloud logging read` against the GKE cluster.

### Setup
- **GCP Project**: `sponspay-deployment`
- **Cluster**: `dev` (region: `us-east1`)
- **Auth**: `filip@sponspay.com`
- **Namespace (dev)**: `sponspay-api-dev`
- **Namespace (prod)**: `sponspay-api-prod` (if exists)

### Key Queries

```bash
# Recent API logs (exclude health check noise)
gcloud logging read \
  'resource.labels.namespace_name="sponspay-api-dev" AND resource.labels.container_name="api" AND NOT textPayload:("GoogleHC" OR "/health")' \
  --limit=100 --format="json" --freshness=5d

# Errors only (excluding Redis retry stacktrace noise)
gcloud logging read \
  'resource.labels.namespace_name="sponspay-api-dev" AND resource.labels.container_name="api" AND severity>=ERROR AND NOT textPayload:("at TCP" OR "callbackTrampoline" OR "port:" OR "address:" OR "syscall:" OR "errno:")' \
  --limit=200 --format="json" --freshness=5d

# Warnings (useful for slow queries, Telegram issues, YouTube auth)
gcloud logging read \
  'resource.labels.namespace_name="sponspay-api-dev" AND resource.labels.container_name="api" AND textPayload:("WARN") AND NOT textPayload:("DeprecationWarning")' \
  --limit=200 --format="json" --freshness=5d

# Application restarts
gcloud logging read \
  'resource.labels.namespace_name="sponspay-api-dev" AND resource.labels.container_name="api" AND textPayload:("NestApplication" OR "NestFactory" OR "Started reconnecting")' \
  --limit=50 --format="json" --freshness=5d

# Business logic only (Telegram, PawaPay, accounts, transactions)
gcloud logging read \
  'resource.labels.namespace_name="sponspay-api-dev" AND resource.labels.container_name="api" AND (textPayload:("Telegram" OR "PawaPay" OR "Account" OR "Transaction" OR "Zoho" OR "YouTube")) AND NOT textPayload:("RouterExplorer" OR "RoutesResolver" OR "InstanceLoader")' \
  --limit=200 --format="json" --freshness=5d
```

### Analysis Tips
- Pipe `--format="json"` output into `python3 -c` for aggregation (Counter by day, by module, by error type)
- Strip ANSI codes from `textPayload` with `re.sub(r'\x1b\[[0-9;]*m', '', payload)` for clean output
- Extract NestJS module names with `re.search(r'\[38;5;3m\[([^\]]+)\]', payload)`
- The `--freshness=Nd` flag controls the time window
- **Container names**: `api` (main app), `pgadmin`, `redis`
- **Known noisy patterns**: Redis ECONNREFUSED during restarts (retry 1-40), GoogleHC health checks, TypeORM schema sync queries
- **Recurring issues to watch**: I18n ENOENT (`i18n.generated.ts` missing in Docker), Telegram MTProto disconnects (auto-reconnects), slow `SELECT 1` keepalive queries (>1s)

## Useful Documentation

- Full docs: `docs/` directory
- API docs: `http://localhost:3000/api` (Swagger/Scalar UI)
- Security matrix: `docs/security/ENDPOINT-SECURITY-MATRIX.md`
- Creator onboarding flow: `docs/integrations/creator-onboarding-flow.md`
- Development workflow: `docs/development/workflow.md`
- Database guide: `docs/nestjs-features/database-typeorm.md`
