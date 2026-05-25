# Guards & Authentication

## What are Guards?

Guards are a special type of middleware that determine whether a request should be handled by the route handler or not. They implement the `CanActivate` interface and are executed before route handlers.

## Why Use Guards?

- **Authentication**: Verify user identity
- **Authorization**: Check user permissions
- **Rate Limiting**: Control request frequency
- **Request Validation**: Validate request context
- **Security**: Protect sensitive endpoints

## Authentication Strategies in This Project

This project implements two authentication strategies:

1. **API Key Authentication** - For external API access
2. **Firebase JWT Authentication** - For user authentication

## API Key Authentication

### API Key Guard

```typescript
// From api-key.guard.ts
@Injectable()
export class ApiKeyGuard extends AuthGuard('headerapikey') {}
```

**What it does:**
- Extends NestJS's built-in `AuthGuard`
- Uses the 'headerapikey' strategy
- Automatically validates API keys from request headers

### API Key Strategy

```typescript
// From api-key.strategy.ts
@Injectable()
export class APIkeyStrategy extends PassportStrategy(Strategy, 'headerapikey') {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super(
      { header: 'Api-Key', prefix: '' },
      true,
      async (apiKey: string | undefined, done: any, req: Request) => {
        return await this.validate(apiKey, done, req);
      },
    );
  }

  async validate(apiKey: string | undefined, done: any, req: Request): Promise<any> {
    const allowedDomains: string[] = JSON.parse(
      this.configService.get<string>('API_KEY_ALLOWED_DOMAINS') || '[]',
    );
    const origin = req.headers.origin;
    
    // Allow requests from whitelisted domains
    if (allowedDomains.length > 0 && origin && allowedDomains.includes(origin)) {
      done(null, true);
    } 
    // Validate API key
    else if (apiKey) {
      const validApiKey = await this.authService.validateApiKey(apiKey);
      if (!validApiKey) {
        done(new UnauthorizedException(), null);
      } else {
        done(null, true);
      }
    } else {
      done(new UnauthorizedException(), null);
    }
  }
}
```

**Key Features:**
- **Dual Validation**: Accepts either valid API key OR whitelisted domain
- **Header-based**: Looks for `Api-Key` header
- **Configurable**: Uses environment variables for allowed domains
- **Database Validation**: Checks API key against database

### Using API Key Guard

```typescript
// From marketing.controller.ts
@UseGuards(ApiKeyGuard)
@Post('contactus')
@ApiSecurity('apiKey')  // Swagger documentation
async sendContactUsEmail(@Body() contactUsDto: ContactUsDTO) {
  return await this.marketingService.processContactUsRequest(contactUsDto);
}
```

**How to make requests:**
```bash
# With API Key
curl -X POST \
  -H "Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John"}' \
  http://localhost:3000/marketing/contactus

# From allowed domain (no API key needed)
curl -X POST \
  -H "Origin: https://allowed-domain.com" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John"}' \
  http://localhost:3000/marketing/contactus
```

## Firebase JWT Authentication

### JWT Strategy

```typescript
// From jwt.strategy.ts
@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy, 'firebase-jwt') {
  constructor(private firebaseAdminService: FirebaseAdminService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  validate(token: string) {
    return this.firebaseAdminService.verityIdToken(token);
  }
}
```

**What it does:**
- Extracts JWT from `Authorization: Bearer <token>` header
- Validates token using Firebase Admin SDK
- Returns user information if token is valid

### JWT Guard

```typescript
// From jwt.guard.ts
@Injectable()
export class JwtGuard extends AuthGuard('firebase-jwt') {}
```

### Using JWT Guard

```typescript
@UseGuards(JwtGuard)
@Get('profile')
async getProfile(@Req() req) {
  // req.user contains the authenticated user info
  return req.user;
}
```

**How to make requests:**
```bash
curl -X GET \
  -H "Authorization: Bearer firebase-jwt-token-here" \
  http://localhost:3000/user/profile
```

## Guard Configuration in Modules

### Auth Module Setup

```typescript
// From auth.module.ts
@Module({
  imports: [ApiKeyModule, PassportModule],
  providers: [AuthService, APIkeyStrategy, JWTStrategy],
  exports: [APIkeyStrategy, JWTStrategy],
})
export class AuthModule {}
```

**Key Points:**
- Imports `PassportModule` for Passport.js integration
- Provides both strategies
- Exports strategies so other modules can use the guards

## Advanced Guard Patterns

### Multiple Guards

```typescript
@UseGuards(ApiKeyGuard, RoleGuard)
@Post('admin-action')
async adminAction() {
  // Requires both API key AND admin role
}
```

### Custom Role Guard

```typescript
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### Role Decorator

```typescript
// From role.decorator.ts
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// Usage
@Roles(Role.Admin)
@UseGuards(JwtGuard, RoleGuard)
@Delete('users/:id')
async deleteUser(@Param('id') id: string) {
  // Only admins can delete users
}
```

## Error Handling in Guards

### Automatic Error Responses

When guards fail, NestJS automatically returns appropriate HTTP errors:

```typescript
// API Key validation fails
{
  "statusCode": 401,
  "message": "Unauthorized"
}

// JWT token invalid
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Custom Error Messages

```typescript
async validate(apiKey: string): Promise<any> {
  const validApiKey = await this.authService.validateApiKey(apiKey);
  if (!validApiKey) {
    throw new UnauthorizedException('Invalid API key provided');
  }
  return true;
}
```

## Global vs Route-level Guards

### Route-level (Current Implementation)

```typescript
@UseGuards(ApiKeyGuard)
@Post('protected')
protectedEndpoint() {
  // Only this endpoint is protected
}
```

### Global Guards

```typescript
// In main.ts
app.useGlobalGuards(new ApiKeyGuard());

// All endpoints protected by default
// Use @Public() decorator to exclude specific routes
```

## Testing Guards

### Unit Testing

```typescript
describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let authService: AuthService;

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
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    authService = module.get<AuthService>(AuthService);
  });

  it('should allow valid API key', async () => {
    jest.spyOn(authService, 'validateApiKey').mockResolvedValue(true);
    
    const context = createMockExecutionContext({
      headers: { 'api-key': 'valid-key' }
    });
    
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
```

### Integration Testing

```typescript
describe('Protected Endpoints', () => {
  it('should reject requests without API key', () => {
    return request(app.getHttpServer())
      .post('/marketing/contactus')
      .send({ firstName: 'John' })
      .expect(401);
  });

  it('should accept requests with valid API key', () => {
    return request(app.getHttpServer())
      .post('/marketing/contactus')
      .set('Api-Key', 'valid-api-key')
      .send({ firstName: 'John' })
      .expect(201);
  });
});
```

## Security Best Practices

### 1. Environment-based Configuration

```typescript
// Use environment variables for sensitive data
const allowedDomains = this.configService.get<string>('API_KEY_ALLOWED_DOMAINS');
```

### 2. Proper Error Handling

```typescript
// Don't expose sensitive information in error messages
if (!validApiKey) {
  throw new UnauthorizedException(); // Generic message
}
```

### 3. Rate Limiting

```typescript
// Consider adding rate limiting guards
@UseGuards(ApiKeyGuard, ThrottlerGuard)
@Post('endpoint')
protectedEndpoint() {}
```

### 4. Logging

```typescript
private readonly logger = new Logger(APIkeyStrategy.name);

async validate(apiKey: string) {
  this.logger.debug('Validating API key');
  // Don't log the actual API key
}
```

## Adding New Authentication Methods

To add a new authentication strategy:

1. **Create the Strategy**:
```typescript
@Injectable()
export class NewAuthStrategy extends PassportStrategy(Strategy, 'new-auth') {
  async validate(payload: any) {
    // Validation logic
  }
}
```

2. **Create the Guard**:
```typescript
@Injectable()
export class NewAuthGuard extends AuthGuard('new-auth') {}
```

3. **Register in Module**:
```typescript
@Module({
  providers: [NewAuthStrategy],
  exports: [NewAuthStrategy],
})
export class AuthModule {}
```

4. **Use in Controllers**:
```typescript
@UseGuards(NewAuthGuard)
@Get('protected')
protectedEndpoint() {}
```

## Next Steps

- Learn about [Validation & DTOs](./validation-dtos.md)
- Understand [Database Integration](./database-typeorm.md)
- Explore [Project Structure](../architecture/project-structure.md)

---

*Guards provide a clean, reusable way to implement authentication and authorization. They keep security concerns separate from business logic and make endpoints easy to protect.*