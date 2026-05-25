# Main.ts Configuration

## What is main.ts?

The `main.ts` file is the entry point of your NestJS application. It's where you bootstrap the application, configure global settings, and start the HTTP server.

## Why Configure in main.ts?

- **Global Configuration**: Settings that apply to the entire application
- **Middleware Setup**: Global pipes, guards, interceptors, and filters
- **Server Configuration**: Port, CORS, logging, and other server settings
- **API Documentation**: Swagger/OpenAPI setup
- **Application Lifecycle**: Bootstrap and shutdown logic

## Main.ts Configuration in This Project

```typescript
// From main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { useContainer } from 'class-validator';

async function bootstrap() {
  // Create NestJS application instance
  const app = await NestFactory.create(AppModule, {
    snapshot: true,  // Enable application snapshots for debugging
    logger: ['error', 'warn', 'debug', 'fatal', 'log', 'verbose'],
  });
  
  // Enable CORS for cross-origin requests
  app.enableCors();
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error for unknown properties
      transform: true,           // Transform payloads to DTO instances
    }),
  );
  
  // Enable dependency injection in class-validator
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  
  // Get configuration service
  const configService = app.get(ConfigService);

  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
    .addSecurity('apiKey', {
      type: 'apiKey',
      name: 'Api-Key',
      'x-tokenName': 'X-Api-Key',
    })
    .addBearerAuth()
    .setTitle('SponsPay')
    .setDescription('API for SponsPay')
    .setVersion('0.0.1')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Scalar API documentation UI
  app.use(
    '/documentation',
    apiReference({
      theme: 'purple',
      spec: {
        content: document,
      },
    }),
  );

  // Start the server
  const port = configService.get('NODE_PORT');
  await app.listen(port);
}

bootstrap();
```

## Application Creation Options

### Basic Application Creation

```typescript
const app = await NestFactory.create(AppModule);
```

### Advanced Application Creation

```typescript
const app = await NestFactory.create(AppModule, {
  snapshot: true,  // Enable snapshots for debugging
  logger: ['error', 'warn', 'debug', 'fatal', 'log', 'verbose'],
  cors: true,      // Enable CORS (alternative to app.enableCors())
  bodyParser: true, // Enable body parsing (default: true)
});
```

**Options explained:**
- `snapshot: true` - Enables application graph snapshots for debugging
- `logger` - Array of log levels to enable
- `cors: true` - Enables CORS with default settings
- `bodyParser: true` - Enables request body parsing

## Global Pipes Configuration

### Validation Pipe Setup

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Only allow properties defined in DTOs
    forbidNonWhitelisted: true, // Reject requests with extra properties
    transform: true,           // Transform plain objects to DTO instances
    disableErrorMessages: false, // Show validation error messages
    validationError: {
      target: false,           // Don't include target object in errors
      value: false,           // Don't include value in errors
    },
  }),
);
```

**Configuration options:**
- `whitelist: true` - Strips properties not defined in DTO
- `forbidNonWhitelisted: true` - Throws error for unknown properties
- `transform: true` - Converts plain objects to DTO class instances
- `disableErrorMessages: false` - Shows detailed validation errors

### Custom Validation Pipe

```typescript
@Injectable()
export class CustomValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        );
        return new BadRequestException({
          statusCode: 400,
          error: 'Validation Failed',
          message: messages,
        });
      },
    });
  }
}

// Usage
app.useGlobalPipes(new CustomValidationPipe());
```

## CORS Configuration

### Basic CORS

```typescript
app.enableCors(); // Allow all origins
```

### Advanced CORS Configuration

```typescript
app.enableCors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Api-Key'],
  credentials: true, // Allow cookies
  maxAge: 86400,    // Cache preflight response for 24 hours
});
```

### Environment-based CORS

```typescript
const configService = app.get(ConfigService);
const nodeEnv = configService.get('NODE_ENV');

if (nodeEnv === 'development') {
  app.enableCors(); // Allow all in development
} else {
  app.enableCors({
    origin: configService.get('ALLOWED_ORIGINS').split(','),
    credentials: true,
  });
}
```

## Swagger/OpenAPI Configuration

### Document Builder Setup

```typescript
const config = new DocumentBuilder()
  .setTitle('Your API')
  .setDescription('API description')
  .setVersion('1.0')
  .addTag('users', 'User management endpoints')
  .addTag('auth', 'Authentication endpoints')
  .addBearerAuth() // JWT authentication
  .addApiKey({
    type: 'apiKey',
    name: 'Api-Key',
    in: 'header',
  }, 'apiKey') // API key authentication
  .addServer('http://localhost:3000', 'Development server')
  .addServer('https://api.yourdomain.com', 'Production server')
  .build();
```

### Document Generation

```typescript
const document = SwaggerModule.createDocument(app, config, {
  include: [UserModule, AuthModule], // Only include specific modules
  deepScanRoutes: true, // Scan for additional routes
});
```

### Swagger UI Setup

```typescript
// Standard Swagger UI
SwaggerModule.setup('api', app, document, {
  swaggerOptions: {
    persistAuthorization: true, // Remember auth tokens
    displayRequestDuration: true,
  },
});

// Scalar API Reference (used in this project)
app.use(
  '/documentation',
  apiReference({
    theme: 'purple',
    spec: {
      content: document,
    },
    metaData: {
      title: 'API Documentation',
      description: 'Interactive API documentation',
    },
  }),
);
```

## Global Guards, Interceptors, and Filters

### Global Guards

```typescript
// Apply guard to all routes
app.useGlobalGuards(new ApiKeyGuard());

// Multiple guards
app.useGlobalGuards(
  new ApiKeyGuard(),
  new RateLimitGuard(),
);
```

### Global Interceptors

```typescript
// Logging interceptor
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    
    console.log(`${method} ${url}`);
    
    return next.handle();
  }
}

app.useGlobalInterceptors(new LoggingInterceptor());
```

### Global Exception Filters

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;
    
    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';
    
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}

app.useGlobalFilters(new GlobalExceptionFilter());
```

## Logging Configuration

### Built-in Logger

```typescript
const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn', 'log'], // Production logging
  // logger: ['error', 'warn', 'log', 'debug', 'verbose'], // Development logging
});
```

### Custom Logger

```typescript
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const app = await NestFactory.create(AppModule, {
  logger: WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
      }),
    ],
  }),
});
```

### Environment-based Logging

```typescript
const configService = app.get(ConfigService);
const nodeEnv = configService.get('NODE_ENV');

const logLevels = nodeEnv === 'production'
  ? ['error', 'warn']
  : ['error', 'warn', 'log', 'debug', 'verbose'];

const app = await NestFactory.create(AppModule, {
  logger: logLevels,
});
```

## Security Configuration

### Helmet for Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

### Rate Limiting

```typescript
import { ThrottlerModule } from '@nestjs/throttler';

// In AppModule
ThrottlerModule.forRoot({
  ttl: 60,    // Time window in seconds
  limit: 10,  // Max requests per window
}),

// In main.ts
app.useGlobalGuards(new ThrottlerGuard());
```

## Application Lifecycle

### Graceful Shutdown

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ... configuration
  
  await app.listen(port);
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });
}
```

### Application Events

```typescript
@Injectable()
export class AppService implements OnApplicationBootstrap, OnApplicationShutdown {
  onApplicationBootstrap() {
    console.log('Application has started');
  }
  
  onApplicationShutdown(signal?: string) {
    console.log(`Application is shutting down (${signal})`);
  }
}
```

## Environment-Specific Configuration

### Development Configuration

```typescript
if (configService.get('NODE_ENV') === 'development') {
  // Enable detailed logging
  app.useLogger(['error', 'warn', 'log', 'debug', 'verbose']);
  
  // Enable CORS for all origins
  app.enableCors();
  
  // Enable Swagger documentation
  SwaggerModule.setup('api', app, document);
}
```

### Production Configuration

```typescript
if (configService.get('NODE_ENV') === 'production') {
  // Minimal logging
  app.useLogger(['error', 'warn']);
  
  // Strict CORS
  app.enableCors({
    origin: configService.get('ALLOWED_ORIGINS').split(','),
    credentials: true,
  });
  
  // Security headers
  app.use(helmet());
  
  // Disable Swagger in production
  // SwaggerModule.setup('api', app, document);
}
```

## Testing Configuration

### Test Application Setup

```typescript
// test/app.e2e-spec.ts
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
});
```

## Performance Optimization

### Compression

```typescript
import compression from 'compression';

app.use(compression());
```

### Request Size Limits

```typescript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

### Keep-Alive

```typescript
const server = await app.listen(port);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
```

## Monitoring and Health Checks

### Health Check Endpoint

```typescript
// Already configured in HealthModule
// Access at: GET /health
```

### Application Metrics

```typescript
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

// In AppModule
PrometheusModule.register(),

// Metrics available at: GET /metrics
```

## Best Practices

### 1. Configuration Order

```typescript
async function bootstrap() {
  // 1. Create application
  const app = await NestFactory.create(AppModule);
  
  // 2. Global middleware (CORS, compression, etc.)
  app.enableCors();
  app.use(compression());
  
  // 3. Global pipes, guards, interceptors, filters
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalGuards(new ApiKeyGuard());
  
  // 4. Documentation setup
  SwaggerModule.setup('api', app, document);
  
  // 5. Start server
  await app.listen(port);
}
```

### 2. Environment-based Configuration

```typescript
const configService = app.get(ConfigService);
const nodeEnv = configService.get('NODE_ENV');

// Use environment variables for configuration
const corsOrigins = nodeEnv === 'production'
  ? configService.get('ALLOWED_ORIGINS').split(',')
  : true; // Allow all in development
```

### 3. Error Handling

```typescript
bootstrap().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
```

## Next Steps

- Learn about [App Module Configuration](./app-module.md)
- Understand [Environment Configuration](./environment-config.md)
- Explore [API Documentation](../integrations/swagger.md)

---

*The main.ts file is crucial for application setup. Configure global settings here and keep environment-specific logic separate using the ConfigService.*