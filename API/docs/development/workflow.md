# Development Workflow

## Available Scripts

This project includes a comprehensive set of npm scripts for development, testing, and deployment workflows.

### Development Scripts

```json
// From package.json
{
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug 0.0.0.0:9229 --watch",
    "start:prod": "node dist/main"
  }
}
```

#### Development Commands

```bash
# Start development server with hot reload
npm run start:dev

# Start with debugging enabled
npm run start:debug

# Build the application
npm run build

# Start production build
npm run start:prod
```

### Code Quality Scripts

```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "lint:check": "eslint \"{src,apps,libs,test}/**/*.ts\"",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
  }
}
```

#### Code Quality Commands

```bash
# Format code with Prettier
npm run format

# Check for linting issues
npm run lint:check

# Fix linting issues automatically
npm run lint
```

### Testing Scripts

```json
{
  "scripts": {
    "test": "jest --silent",
    "test:watch": "jest --watch --silent",
    "test:cov": "jest --coverage --silent",
    "test:debug": "JEST_DEBUG=true node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:verbose": "jest --verbose",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

#### Testing Commands

```bash
# Run all unit tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:cov

# Run end-to-end tests
npm run test:e2e

# Debug tests
npm run test:debug

# Run tests with verbose output
npm run test:verbose
```

## Development Environment Setup

### Prerequisites

```bash
# Required software
Node.js >= 18.x
npm >= 8.x
PostgreSQL >= 13.x
Docker (optional, for containerized development)
```

### Initial Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd api

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Configure environment variables
# Edit .env.local with your local settings

# 5. Start development server
npm run start:dev
```

### Environment Configuration

```bash
# .env.local - Local development configuration
NODE_ENV=development
NODE_PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database
DB_SYNC=true  # Only for development

# External services (use test/sandbox versions)
SENDGRID_API_KEY=your_test_key
FIREBASE_SERVICE_ACCOUNT='{"test": "config"}'
ZOHO_ENVIRONMENT=sandbox
```

## Development Workflow

### Daily Development Process

```bash
# 1. Start your day
git pull origin main
npm install  # In case dependencies changed

# 2. Create feature branch
git checkout -b feature/new-feature-name

# 3. Start development server
npm run start:dev

# 4. Make changes and test
# - Edit code
# - Server automatically reloads
# - Run tests: npm test

# 5. Check code quality
npm run lint
npm run format

# 6. Run full test suite
npm run test:cov
npm run test:e2e

# 7. Commit changes
git add .
git commit -m "feat: add new feature"

# 8. Push and create PR
git push origin feature/new-feature-name
```

### Hot Reload Development

The development server (`npm run start:dev`) provides:

- **Automatic restart** when TypeScript files change
- **Fast compilation** with incremental builds
- **Error reporting** in the terminal
- **Debug output** for development

```bash
# Start with hot reload
npm run start:dev

# Output example:
# [Nest] 12345  - 01/01/2023, 10:00:00 AM     LOG [NestFactory] Starting Nest application...
# [Nest] 12345  - 01/01/2023, 10:00:00 AM     LOG [InstanceLoader] AppModule dependencies initialized
# [Nest] 12345  - 01/01/2023, 10:00:00 AM     LOG [NestApplication] Nest application successfully started
```

### Debugging

#### VS Code Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug NestJS",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/main.ts",
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

#### Command Line Debugging

```bash
# Start with debugger attached
npm run start:debug

# Connect with Chrome DevTools
# Open chrome://inspect in Chrome
# Click "Open dedicated DevTools for Node"

# Debug tests
npm run test:debug
```

#### Debugging Tips

```typescript
// Add breakpoints in code
debugger;

// Use console.log for quick debugging
console.log('Debug value:', variable);

// Use NestJS Logger for structured logging
import { Logger } from '@nestjs/common';

const logger = new Logger('ServiceName');
logger.debug('Debug message');
logger.error('Error message', error.stack);
```

## Code Quality Workflow

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    '@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
```

### Prettier Configuration

```json
// .prettierrc
{
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 80,
  "endOfLine": "lf"
}
```

### Pre-commit Hooks (Optional)

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,js}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

## Database Development

### Local Database Setup

```bash
# Using Docker (recommended)
docker run --name postgres-dev \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=myapp_dev \
  -p 5432:5432 \
  -d postgres:13

# Or install PostgreSQL locally
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
```

### Database Migrations

```bash
# Generate migration from entity changes
npm run typeorm migration:generate -- -n MigrationName

# Create empty migration
npm run typeorm migration:create -- -n MigrationName

# Run migrations
npm run typeorm migration:run

# Revert last migration
npm run typeorm migration:revert
```

### Database Seeding

```typescript
// scripts/seed.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UserService } from '../src/user/user.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);

  // Create test users
  await userService.create({
    firebaseUid: 'test-uid-1',
    userHandle: 'testuser1',
  });

  await app.close();
}

seed().catch(console.error);
```

```bash
# Run seeding script
npx ts-node scripts/seed.ts
```

## API Development

### Testing API Endpoints

```bash
# Using curl
curl -X POST http://localhost:3000/marketing/contactus \
  -H "Content-Type: application/json" \
  -H "Api-Key: your-api-key" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "interest": "creator",
    "message": "Test message that meets minimum length",
    "country": "US"
  }'

# Using HTTPie (if installed)
http POST localhost:3000/marketing/contactus \
  Api-Key:your-api-key \
  firstName=John \
  lastName=Doe \
  email=john@example.com \
  interest=creator \
  message="Test message that meets minimum length" \
  country=US
```

### API Documentation

```bash
# Start development server
npm run start:dev

# Access interactive API documentation
open http://localhost:3000/documentation
```

### Postman Collection

Create a Postman collection for API testing:

```json
{
  "info": {
    "name": "API Development",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "apiKey",
      "value": "your-development-api-key"
    }
  ]
}
```

## Docker Development

### Development with Docker Compose

```yaml
# docker-compose.yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres

  postgres:
    image: postgres:13
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: myapp_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop environment
docker-compose down
```

## Performance Monitoring

### Development Monitoring

```typescript
// Add performance logging in development
import { Logger } from '@nestjs/common';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(`${request.method} ${request.url} - ${duration}ms`);
      }),
    );
  }
}
```

### Memory Usage Monitoring

```typescript
// Monitor memory usage in development
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Memory Usage:');
  for (let key in used) {
    console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }
}, 30000); // Every 30 seconds
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or use different port
NODE_PORT=3001 npm run start:dev
```

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
ps aux | grep postgres

# Check connection
psql -h localhost -p 5432 -U username -d database

# Reset database
dropdb database_name
createdb database_name
```

#### Module Resolution Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear NestJS build cache
rm -rf dist
npm run build
```

#### TypeScript Compilation Issues
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Restart TypeScript service in VS Code
# Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

### Debug Logging

```typescript
// Enable debug logging in development
// .env.local
LOG_LEVEL=debug

// In code
import { Logger } from '@nestjs/common';

const logger = new Logger('DebugContext');
logger.debug('Debug information', { data: someData });
```

## Git Workflow

### Branch Naming Convention

```bash
# Feature branches
feature/user-authentication
feature/email-notifications

# Bug fixes
bugfix/fix-validation-error
bugfix/resolve-memory-leak

# Hotfixes
hotfix/critical-security-patch

# Chores
chore/update-dependencies
chore/improve-documentation
```

### Commit Message Convention

```bash
# Format: type(scope): description

feat(auth): add JWT authentication
fix(validation): resolve email validation issue
docs(api): update endpoint documentation
test(user): add user service unit tests
refactor(database): optimize query performance
chore(deps): update dependencies
```

### Pull Request Process

1. **Create feature branch**
2. **Make changes with tests**
3. **Run quality checks**
4. **Create pull request**
5. **Code review**
6. **Merge to main**

```bash
# Before creating PR
npm run lint
npm run test:cov
npm run test:e2e
npm run build
```

## Next Steps

- Learn about [Testing Setup](./testing.md)
- Understand [Project Structure](../architecture/project-structure.md)
- Explore [Environment Configuration](../configuration/environment-config.md)

---

*A smooth development workflow increases productivity and code quality. Follow these established patterns and use the provided scripts for consistent development experience.*