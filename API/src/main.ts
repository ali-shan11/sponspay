import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { useContainer } from 'class-validator';
import * as express from 'express';
import type { Request } from 'express';
import { instrument } from '@socket.io/admin-ui';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

class SocketIOAdminAdapter extends IoAdapter {
  private io: any;
  private redisAdapter: any;

  createIOServer(port: number, options?: ServerOptions): any {
    this.io = super.createIOServer(port, options);

    // Set up Redis adapter for multi-pod scaling if REDIS_URL is available
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        const pubClient = new Redis(redisUrl, {
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: null, // Infinite retries without throwing
          enableOfflineQueue: true, // Queue commands when disconnected
          reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
              return true;
            }
            return false;
          },
        });
        const subClient = pubClient.duplicate();

        this.redisAdapter = createAdapter(pubClient, subClient);
        this.io.adapter(this.redisAdapter);

        console.log(
          'Redis adapter initialized for Socket.IO - multi-pod scaling enabled',
        );
      } catch (error) {
        console.error('Failed to initialize Redis adapter:', error);
      }
    }

    return this.io;
  }

  getIO() {
    return this.io;
  }
}

// Custom interface for requests with raw body
interface RawBodyRequest extends Request {
  rawBody?: string | Buffer;
}

const pawapayRawBodySaver = (
  req: RawBodyRequest,
  _res: express.Response,
  buffer: Buffer,
  encoding?: string,
) => {
  if (buffer?.length) {
    req.rawBody = buffer.toString((encoding as BufferEncoding) ?? 'utf8');
  }
};

// Global error handlers to prevent process crashes from uncaught errors
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('🔴 Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: String(promise),
  });
  // Don't exit - log and continue running
  // This prevents crashes from Redis disconnections, Telegram errors, etc.
});

process.on('uncaughtException', (error: Error) => {
  console.error('🔴 Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
  });
  // Exit gracefully on truly fatal errors
  // Give time for logs to flush
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true,
    logger: ['error', 'warn', 'debug', 'fatal', 'log', 'verbose'],
  });
  app.use('/pawapay/callback', express.json({ verify: pawapayRawBodySaver }));
  app.use('/pawapay', express.json());
  app.use(express.json());
  app.enableCors();
  app.getHttpAdapter().getInstance().set('etag', false);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .addSecurity('apiKey', {
      type: 'apiKey',
      name: 'Api-Key',
      in: 'header',
    })
    .addBearerAuth()
    .setTitle('SponsPay API')
    .setDescription(
      `# SponsPay API Documentation

RESTful API for the SponsPay platform - enabling YouTube creators to accept local payment methods from fans worldwide.

## Authentication Methods

### API Key Authentication

**Header:** \`api-key\`  
**Use Case:** Public-facing endpoints (contact forms, sign-in, webhooks)  
**How to Use:** Include your API key in the \`api-key\` header  
**Rate Limit:** Typically 5-10 requests per minute

**Example:**
\`\`\`
curl -H "api-key: your-api-key-here" https://api.sponspay.com/creator/sign-in
\`\`\`

### Firebase JWT Authentication

**Header:** \`Authorization: Bearer <token>\`  
**Use Case:** Authenticated user operations, creator tools, admin functions  
**How to Use:** Include Firebase JWT token in the Authorization header  
**Token Expiration:** Tokens expire and must be refreshed

**Example:**
\`\`\`
curl -H "Authorization: Bearer eyJhbGciOi..." https://api.sponspay.com/creator/onboard
\`\`\`

## Authorization Roles

- **Fan** - Basic user access (lowest privilege)
- **Creator** - Content creator with channel management capabilities
- **Admin** - Full platform access (highest privilege)

Role hierarchy: Admin > Creator > Fan

## Rate Limiting

All endpoints are rate-limited to prevent abuse:

- **Default:** 10 requests per minute
- **Critical Operations:** 3 requests per minute (account creation, onboarding)
- **Sensitive Operations:** 5 requests per minute (account verification, sign-in)
- **Standard Operations:** 10 requests per minute (most read operations)
- **High-Frequency:** 60 requests per minute (health checks)

When rate limits are exceeded, you will receive a \`429 Too Many Requests\` response.

## Data Sensitivity Levels

- **Public** - Non-sensitive, publicly available data (marketing content, news)
- **Internal** - Internal use data, not publicly shared (admin configurations)
- **Sensitive** - Personal data requiring protection (emails, channel statistics)
- **Critical** - Financial or highly sensitive data (payment accounts, transactions)

## Security Best Practices

1. **Always use HTTPS** in production environments
2. **Store API keys securely** - Never commit keys to version control
3. **Refresh JWT tokens** before expiration
4. **Handle rate limits** gracefully with exponential backoff
5. **Validate input** on the client side before sending requests
6. **Log authentication failures** for security monitoring

## Common Error Codes

- **400** - Bad Request: Invalid input data or validation failure
- **401** - Unauthorized: Missing or invalid authentication credentials
- **403** - Forbidden: Insufficient permissions (role requirement not met)
- **404** - Not Found: Resource does not exist
- **429** - Too Many Requests: Rate limit exceeded
- **500** - Internal Server Error: Server-side error (often safe to retry)

## Support & Resources

- **API Status:** Check \`/health\` endpoint for system status
- **Security Matrix:** Complete endpoint security reference available in documentation

## API Version

- **Current Version:** 0.0.1
- **Base URL (Production):** \`https://api.sponspay.com\`
- **Base URL (Development):** \`https://api-dev.sponspay.com\``,
    )
    .setVersion('0.0.1')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // In production, remove admin/dev endpoints from the generated Swagger document
  const env = configService.get<string>('NODE_ENV');
  if (env === 'production') {
    const paths = document.paths || {};
    for (const p of Object.keys(paths)) {
      const route: any = (paths as any)[p];
      const ops: any[] = Object.values(route);
      const hasAdminTag = ops.some(
        (op) => Array.isArray(op?.tags) && op.tags.includes('admin'),
      );
      if (hasAdminTag) {
        delete (paths as any)[p];
      }
    }
    if (Array.isArray((document as any).tags)) {
      (document as any).tags = (document as any).tags.filter(
        (t: any) => t?.name !== 'admin',
      );
    }
  }

  app.use(
    '/documentation',
    apiReference({
      theme: 'purple',
      spec: {
        content: document,
      },
    }),
  );

  // Set up Socket.IO adapter with admin UI
  const ioAdapter = new SocketIOAdminAdapter(app);
  app.useWebSocketAdapter(ioAdapter);

  // Wait for the app to initialize, then instrument the Socket.IO server
  await app.init();

  const io = ioAdapter.getIO();
  if (io) {
    instrument(io, {
      auth: false,
      mode:
        configService.get<string>('NODE_ENV') === 'production'
          ? 'production'
          : 'development',
    });
    console.log(
      'Socket.IO Admin UI initialized - visit https://admin.socket.io',
    );
  }

  const port = configService.get('NODE_PORT');
  await app.listen(port);
}
bootstrap();
