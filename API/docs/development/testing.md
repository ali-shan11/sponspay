# Testing Setup

## Testing Philosophy

This project uses Jest as the primary testing framework with comprehensive unit and integration testing strategies. The testing approach focuses on reliability, maintainability, and confidence in code changes.

## Testing Stack

- **Jest**: Primary testing framework
- **Supertest**: HTTP assertion library for integration tests
- **NestJS Testing**: Built-in testing utilities
- **TypeORM Testing**: Database testing utilities

## Jest Configuration

### Main Jest Configuration

```json
// From package.json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "setupFilesAfterEnv": ["<rootDir>/../jest.setup.ts"],
    "silent": false,
    "verbose": false
  }
}
```

### E2E Testing Configuration

```json
// test/jest-e2e.json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

### Jest Setup File

```typescript
// jest.setup.ts
// Global test setup and configuration
import { ConfigModule } from '@nestjs/config';

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);

// Mock external services in tests
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));
```

## Unit Testing Patterns

### Service Testing

```typescript
// Example: marketing.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingService } from './marketing.service';
import { ContactUs } from './entities/contact-us.entity';
import { MailService } from '../mail/mail.service';
import { ContactUsDTO } from './dto/contact-us.dto';

describe('MarketingService', () => {
  let service: MarketingService;
  let repository: Repository<ContactUs>;
  let mailService: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingService,
        {
          provide: getRepositoryToken(ContactUs),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendContactUsEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MarketingService>(MarketingService);
    repository = module.get<Repository<ContactUs>>(getRepositoryToken(ContactUs));
    mailService = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processContactUsRequest', () => {
    it('should process contact us request successfully', async () => {
      const contactUsDto: ContactUsDTO = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        interest: 'creator',
        message: 'Test message that is long enough',
        country: 'US',
      };

      const savedEntity = { id: '1', ...contactUsDto };
      
      jest.spyOn(repository, 'create').mockReturnValue(savedEntity as any);
      jest.spyOn(repository, 'save').mockResolvedValue(savedEntity as any);
      jest.spyOn(mailService, 'sendContactUsEmail').mockResolvedValue(undefined);

      const result = await service.processContactUsRequest(contactUsDto);

      expect(repository.create).toHaveBeenCalledWith(contactUsDto);
      expect(repository.save).toHaveBeenCalledWith(savedEntity);
      expect(mailService.sendContactUsEmail).toHaveBeenCalledWith(contactUsDto);
      expect(result).toEqual(savedEntity);
    });

    it('should handle email service failure gracefully', async () => {
      const contactUsDto: ContactUsDTO = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        interest: 'creator',
        message: 'Test message that is long enough',
        country: 'US',
      };

      const savedEntity = { id: '1', ...contactUsDto };
      
      jest.spyOn(repository, 'create').mockReturnValue(savedEntity as any);
      jest.spyOn(repository, 'save').mockResolvedValue(savedEntity as any);
      jest.spyOn(mailService, 'sendContactUsEmail').mockRejectedValue(new Error('Email service error'));

      // Should still save to database even if email fails
      const result = await service.processContactUsRequest(contactUsDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(savedEntity);
    });
  });
});
```

### Controller Testing

```typescript
// Example: marketing.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { ContactUsDTO } from './dto/contact-us.dto';

describe('MarketingController', () => {
  let controller: MarketingController;
  let service: MarketingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingController],
      providers: [
        {
          provide: MarketingService,
          useValue: {
            processContactUsRequest: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MarketingController>(MarketingController);
    service = module.get<MarketingService>(MarketingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendContactUsEmail', () => {
    it('should call service with correct parameters', async () => {
      const contactUsDto: ContactUsDTO = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        interest: 'creator',
        message: 'Test message that is long enough',
        country: 'US',
      };

      const expectedResult = { id: '1', ...contactUsDto };
      jest.spyOn(service, 'processContactUsRequest').mockResolvedValue(expectedResult as any);

      const result = await controller.sendContactUsEmail(contactUsDto);

      expect(service.processContactUsRequest).toHaveBeenCalledWith(contactUsDto);
      expect(result).toEqual(expectedResult);
    });
  });
});
```

### Guard Testing

```typescript
// Example: api-key.guard.spec.ts
import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyGuard } from './api-key.guard';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let authService: AuthService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: AuthService,
          useValue: {
            validateApiKey: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow valid API key', async () => {
      const mockContext = createMockExecutionContext({
        headers: { 'api-key': 'valid-key' },
      });

      jest.spyOn(authService, 'validateApiKey').mockResolvedValue(true);
      jest.spyOn(configService, 'get').mockReturnValue('[]');

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should reject invalid API key', async () => {
      const mockContext = createMockExecutionContext({
        headers: { 'api-key': 'invalid-key' },
      });

      jest.spyOn(authService, 'validateApiKey').mockResolvedValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('[]');

      await expect(guard.canActivate(mockContext)).rejects.toThrow();
    });
  });
});

// Helper function for creating mock execution context
function createMockExecutionContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}
```

## Integration Testing

### E2E Testing Setup

```typescript
// test/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();
    
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await dataSource.query('DELETE FROM contact_us');
    await dataSource.query('DELETE FROM users');
  });

  describe('/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('/marketing/contactus (POST)', () => {
    it('should accept valid contact us request', () => {
      return request(app.getHttpServer())
        .post('/marketing/contactus')
        .set('Api-Key', 'test-api-key')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          interest: 'creator',
          message: 'This is a test message that meets the minimum length requirement',
          country: 'US',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.firstName).toBe('John');
          expect(res.body.email).toBe('john@example.com');
        });
    });

    it('should reject request without API key', () => {
      return request(app.getHttpServer())
        .post('/marketing/contactus')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          interest: 'creator',
          message: 'This is a test message',
          country: 'US',
        })
        .expect(401);
    });

    it('should reject invalid email format', () => {
      return request(app.getHttpServer())
        .post('/marketing/contactus')
        .set('Api-Key', 'test-api-key')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email',
          interest: 'creator',
          message: 'This is a test message that meets the minimum length requirement',
          country: 'US',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('email must be an email');
        });
    });

    it('should reject message that is too short', () => {
      return request(app.getHttpServer())
        .post('/marketing/contactus')
        .set('Api-Key', 'test-api-key')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          interest: 'creator',
          message: 'Short',
          country: 'US',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('message must be longer than or equal to 10 characters');
        });
    });
  });
});
```

### Database Testing

```typescript
// Example: Database integration test
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../src/user/entities/user.entity';
import { UserService } from '../src/user/user.service';

describe('UserService (Database Integration)', () => {
  let service: UserService;
  let repository: Repository<User>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>('UserRepository');
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await repository.clear();
  });

  it('should create and retrieve user', async () => {
    const userData = {
      firebaseUid: 'test-firebase-uid',
      userHandle: 'testuser',
    };

    const createdUser = await service.create(userData);
    expect(createdUser.id).toBeDefined();
    expect(createdUser.firebaseUid).toBe(userData.firebaseUid);

    const foundUser = await service.findOne(createdUser.id);
    expect(foundUser).toEqual(createdUser);
  });

  it('should enforce unique constraints', async () => {
    const userData = {
      firebaseUid: 'test-firebase-uid',
      userHandle: 'testuser',
    };

    await service.create(userData);

    // Attempt to create user with same firebaseUid should fail
    await expect(service.create(userData)).rejects.toThrow();
  });
});
```

## Testing Utilities

### Mock Factories

```typescript
// test/factories/user.factory.ts
import { User } from '../../src/user/entities/user.entity';

export class UserFactory {
  static create(overrides: Partial<User> = {}): User {
    const user = new User();
    user.id = overrides.id || 'test-id';
    user.firebaseUid = overrides.firebaseUid || 'test-firebase-uid';
    user.userHandle = overrides.userHandle || 'testuser';
    return user;
  }

  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({ ...overrides, userHandle: `testuser${index}` })
    );
  }
}
```

### Test Helpers

```typescript
// test/helpers/test-helpers.ts
import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

export function createMockExecutionContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

export async function createTestModule(providers: any[], imports: any[] = []): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'sqlite',
        database: ':memory:',
        autoLoadEntities: true,
        synchronize: true,
      }),
      ...imports,
    ],
    providers,
  }).compile();
}

export function mockRepository() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    })),
  };
}
```

## Test Scripts

### Package.json Scripts

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

### Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test -- marketing.service.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="should process contact"

# Debug tests
npm run test:debug
```

## Coverage Configuration

### Coverage Thresholds

```json
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
  ],
};
```

## Testing Best Practices

### 1. Test Structure (AAA Pattern)

```typescript
it('should process contact us request successfully', async () => {
  // Arrange
  const contactUsDto = { /* test data */ };
  const expectedResult = { /* expected result */ };
  jest.spyOn(service, 'method').mockResolvedValue(expectedResult);

  // Act
  const result = await controller.method(contactUsDto);

  // Assert
  expect(service.method).toHaveBeenCalledWith(contactUsDto);
  expect(result).toEqual(expectedResult);
});
```

### 2. Descriptive Test Names

```typescript
// Good: Descriptive test names
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', () => {});
    it('should throw error when email already exists', () => {});
    it('should hash password before saving', () => {});
  });
});
```

### 3. Test Isolation

```typescript
// Each test should be independent
beforeEach(() => {
  jest.clearAllMocks();
  // Reset any shared state
});
```

### 4. Mock External Dependencies

```typescript
// Mock external services
jest.mock('@sendgrid/mail');
jest.mock('firebase-admin');

// Use dependency injection for testability
const mockMailService = {
  send: jest.fn().mockResolvedValue(true),
};
```

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:cov
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USER: postgres
          DB_PASSWORD: test
          DB_NAME: test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Next Steps

- Learn about [Development Workflow](./workflow.md)
- Understand [Project Structure](../architecture/project-structure.md)
- Explore [Database Integration](../nestjs-features/database-typeorm.md)

---

*Comprehensive testing ensures code reliability and confidence in changes. Follow the testing patterns established in this project for consistency and maintainability.*