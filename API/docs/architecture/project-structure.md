# Project Structure

## Overview

This NestJS project follows a feature-based modular architecture, where each major functionality is organized into its own module with clear separation of concerns.

## Root Directory Structure

```
api/
├── src/                     # Source code
├── test/                    # End-to-end tests
├── config/                  # Configuration files
├── scripts/                 # Utility scripts
├── k8s/                     # Kubernetes deployment files
├── docs/                    # Documentation (this folder)
├── package.json             # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── nest-cli.json           # NestJS CLI configuration
├── docker-compose.yaml     # Local development setup
├── Dockerfile              # Container configuration
└── .env.example            # Environment variables template
```

## Source Code Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root module
├── app.controller.ts      # Root controller
├── app.service.ts         # Root service
│
├── auth/                  # Authentication module
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── api-key.guard.ts
│   ├── api-key.strategy.ts
│   ├── jwt.guard.ts
│   ├── jwt.strategy.ts
│   ├── dto/
│   └── interfaces/
│
├── user/                  # User management module
│   ├── user.module.ts
│   ├── user.controller.ts
│   ├── user.service.ts
│   ├── dto/
│   │   ├── create-prospect.dto.ts
│   │   └── user.dto.ts
│   ├── entities/
│   │   └── user.entity.ts
│   └── enums/
│       └── user.enum.ts
│
├── marketing/             # Marketing functionality
│   ├── marketing.module.ts
│   ├── marketing.controller.ts
│   ├── marketing.service.ts
│   ├── dto/
│   │   └── contact-us.dto.ts
│   └── entities/
│       └── contact-us.entity.ts
│
├── api-key/              # API key management
│   ├── api-key.module.ts
│   ├── api-key.service.ts
│   └── entities/
│       └── api-key.entity.ts
│
├── health/               # Health check endpoints
│   ├── health.module.ts
│   └── health.controller.ts
│
├── mail/                 # Email functionality
│   ├── mail.module.ts
│   ├── mail.service.ts
│   └── interfaces/
│       └── mail.interface.ts
│
├── sendgrid/             # SendGrid integration
│   ├── sendgrid.module.ts
│   └── sendgrid.service.ts
│
├── firebase/             # Firebase integration
│   ├── firebase-admin.module.ts
│   └── firebase-admin.service.ts
│
├── file-upload/          # File upload functionality
│   ├── file-upload.module.ts
│   ├── file-upload.controller.ts
│   └── file-upload.service.ts
│
├── zoho/                 # Zoho CRM integration
│   ├── zoho.module.ts
│   ├── zoho.service.ts
│   ├── dto/
│   ├── interfaces/
│   └── services/
│       ├── zoho-api.service.ts
│       ├── zoho-contact.service.ts
│       ├── zoho-lead.service.ts
│       └── zoho-token.service.ts
│
├── shared/               # Shared utilities
│   ├── shared.module.ts
│   ├── time.service.ts
│   └── interfaces/
│       └── timezone.interface.ts
│
├── decorators/           # Custom decorators
│   └── role.decorator.ts
│
├── generated/            # Auto-generated files
│   └── i18n.generated.ts
│
└── i18n/                # Internationalization
    └── en/
        └── user.json
```

## Architecture Patterns

### 1. Feature-Based Modules

Each major feature is organized into its own module:

```typescript
// Example: User module structure
user/
├── user.module.ts          # Module definition
├── user.controller.ts      # HTTP endpoints
├── user.service.ts         # Business logic
├── dto/                    # Data transfer objects
├── entities/               # Database entities
└── enums/                  # Type definitions
```

**Benefits:**
- **Encapsulation**: Each module is self-contained
- **Maintainability**: Easy to locate and modify feature-specific code
- **Scalability**: New features can be added as separate modules
- **Testing**: Modules can be tested in isolation

### 2. Layered Architecture

```
Controller Layer    →  HTTP request handling, validation
     ↓
Service Layer      →  Business logic, orchestration
     ↓
Repository Layer   →  Data access, database operations
     ↓
Entity Layer       →  Data models, database schema
```

### 3. Dependency Injection

```typescript
// Services are injected into controllers
@Controller('users')
export class UserController {
  constructor(
    private userService: UserService,
    private mailService: MailService
  ) {}
}

// Repositories are injected into services
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}
}
```

## Module Organization Patterns

### Core Modules

**AppModule** - Root module that imports all feature modules
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }),
    AuthModule,
    UserModule,
    MarketingModule,
    // ... other modules
  ],
})
export class AppModule {}
```

**SharedModule** - Common utilities used across modules
```typescript
@Module({
  providers: [TimeService],
  exports: [TimeService],
})
export class SharedModule {}
```

### Feature Modules

**Standard Feature Module Pattern:**
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Entity]), // Database entities
    SharedModule,                       // Shared services
  ],
  controllers: [FeatureController],     // HTTP endpoints
  providers: [FeatureService],          // Business logic
  exports: [FeatureService],           // Services for other modules
})
export class FeatureModule {}
```

### Integration Modules

**External Service Integration:**
```typescript
// Example: SendGrid module
@Module({
  providers: [SendgridService],
  exports: [SendgridService],
})
export class SendgridModule {}

// Example: Firebase module
@Module({
  providers: [FirebaseAdminService],
  exports: [FirebaseAdminService],
})
export class FirebaseAdminModule {}
```

## File Naming Conventions

### Controllers
```
feature.controller.ts       # HTTP request handlers
feature.controller.spec.ts  # Controller unit tests
```

### Services
```
feature.service.ts          # Business logic
feature.service.spec.ts     # Service unit tests
```

### Modules
```
feature.module.ts           # Module definition
```

### DTOs (Data Transfer Objects)
```
create-feature.dto.ts       # Creation DTOs
update-feature.dto.ts       # Update DTOs
feature-response.dto.ts     # Response DTOs
```

### Entities
```
feature.entity.ts           # Database entity definitions
```

### Interfaces
```
feature.interface.ts        # TypeScript interfaces
```

### Enums
```
feature.enum.ts            # Enumeration types
```

## Directory Organization Rules

### 1. Feature Grouping

Group related files by feature, not by file type:

```
✅ Good: Feature-based
user/
├── user.controller.ts
├── user.service.ts
├── user.module.ts
└── dto/
    └── create-user.dto.ts

❌ Avoid: Type-based
controllers/
├── user.controller.ts
└── marketing.controller.ts
services/
├── user.service.ts
└── marketing.service.ts
```

### 2. Nested Subdirectories

Use subdirectories for organization within features:

```
zoho/
├── zoho.module.ts
├── zoho.service.ts
├── dto/                    # Data transfer objects
│   └── create-lead.dto.ts
├── interfaces/             # TypeScript interfaces
│   ├── zoho-config.interface.ts
│   └── zoho-response.interface.ts
└── services/              # Specialized services
    ├── zoho-api.service.ts
    ├── zoho-contact.service.ts
    └── zoho-lead.service.ts
```

### 3. Shared Resources

Place shared utilities in dedicated directories:

```
shared/
├── shared.module.ts
├── time.service.ts
└── interfaces/
    └── timezone.interface.ts

decorators/
└── role.decorator.ts

generated/
└── i18n.generated.ts
```

## Configuration Organization

### Environment Configuration
```
config/
└── configuration.ts        # TypeORM configuration service

.env.example               # Environment variables template
.env.local                # Local development variables
```

### Application Configuration
```
src/
├── main.ts               # Application bootstrap
└── app.module.ts         # Root module configuration
```

## Testing Structure

### Unit Tests
```
src/
├── feature/
│   ├── feature.service.ts
│   ├── feature.service.spec.ts     # Unit tests alongside source
│   ├── feature.controller.ts
│   └── feature.controller.spec.ts
```

### Integration Tests
```
test/
├── app.e2e-spec.ts              # End-to-end tests
└── jest-e2e.json               # E2E test configuration
```

## Import Organization

### Import Order Convention

```typescript
// 1. Node.js built-in modules
import * as path from 'path';

// 2. External libraries
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';

// 3. Internal modules (absolute paths)
import { AuthModule } from './auth/auth.module';
import { UserService } from './user/user.service';

// 4. Relative imports
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
```

### Path Aliases

```typescript
// tsconfig.json paths configuration
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@config/*": ["config/*"],
      "@test/*": ["test/*"]
    }
  }
}

// Usage
import { UserService } from '@/user/user.service';
import { TypeOrmConfigService } from '@config/configuration';
```

## Scalability Considerations

### 1. Module Boundaries

```typescript
// Clear module boundaries
@Module({
  imports: [UserModule],        // Import modules, not services
  providers: [MarketingService],
})
export class MarketingModule {}

// Service dependencies through module imports
@Injectable()
export class MarketingService {
  constructor(
    private userService: UserService  // Available through UserModule
  ) {}
}
```

### 2. Feature Modules

As the application grows, consider splitting large modules:

```
// Before: Large user module
user/
├── user.module.ts
├── user.controller.ts
├── user.service.ts
├── profile.controller.ts
├── profile.service.ts
└── settings.controller.ts

// After: Split into focused modules
user/
├── user.module.ts
├── user.controller.ts
└── user.service.ts

user-profile/
├── user-profile.module.ts
├── user-profile.controller.ts
└── user-profile.service.ts

user-settings/
├── user-settings.module.ts
├── user-settings.controller.ts
└── user-settings.service.ts
```

### 3. Shared Libraries

For very large applications, consider extracting common functionality:

```
libs/
├── common/
│   ├── decorators/
│   ├── guards/
│   └── pipes/
├── database/
│   ├── entities/
│   └── repositories/
└── external/
    ├── email/
    └── storage/
```

## Best Practices

### 1. Consistent Structure

- Follow the same structure for all feature modules
- Use consistent naming conventions
- Group related files together

### 2. Clear Dependencies

- Import modules, not individual services
- Keep dependencies explicit and minimal
- Use interfaces for loose coupling

### 3. Separation of Concerns

- Controllers handle HTTP concerns only
- Services contain business logic
- Entities define data structure
- DTOs handle data validation and transformation

### 4. Documentation

- Include README files for complex modules
- Document module responsibilities
- Maintain architectural decision records

## Adding New Features

When adding a new feature:

1. **Create the module directory**:
```bash
mkdir src/new-feature
```

2. **Create the basic files**:
```bash
touch src/new-feature/new-feature.module.ts
touch src/new-feature/new-feature.controller.ts
touch src/new-feature/new-feature.service.ts
```

3. **Add subdirectories as needed**:
```bash
mkdir src/new-feature/dto
mkdir src/new-feature/entities
```

4. **Import in AppModule**:
```typescript
@Module({
  imports: [
    // ... existing modules
    NewFeatureModule,
  ],
})
export class AppModule {}
```

## Next Steps

- Learn about [Modules & Dependency Injection](../nestjs-features/modules-di.md)
- Understand [Controllers & Routing](../nestjs-features/controllers-routing.md)
- Explore [Database Integration](../nestjs-features/database-typeorm.md)

---

*A well-organized project structure is crucial for maintainability and team collaboration. Follow consistent patterns and keep related code together.*