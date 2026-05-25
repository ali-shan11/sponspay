# Environment Configuration

## What is Environment Configuration?

Environment configuration allows your application to behave differently based on the environment it's running in (development, staging, production). It manages sensitive data like API keys, database credentials, and feature flags.

## Why Use Environment Configuration?

- **Security**: Keep sensitive data out of source code
- **Flexibility**: Different settings for different environments
- **Validation**: Ensure required configuration is present
- **Type Safety**: Strongly typed configuration access
- **Documentation**: Self-documenting configuration schema

## Configuration Setup in This Project

### Global Configuration Module

```typescript
// From app.module.ts
ConfigModule.forRoot({
  isGlobal: true,  // Available throughout the application
  validationSchema: Joi.object({
    // Comprehensive validation schema
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development')
      .required(),
    NODE_PORT: Joi.number().default(3000),
    
    // Database Configuration
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().default(5432),
    DB_USER: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_NAME: Joi.string().required(),
    DB_SYNC: Joi.boolean().default(false),
    
    // Authentication & Security
    SERVICE_ACCOUNT: Joi.string().required(),
    SERVICE_ACCOUNT_PRIVATE_KEY: Joi.string().required(),
    SERVICE_ACCOUNT_USER: Joi.string().required(),
    API_KEY_ALLOWED_DOMAINS: Joi.string().required(),
    
    // Email Configuration
    SENDGRID_API_KEY: Joi.string().required(),
    FROM_EMAIL: Joi.string().required().email(),
    CONTACT_US_EMAIL: Joi.string().required().email(),
    
    // Firebase Configuration
    FIREBASE_SERVICE_ACCOUNT: Joi.string().required(),
    
    // External APIs
    TIMEZONE_API_URL: Joi.string().required(),
    PHOTOS_BUCKET: Joi.string().required(),
    
    // Zoho CRM Configuration
    ZOHO_CLIENT_ID: Joi.string().required(),
    ZOHO_CLIENT_SECRET: Joi.string().required(),
    ZOHO_REDIRECT_URI: Joi.string().required(),
    ZOHO_REFRESH_TOKEN: Joi.string().optional(),
    ZOHO_ENVIRONMENT: Joi.string()
      .valid('production', 'sandbox')
      .default('production'),
  }),
}),
```

**Key Features:**
- `isGlobal: true` - Makes ConfigService available everywhere without importing
- `validationSchema` - Validates all environment variables at startup
- **Type validation** - Ensures correct data types
- **Default values** - Provides fallbacks for optional settings
- **Required validation** - Application won't start without required variables

## Environment Variables

### Application Settings

```bash
# Basic application configuration
NODE_ENV=development          # Environment: development, production, test
NODE_PORT=3000               # Port the application runs on
```

### Database Configuration

```bash
# PostgreSQL database settings
DB_HOST=localhost            # Database host
DB_PORT=5432                # Database port
DB_USER=your_db_user        # Database username
DB_PASSWORD=your_db_password # Database password
DB_NAME=your_db_name        # Database name
DB_SYNC=false               # Auto-sync schema (development only)
```

**Important:** `DB_SYNC=true` should only be used in development. In production, use migrations.

### Authentication & Security

```bash
# Service account for internal authentication
SERVICE_ACCOUNT=your_service_account
SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SERVICE_ACCOUNT_USER=service@yourapp.com

# API key security
API_KEY_ALLOWED_DOMAINS=["https://yourdomain.com", "https://www.yourdomain.com"]
```

### Email Configuration

```bash
# SendGrid email service
SENDGRID_API_KEY=SG.your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com
CONTACT_US_EMAIL=contact@yourdomain.com
```

### Firebase Configuration

```bash
# Firebase service account (JSON string)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project",...}'
```

### External Services

```bash
# External API endpoints
TIMEZONE_API_URL=https://api.timezone.com
PHOTOS_BUCKET=your-gcs-bucket-name

# Zoho CRM integration
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REDIRECT_URI=https://yourapp.com/auth/zoho/callback
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_ENVIRONMENT=production  # or 'sandbox'
```

## Using Configuration in Services

### Injecting ConfigService

```typescript
@Injectable()
export class SomeService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    // Get configuration values
    const dbHost = this.configService.get<string>('DB_HOST');
    const dbPort = this.configService.get<number>('DB_PORT', 5432); // with default
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    
    // Environment-specific logic
    if (nodeEnv === 'production') {
      // Production-specific behavior
    }
  }
}
```

### Type-Safe Configuration

```typescript
// Create interfaces for better type safety
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
}

@Injectable()
export class DatabaseService {
  constructor(private configService: ConfigService) {}

  getDatabaseConfig(): DatabaseConfig {
    return {
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_NAME'),
      synchronize: this.configService.get<boolean>('DB_SYNC', false),
    };
  }
}
```

## Configuration Validation with Joi

### Why Use Joi Validation?

- **Early Error Detection**: Catch configuration errors at startup
- **Type Conversion**: Automatically convert string env vars to correct types
- **Documentation**: Schema serves as documentation
- **Default Values**: Provide sensible defaults

### Validation Schema Patterns

```typescript
// String validation
API_KEY: Joi.string().required(),
OPTIONAL_FIELD: Joi.string().optional(),
ENUM_FIELD: Joi.string().valid('option1', 'option2', 'option3').default('option1'),

// Number validation
PORT: Joi.number().port().default(3000),
TIMEOUT: Joi.number().min(1000).max(30000).default(5000),

// Boolean validation
ENABLE_FEATURE: Joi.boolean().default(false),

// Email validation
EMAIL: Joi.string().email().required(),

// URL validation
API_URL: Joi.string().uri().required(),

// JSON validation
JSON_CONFIG: Joi.string().custom((value, helpers) => {
  try {
    JSON.parse(value);
    return value;
  } catch (error) {
    return helpers.error('any.invalid');
  }
}).required(),
```

## Environment-Specific Configuration

### Development Environment

```bash
# .env.local or .env.development
NODE_ENV=development
DB_SYNC=true                 # Auto-sync database schema
LOG_LEVEL=debug             # Verbose logging
CORS_ORIGIN=http://localhost:4200
```

### Production Environment

```bash
# Production environment variables
NODE_ENV=production
DB_SYNC=false               # Never auto-sync in production
LOG_LEVEL=error            # Minimal logging
CORS_ORIGIN=https://yourdomain.com
```

### Test Environment

```bash
# Test environment
NODE_ENV=test
DB_NAME=test_database       # Separate test database
DB_SYNC=true               # OK for test environment
SENDGRID_API_KEY=test_key  # Test API keys
```

## Configuration Best Practices

### 1. Environment File Structure

```
project/
├── .env.example          # Template with all variables
├── .env.local           # Local development (gitignored)
├── .env.development     # Development defaults
├── .env.test           # Test environment
└── .env.production     # Production (usually not in repo)
```

### 2. Secure Handling of Secrets

```typescript
// Good: Use environment variables for secrets
const apiKey = this.configService.get<string>('API_KEY');

// Bad: Hardcode secrets
const apiKey = 'sk-1234567890abcdef'; // Never do this!

// Good: Validate required secrets
validationSchema: Joi.object({
  API_KEY: Joi.string().required(), // Will fail if missing
})
```

### 3. Default Values Strategy

```typescript
// Provide sensible defaults for non-critical settings
NODE_PORT: Joi.number().default(3000),
LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
CACHE_TTL: Joi.number().default(300), // 5 minutes

// Require critical configuration
DB_PASSWORD: Joi.string().required(), // No default for security
API_KEY: Joi.string().required(),
```

### 4. Environment-Specific Validation

```typescript
validationSchema: Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  
  // Conditional validation based on environment
  DB_SYNC: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().valid(false), // Must be false in production
    otherwise: Joi.boolean().default(false)
  }),
  
  // Different defaults per environment
  LOG_LEVEL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().default('error'),
    otherwise: Joi.string().default('debug')
  })
})
```

## Configuration Loading Order

NestJS loads configuration in this order (later sources override earlier ones):

1. Default values in Joi schema
2. `.env` file
3. `.env.local` file
4. `.env.${NODE_ENV}` file
5. `.env.${NODE_ENV}.local` file
6. System environment variables

## Testing Configuration

### Unit Testing with Mock Configuration

```typescript
describe('SomeService', () => {
  let service: SomeService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SomeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'DB_HOST': 'localhost',
                'DB_PORT': 5432,
                'NODE_ENV': 'test'
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SomeService>(SomeService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should use configuration correctly', () => {
    expect(configService.get('DB_HOST')).toBe('localhost');
  });
});
```

### Integration Testing with Test Configuration

```typescript
// test/app.e2e-spec.ts
beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test', // Use test environment file
        validationSchema: validationSchema,
      }),
      // ... other modules
    ],
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();
});
```

## Troubleshooting Configuration

### Common Issues

1. **Missing Environment Variables**
```bash
# Error: Configuration validation failed
# Solution: Check .env.example and ensure all required variables are set
```

2. **Type Conversion Issues**
```typescript
// Problem: String "true" instead of boolean true
DB_SYNC=true  // This is a string

// Solution: Joi automatically converts
DB_SYNC: Joi.boolean().default(false), // Converts "true" to true
```

3. **JSON Configuration**
```bash
# Problem: Invalid JSON in environment variable
FIREBASE_CONFIG={"invalid": json}

# Solution: Properly escape JSON
FIREBASE_CONFIG='{"valid": "json"}'
```

### Debugging Configuration

```typescript
@Injectable()
export class ConfigDebugService {
  constructor(private configService: ConfigService) {}

  logConfiguration() {
    console.log('Environment:', this.configService.get('NODE_ENV'));
    console.log('Database Host:', this.configService.get('DB_HOST'));
    // Don't log sensitive data like passwords or API keys!
  }
}
```

## Adding New Configuration

When adding new configuration:

1. **Add to Joi schema**:
```typescript
NEW_SETTING: Joi.string().required(),
```

2. **Add to .env.example**:
```bash
NEW_SETTING=example_value
```

3. **Document the setting**:
```typescript
// NEW_SETTING: Description of what this setting does
NEW_SETTING: Joi.string().required(),
```

4. **Use in service**:
```typescript
const newSetting = this.configService.get<string>('NEW_SETTING');
```

## Next Steps

- Learn about [Database Configuration](./database-config.md)
- Understand [Main.ts Configuration](./main-ts.md)
- Explore [Project Structure](../architecture/project-structure.md)

---

*Proper configuration management is crucial for application security and maintainability. Always validate configuration at startup and keep secrets out of source code.*