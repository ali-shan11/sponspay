# SponsPay API - Technical Context

## Technology Stack

### Core Framework
- NestJS 11.1.6: Enterprise-grade Node.js framework (upgraded from v10 on 2025-10-02)
- TypeScript 5.1.3: Type-safe development
- Node.js 20.x: Runtime (CI uses Node 20, required minimum for NestJS 11)
- Express v5: HTTP server framework (upgraded with NestJS 11)

### Database & ORM
- PostgreSQL (local via Docker Compose, CI via Actions service, Postgres 16)
- TypeORM 0.3.20: Object-relational mapping
- DB_SYNC: The database schema is automatically synchronized. Migrations are not currently in use.

### Authentication & Security
- Firebase Admin SDK 12.7.0: User authentication
- Passport.js: Authentication middleware
- JWT: Token-based authentication
- bcrypt: Password hashing
- API Key Strategy: Service authentication

### External Services
- SendGrid 8.1.4: Email delivery service
- Google Cloud Storage 7.14.0: File storage
- Google Auth Library: OAuth integration
- Zoho CRM Integration (direct REST)
- Telegram 2.26.x: Telegram API integration

### Development Tools
- Jest: Testing framework
- fast-check: Property-based testing for randomized scenarios and invariant checks
- ESLint: Code linting
- Prettier: Code formatting
- Docker: Containerization
- Kubernetes: Container orchestration
- GitHub Actions: CI/CD workflows (parallel lint/unit/e2e + deploy)

### Additional Libraries
- class-validator: DTO validation
- class-transformer: Object transformation
- nestjs-i18n: Internationalization
- date-fns: Date manipulation
- uuid: Unique identifier generation
- joi: Schema validation

## Project Structure

```
src/
├── api-key/              # API key management
├── auth/                 # Authentication logic
│   ├── guards/
│   ├── strategies/
│   └── interfaces/
├── creators-insights/    # Analytics endpoints and logic
├── decorators/           # Custom decorators
├── file-upload/          # File handling
├── firebase/             # Firebase integration
├── health/               # Health checks
├── mail/                 # Email services
├── marketing/            # Marketing endpoints
│   ├── dto/
│   └── entities/
├── sendgrid/             # SendGrid integration
├── shared/               # Shared utilities
├── terms/                # Terms and conditions
├── transaction/          # Transactions / seeders / entities
├── user/                 # User management
│   ├── dto/
│   ├── entities/
│   └── enums/
└── main.ts              # Application entry
```

## Development Setup

### Prerequisites
- Node.js 20.x
- Docker & Docker Compose (for local Postgres)
- Firebase project
- SendGrid account
- Google Cloud project

### Local Development
```bash
npm install                 # Install dependencies
docker compose up -d db     # Start local Postgres 16
npm run start:dev           # Development server with watch
npm run start:debug         # Debug mode on 0.0.0.0:9229
npm run test                # Run unit tests
npm run test:e2e            # Run E2E tests
npm run lint                # Fix lint issues
npm run lint:check          # Check lint issues
```

### Environment Variables
```env
# Database (dev example)
DB_HOST=localhost
DB_PORT=5432
DB_USER=filip
DB_PASSWORD=startervesna
DB_NAME=dev
DB_SYNC=true

# Firebase
FIREBASE_SERVICE_ACCOUNT=...
FIREBASE_CHECK_REVOKED=false

# SendGrid
SENDGRID_API_KEY=...

# Zoho
ZOHO_CLIENT_ID=...
ZOHO_CLIENT_SECRET=...
ZOHO_REDIRECT_URI=http://localhost:3000/oauth/callback
ZOHO_REFRESH_TOKEN=
ZOHO_ENVIRONMENT=production

# Telegram
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_SESSION_STRING=

# Misc
TIMEZONE_API_URL=https://timeapi.io/
PHOTOS_BUCKET='sponspay-dev-images'
```

## API Architecture

### Module System
- Feature-based modules
- Dependency injection
- Singleton services
- Modular configuration

### Request Pipeline
1. HTTP Request
2. Middleware (CORS, etc.)
3. Guards (Auth check)
4. Interceptors
5. Controller
6. Service Layer
7. Database/External Service
8. Response Transformation

### Error Handling
- Global exception filter (planned)
- Custom error classes
- Consistent error format
- Logging integration (planned)

## Database Design

### Key Entities
- User: Core account with role hierarchy
- ApiKey: API authentication
- ContactUs: Marketing inquiries
- Transactions/Currency/PaymentProvider/TransactionStatus: Financial data
- Terms/AcceptedTerms: Versioned terms and acceptances

### Relationships
- User -> Transactions (1:N)
- Transactions -> Currency, PaymentProvider, Status (N:1)

### Migrations
- Not currently in use. The database is synchronized automatically via the `DB_SYNC` environment variable.

## Security Implementation

### Authentication Flow
- Firebase JWT via guard/strategy
- API Key strategy for service-to-service endpoints

### API Protection
- Route-level guards
- Role-based access control
- Input validation
- Rate limiting (planned)

## Testing Strategy

### Unit Tests
- Service layer testing
- Controller testing
- Mock dependencies (TypeORM repositories, external providers)
- Coverage targets for new code (100%)

### Property-Based Tests (fast-check)
- Purpose: Generate randomized inputs (e.g., days, tzOffsetMinutes, synthetic series) and assert invariants:
  - series length equals requested days
  - dates are contiguous and align with local window startDate/endDate
  - per-day values are non-negative and rounded to 2 decimals
  - grand total equals the sum of per-day values
- Current usage: Creator Insights revenue-per-day analytics
  - File: `src/creator-insights/creator-insights.service.property.spec.ts`
  - Runs 10–50+ scenarios per run to catch off-by-one and timezone grouping regressions

### Deterministic E2E Integration Tests (Policy)
For correctness-sensitive operations (time windowing, rounding, currency/FX handling, grouping/binning, multi-status pipelines, idempotency), we will:
- Freeze time with `jest.spyOn(Date, 'now')` (services must use `Date.now()` for “now” to honor this)
- Bootstrap a test-only environment to satisfy ConfigModule and avoid external network calls:
  - Jest `setupFiles` -> `test/e2e.env.setup.ts` to set DB_* and dummy third-party credentials
  - Override providers/guards for external dependencies (FirebaseAuthGuard, RolesGuard, FirebaseAdminService, TelegramClient)
- Seed data deterministically with a single raw INSERT specifying:
  - amount, usdEstimatedValue, currencyId, messageId, beneficiaryId, payerFullName, payerPhone, paymentMethodId, statusId, invoiceId, createdAt, updatedAt
  - Ensures `@CreateDateColumn` does not override timestamps
- Mirror service windowing/grouping/rounding in a test-side `computeExpected` helper:
  - Use epoch-day math for window [startLocalInclusive, endLocalExclusive), per-day labels, and bucket selection
  - Round per-day buckets and totals to 2 decimals
- Validate:
  - Dates and zero-fill across the fixed-length day series
  - Boundary behavior: start inclusive, end exclusive
  - Timezone shifts redistribute to neighboring days correctly
  - Total invariance for interior transactions across offsets

Current deterministic e2e suite:
- File: `test/creator-insights.revenue.math.e2e-spec.ts`
- Scenarios S1–S8 covering sums, multi-day zero-fill, tz shifts, boundaries, and totals invariance

## CI E2E Setup

### GitHub Actions Workflow
- File: `.github/workflows/ci.yaml`
- Jobs:
  - lint: ESLint check
  - unit: Jest unit tests
  - e2e: Jest e2e tests with Postgres service
  - build_and_deploy: Requires [lint, unit, e2e] to succeed; builds and deploys to GKE via kustomize

### E2E Job (Actions) Configuration
- services.postgres: `postgres:16` with health checks
- Environment:
  - `DB_HOST=127.0.0.1`, `DB_PORT=5432`, `DB_USER=postgres`, `DB_PASSWORD=postgres`, `DB_NAME=postgres`, `DB_SYNC=true`
  - Provide safe dummy values for all required ConfigModule env keys (Firebase, Sendgrid, Zoho, Telegram, etc.)
- Steps:
  - Checkout, setup-node (Node 20), `npm ci`, `npm run test:e2e`

### Local E2E Setup
- Start Postgres locally via `docker compose up -d db`
- `npm run test:e2e` will:
  - Load `test/e2e.env.setup.ts` to populate env for ConfigModule
  - Use the same deterministic overrides/clock freezing as CI

## Performance Optimization

### Current Optimizations
- Connection pooling (pg defaults)
- Async/await patterns
- Efficient SQL for grouping (date_trunc)

### Planned Improvements
- Redis caching
- Query optimization and indices
- Response compression
- CDN integration

## Deployment Configuration

### Docker Setup
- Multi-stage builds
- Optimized images
- Health checks
- Environment injection

### Kubernetes
- Deployment manifests with Kustomize overlays (dev/prod)
- Service definitions
- ConfigMaps
- Secrets management

### CI/CD Pipeline
- Parallel lint, unit, e2e
- Docker build & push
- K8s deployment (GKE), rollout status checks

## Monitoring & Logging

### Health Checks
- `/health` endpoint
- Database connectivity
- External service status (planned)

### Logging Strategy
- Structured logging (planned)
- Log levels
- Error tracking (planned)
- Performance metrics (planned)

## API Documentation

### OpenAPI/Swagger
- Auto-generated docs
- Scalar UI integration
- Request/response examples
- Authentication docs

### Endpoint Conventions
- RESTful design
- Consistent naming
- Version planning (planned)
- Status codes
