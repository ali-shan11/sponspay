# Agent Guide for API Codebase

## Guidelines

Check the CLAUDE.md file for guidelines

## Memory Bank Protocol

**CRITICAL**: Read ALL memory bank files in `memory-bank/` at the start of EVERY task. These files are your only connection to previous work and project context.

### Core Files (Required Reading)

1. **projectbrief.md** - Project scope and requirements (foundation)
2. **productContext.md** - Why this exists, problems solved, user goals
3. **activeContext.md** - Current work, recent changes, next steps, key patterns
4. **systemPatterns.md** - Architecture, design patterns, component relationships
5. **techContext.md** - Technologies, setup, constraints, dependencies
6. **progress.md** - Status, what works, what's left, known issues

### Update Memory Bank When:

- Discovering new project patterns or important insights
- After implementing significant changes
- User requests "update memory bank" (review ALL files, focus on activeContext.md and progress.md)
- Context needs clarification for future sessions

## Build/Lint/Test Commands

- **Build**: `npm run build`
- **Lint Check**: `npm run lint:check` (run `npm run lint` to auto-fix)
- **Format**: `npm run format` (Prettier)
- **Unit Tests**: `npm test` (single file: `npm test -- path/to/file.spec.ts`)
- **E2E Tests**: `npm run test:e2e` or `npm run test:e2e:embedded` (no Docker)
- **Test Coverage**: `npm run test:cov`
- **Dev Mode**: `npm run start:dev` (with Docker: `docker-compose up -d`)

## Code Style & Conventions

- **TypeScript**: Strict mode enabled (`strictNullChecks`, `noImplicitAny`)
- **Formatting**: Single quotes, trailing commas (Prettier enforced)
- **Imports**: NestJS decorators first, then external libs, then local modules (group by @nestjs/common, entities, DTOs, services)
- **Naming**: PascalCase for classes/interfaces/DTOs, camelCase for variables/functions, kebab-case for files
- **DTOs**: Use `class-validator` decorators (`@IsString`, `@IsNotEmpty`) and `@ApiProperty` from Swagger
- **Services**: Inject dependencies via constructor, use `@Injectable()`, declare `private readonly logger = new Logger(ClassName.name)`
- **Error Handling**: Throw NestJS exceptions (`BadRequestException`, `NotFoundException`, etc.), log errors with context
- **Types**: Explicit return types optional but use TypeORM entities, avoid `any` where possible
- **Database**: TypeORM with repositories, use `@InjectRepository()` for injection, transactions via `DataSource`
- **Controllers**: Use `@ApiTags`, `@ApiOperation`, `@ApiResponse` for Swagger docs, guards for auth (`@UseGuards()`)
- **Testing**: Mock external services (Firebase, Infobip, Zoho), use supertest for e2e, Jest for unit tests
