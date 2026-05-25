# Modules & Dependency Injection

## What are Modules?

Modules are the fundamental building blocks of NestJS applications. They organize your application into cohesive blocks of functionality and manage dependencies between different parts of your application.

## Why Use Modules?

- **Organization**: Group related functionality together
- **Encapsulation**: Control what's exposed to other parts of the application
- **Dependency Management**: Manage how services are shared between modules
- **Lazy Loading**: Load modules only when needed
- **Testing**: Easier to mock and test individual modules

## How Modules Work in This Project

### Root Module (app.module.ts)

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        // Environment validation schema
      }),
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    HealthModule,
    AuthModule,
    UserModule,
    MarketingModule,
    // ... other modules
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Key Points:**
- `imports`: Other modules this module depends on
- `controllers`: HTTP request handlers
- `providers`: Services, repositories, and other injectable classes
- `exports`: What this module makes available to other modules

### Feature Module Example (auth.module.ts)

```typescript
@Module({
  imports: [ApiKeyModule, PassportModule],
  providers: [AuthService, APIkeyStrategy, JWTStrategy],
  exports: [APIkeyStrategy, JWTStrategy],
})
export class AuthModule {}
```

**What's happening:**
- Imports `ApiKeyModule` and `PassportModule` for dependencies
- Provides authentication services and strategies
- Exports strategies so other modules can use them

## Dependency Injection (DI)

### What is Dependency Injection?

DI is a design pattern where dependencies are provided to a class rather than the class creating them itself. NestJS has a built-in IoC (Inversion of Control) container that manages this.

### How DI Works in This Project

#### Constructor Injection Example

```typescript
// From marketing.controller.ts
@Controller('marketing')
export class MarketingController {
  constructor(private marketingService: MarketingService) {}
  
  @Post('contactus')
  async sendContactUsEmail(@Body() contactUsDto: ContactUsDTO) {
    return await this.marketingService.processContactUsRequest(contactUsDto);
  }
}
```

**What's happening:**
- `MarketingService` is automatically injected by NestJS
- The service is available as `this.marketingService`
- No need to manually create or manage the service instance

#### Service with Dependencies

```typescript
// Typical service pattern
@Injectable()
export class MarketingService {
  constructor(
    private mailService: MailService,
    private configService: ConfigService,
    @InjectRepository(ContactUs)
    private contactUsRepository: Repository<ContactUs>
  ) {}
}
```

**Key Points:**
- `@Injectable()` decorator makes the class available for injection
- Multiple dependencies can be injected
- `@InjectRepository()` is used for TypeORM repositories

## Module Patterns in This Project

### 1. Global Modules

```typescript
ConfigModule.forRoot({
  isGlobal: true,  // Available everywhere
  // ...
})
```

**When to use:** For configuration, logging, or other utilities needed everywhere.

### 2. Feature Modules

Each major feature has its own module:
- `AuthModule` - Authentication and authorization
- `UserModule` - User management
- `MarketingModule` - Marketing functionality
- `ZohoModule` - CRM integration

### 3. Shared Modules

```typescript
@Module({
  providers: [TimeService],
  exports: [TimeService],
})
export class SharedModule {}
```

**Purpose:** Share common services across multiple modules.

### 4. Dynamic Modules

```typescript
TypeOrmModule.forRootAsync({
  useClass: TypeOrmConfigService,
})
```

**Purpose:** Configure modules at runtime based on environment or other factors.

## Best Practices Demonstrated

### 1. Single Responsibility
Each module has a clear, focused purpose:
- `AuthModule` only handles authentication
- `MailModule` only handles email functionality

### 2. Proper Exports
Only export what other modules need:
```typescript
@Module({
  providers: [AuthService, APIkeyStrategy, JWTStrategy],
  exports: [APIkeyStrategy, JWTStrategy], // Only export strategies
})
```

### 3. Dependency Management
Import modules, not individual services:
```typescript
@Module({
  imports: [ApiKeyModule], // Import the module
  // Don't directly import ApiKeyService
})
```

## Adding New Modules

When adding new functionality:

1. **Create the module file**:
```typescript
@Module({
  controllers: [NewFeatureController],
  providers: [NewFeatureService],
  exports: [NewFeatureService], // If other modules need it
})
export class NewFeatureModule {}
```

2. **Import in AppModule**:
```typescript
@Module({
  imports: [
    // ... existing modules
    NewFeatureModule,
  ],
})
export class AppModule {}
```

3. **Follow the folder structure**:
```
src/
  new-feature/
    new-feature.module.ts
    new-feature.controller.ts
    new-feature.service.ts
    dto/
    entities/
```

## Common Patterns

### Module with Database Entity
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([EntityName])],
  controllers: [FeatureController],
  providers: [FeatureService],
})
export class FeatureModule {}
```

### Module with External Service
```typescript
@Module({
  imports: [HttpModule], // For external API calls
  providers: [ExternalApiService],
  exports: [ExternalApiService],
})
export class ExternalModule {}
```

## Next Steps

- Learn about [Controllers & Routing](./controllers-routing.md)
- Understand [Guards & Authentication](./guards-auth.md)
- Explore [Database Integration](./database-typeorm.md)

---

*This modular architecture makes the codebase maintainable, testable, and scalable. Each module can be developed, tested, and deployed independently.*