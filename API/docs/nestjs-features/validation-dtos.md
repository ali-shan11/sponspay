# Validation & DTOs

## What are DTOs?

Data Transfer Objects (DTOs) are objects that define how data will be sent over the network. In NestJS, DTOs are used with class-validator to automatically validate incoming request data.

## Why Use DTOs?

- **Data Validation**: Automatically validate request data
- **Type Safety**: Ensure data matches expected structure
- **Documentation**: Self-documenting API contracts
- **Transformation**: Convert and sanitize input data
- **Security**: Prevent unwanted data from reaching your application

## How Validation Works in This Project

### Global Validation Setup

```typescript
// From main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Strip unknown properties
    forbidNonWhitelisted: true, // Throw error for unknown properties
    transform: true,           // Transform payloads to DTO instances
  }),
);
```

**Configuration explained:**
- `whitelist: true` - Only properties defined in DTO are allowed
- `forbidNonWhitelisted: true` - Reject requests with extra properties
- `transform: true` - Convert plain objects to DTO class instances

## DTO Example from This Project

### Contact Us DTO

```typescript
// From contact-us.dto.ts
import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsIn,
  Matches,
} from 'class-validator';

export class ContactUsDTO {
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['creator', 'brand', 'other'])
  interest: string;

  @IsString()
  @MinLength(10)
  @MaxLength(200)
  message: string;

  @IsString()
  country: string;

  @IsString()
  @Matches(/^$|^\+[1-9]\d{1,14}$/, {
    message: 'phoneNumber must be a valid E.164 formatted number or an empty string',
  })
  phoneNumber?: string;
}
```

### Using the DTO in Controllers

```typescript
// From marketing.controller.ts
@Post('contactus')
async sendContactUsEmail(@Body() contactUsDto: ContactUsDTO) {
  // contactUsDto is automatically validated
  return await this.marketingService.processContactUsRequest(contactUsDto);
}
```

**What happens automatically:**
1. Request body is parsed
2. Data is validated against DTO rules
3. If validation fails, 400 Bad Request is returned
4. If valid, data is passed to the method as a DTO instance

## Common Validation Decorators

### String Validation

```typescript
@IsString()
@MinLength(2, { message: 'Name must be at least 2 characters' })
@MaxLength(50, { message: 'Name cannot exceed 50 characters' })
name: string;

@IsString()
@IsNotEmpty()
title: string;

@IsOptional() // Field is optional
@IsString()
description?: string;
```

### Email and Format Validation

```typescript
@IsEmail({}, { message: 'Please provide a valid email address' })
email: string;

@Matches(/^\+[1-9]\d{1,14}$/, {
  message: 'Phone number must be in E.164 format'
})
phoneNumber: string;

@IsUrl()
website: string;
```

### Number Validation

```typescript
@IsNumber()
@Min(0)
@Max(100)
percentage: number;

@IsInt()
@IsPositive()
age: number;

@IsOptional()
@IsNumber()
@Transform(({ value }) => parseFloat(value)) // Transform string to number
price?: number;
```

### Array and Object Validation

```typescript
@IsArray()
@ArrayMinSize(1)
@ArrayMaxSize(10)
@IsString({ each: true }) // Validate each array element
tags: string[];

@ValidateNested()
@Type(() => AddressDTO)
address: AddressDTO;

@IsArray()
@ValidateNested({ each: true })
@Type(() => ItemDTO)
items: ItemDTO[];
```

### Enum and Choice Validation

```typescript
@IsEnum(UserRole)
role: UserRole;

@IsIn(['creator', 'brand', 'other'])
interest: string;

@IsBoolean()
isActive: boolean;
```

### Date Validation

```typescript
@IsDateString()
birthDate: string;

@IsDate()
@Type(() => Date)
createdAt: Date;
```

## Advanced Validation Patterns

### Custom Validation Messages

```typescript
export class CreateUserDTO {
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(20, { message: 'Username cannot exceed 20 characters' })
  username: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}
```

### Conditional Validation

```typescript
export class UpdateUserDTO {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @ValidateIf(o => o.firstName || o.lastName)
  @IsString()
  @IsNotEmpty()
  displayName: string; // Required if firstName or lastName provided
}
```

### Custom Validators

```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
          return typeof value === 'string' && strongPasswordRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Password must contain at least 8 characters, including uppercase, lowercase, number and special character';
        },
      },
    });
  };
}

// Usage
export class CreateUserDTO {
  @IsStrongPassword()
  password: string;
}
```

## Data Transformation

### Type Transformation

```typescript
import { Transform, Type } from 'class-transformer';

export class QueryDTO {
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page: number;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number;

  @Transform(({ value }) => value.toLowerCase())
  @IsString()
  search: string;

  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeDeleted: boolean;
}
```

### Nested Object Transformation

```typescript
export class AddressDTO {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  @Matches(/^\d{5}$/)
  zipCode: string;
}

export class CreateUserDTO {
  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => AddressDTO)
  address: AddressDTO;
}
```

## Error Handling

### Automatic Error Responses

When validation fails, NestJS automatically returns:

```json
{
  "statusCode": 400,
  "message": [
    "firstName must be at least 2 characters",
    "email must be an email",
    "interest must be one of the following values: creator, brand, other"
  ],
  "error": "Bad Request"
}
```

### Custom Error Handling

```typescript
// Custom validation pipe
@Injectable()
export class CustomValidationPipe extends ValidationPipe {
  public createExceptionFactory() {
    return (validationErrors: ValidationError[] = []) => {
      const errors = this.flattenValidationErrors(validationErrors);
      return new BadRequestException({
        statusCode: 400,
        error: 'Validation Failed',
        message: 'The request contains invalid data',
        details: errors,
      });
    };
  }

  private flattenValidationErrors(validationErrors: ValidationError[]): any[] {
    return validationErrors.map((error) => ({
      field: error.property,
      errors: Object.values(error.constraints || {}),
    }));
  }
}
```

## DTO Best Practices from This Project

### 1. Specific Validation Rules

```typescript
// Good: Specific validation for phone numbers
@Matches(/^$|^\+[1-9]\d{1,14}$/, {
  message: 'phoneNumber must be a valid E.164 formatted number or an empty string',
})
phoneNumber?: string;

// Good: Restrict to specific values
@IsIn(['creator', 'brand', 'other'])
interest: string;
```

### 2. Meaningful Error Messages

```typescript
@MinLength(10, { message: 'Message must be at least 10 characters long' })
@MaxLength(200, { message: 'Message cannot exceed 200 characters' })
message: string;
```

### 3. Optional vs Required Fields

```typescript
// Required fields
@IsString()
@MinLength(2)
firstName: string;

// Optional fields
@IsOptional()
@IsString()
phoneNumber?: string;
```

### 4. Separate DTOs for Different Operations

```typescript
// Create operation
export class CreateUserDTO {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;
}

// Update operation
export class UpdateUserDTO {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // No password field - handled separately
}
```

## Testing DTOs

### Unit Testing Validation

```typescript
import { validate } from 'class-validator';
import { ContactUsDTO } from './contact-us.dto';

describe('ContactUsDTO', () => {
  it('should validate a valid contact us request', async () => {
    const dto = new ContactUsDTO();
    dto.firstName = 'John';
    dto.lastName = 'Doe';
    dto.email = 'john@example.com';
    dto.interest = 'creator';
    dto.message = 'This is a test message that is long enough';
    dto.country = 'US';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for invalid email', async () => {
    const dto = new ContactUsDTO();
    dto.email = 'invalid-email';

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation for short message', async () => {
    const dto = new ContactUsDTO();
    dto.message = 'short';

    const errors = await validate(dto);
    expect(errors[0].constraints).toHaveProperty('minLength');
  });
});
```

### Integration Testing

```typescript
describe('POST /marketing/contactus', () => {
  it('should accept valid contact us data', () => {
    return request(app.getHttpServer())
      .post('/marketing/contactus')
      .set('Api-Key', 'valid-key')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        interest: 'creator',
        message: 'This is a valid message that meets length requirements',
        country: 'US'
      })
      .expect(201);
  });

  it('should reject invalid email format', () => {
    return request(app.getHttpServer())
      .post('/marketing/contactus')
      .set('Api-Key', 'valid-key')
      .send({
        firstName: 'John',
        email: 'invalid-email'
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('email must be an email');
      });
  });
});
```

## Creating New DTOs

When adding new endpoints:

1. **Create the DTO file**:
```typescript
// src/feature/dto/create-feature.dto.ts
export class CreateFeatureDTO {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

2. **Use in controller**:
```typescript
@Post()
async create(@Body() createFeatureDto: CreateFeatureDTO) {
  return this.featureService.create(createFeatureDto);
}
```

3. **Add Swagger documentation**:
```typescript
@ApiProperty({ description: 'Feature name', minLength: 1 })
@IsString()
@MinLength(1)
name: string;
```

## Next Steps

- Learn about [Database Integration](./database-typeorm.md)
- Understand [Project Structure](../architecture/project-structure.md)
- Explore [API Documentation](../integrations/swagger.md)

---

*DTOs provide a robust way to validate and transform incoming data. They serve as contracts between your API and clients, ensuring data integrity and providing clear documentation.*