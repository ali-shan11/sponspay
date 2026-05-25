# API Documentation with Swagger

## What is Swagger/OpenAPI?

Swagger (now OpenAPI) is a specification for describing REST APIs. It provides a standard way to document your API endpoints, request/response schemas, authentication methods, and more.

## Why Use Swagger with NestJS?

- **Auto-generated Documentation**: Automatically creates API docs from your code
- **Interactive Testing**: Test API endpoints directly from the documentation
- **Type Safety**: Ensures documentation matches actual implementation
- **Client Generation**: Generate client SDKs in multiple languages
- **Team Collaboration**: Provides a single source of truth for API contracts

## Swagger Setup in This Project

### Document Configuration

```typescript
// From main.ts
const config = new DocumentBuilder()
  .addSecurity('apiKey', {
    type: 'apiKey',
    name: 'Api-Key',
    'x-tokenName': 'X-Api-Key',
  })
  .addBearerAuth()  // JWT authentication
  .setTitle('SponsPay')
  .setDescription('API for SponsPay')
  .setVersion('0.0.1')
  .build();

const document = SwaggerModule.createDocument(app, config);
```

**Key Features:**
- **API Key Security**: Defines header-based API key authentication
- **Bearer Auth**: JWT token authentication
- **Metadata**: Title, description, and version information

### Scalar API Reference Integration

```typescript
// Using Scalar instead of standard Swagger UI
app.use(
  '/documentation',
  apiReference({
    theme: 'purple',
    spec: {
      content: document,
    },
  }),
);
```

**Why Scalar?**
- Modern, clean interface
- Better performance
- Enhanced user experience
- Customizable themes

## Controller Documentation

### Basic Controller Documentation

```typescript
// From marketing.controller.ts
@ApiTags('marketing')  // Groups endpoints in documentation
@Controller('marketing')
export class MarketingController {
  
  @Post('contactus')
  @ApiSecurity('apiKey')  // Indicates API key required
  async sendContactUsEmail(@Body() contactUsDto: ContactUsDTO) {
    return await this.marketingService.processContactUsRequest(contactUsDto);
  }
}
```

### Advanced Endpoint Documentation

```typescript
@ApiTags('users')
@Controller('users')
export class UsersController {
  
  @Get()
  @ApiOperation({ 
    summary: 'Get all users',
    description: 'Retrieves a paginated list of all users in the system'
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    type: Number, 
    description: 'Page number (default: 1)' 
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: 'Items per page (default: 10, max: 100)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Users retrieved successfully',
    type: [UserResponseDto]
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid query parameters' 
  })
  @ApiSecurity('apiKey')
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(page, limit);
  }
  
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ 
    type: CreateUserDto,
    description: 'User data for creation'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'User created successfully',
    type: UserResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid user data' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'User with this email already exists' 
  })
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
  
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User found',
    type: UserResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found' 
  })
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }
}
```

## DTO Documentation

### Basic DTO Documentation

```typescript
// Enhanced version of ContactUsDTO with Swagger decorators
export class ContactUsDTO {
  @ApiProperty({
    description: 'User first name',
    minLength: 2,
    example: 'John'
  })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    minLength: 2,
    example: 'Doe'
  })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({
    description: 'User email address',
    format: 'email',
    example: 'john.doe@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User interest category',
    enum: ['creator', 'brand', 'other'],
    example: 'creator'
  })
  @IsString()
  @IsIn(['creator', 'brand', 'other'])
  interest: string;

  @ApiProperty({
    description: 'Contact message',
    minLength: 10,
    maxLength: 200,
    example: 'I am interested in learning more about your platform.'
  })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  message: string;

  @ApiProperty({
    description: 'Country code',
    example: 'US'
  })
  @IsString()
  country: string;

  @ApiPropertyOptional({
    description: 'Phone number in E.164 format',
    pattern: '^$|^\\+[1-9]\\d{1,14}$',
    example: '+1234567890'
  })
  @IsString()
  @Matches(/^$|^\+[1-9]\d{1,14}$/, {
    message: 'phoneNumber must be a valid E.164 formatted number or an empty string',
  })
  phoneNumber?: string;
}
```

### Response DTO Documentation

```typescript
export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    format: 'email',
    example: 'user@example.com'
  })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe'
  })
  name: string;

  @ApiProperty({
    description: 'Account creation timestamp',
    format: 'date-time',
    example: '2023-01-01T00:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    format: 'date-time',
    example: '2023-01-01T00:00:00.000Z'
  })
  updatedAt: Date;
}
```

### Nested DTO Documentation

```typescript
export class AddressDto {
  @ApiProperty({ description: 'Street address', example: '123 Main St' })
  street: string;

  @ApiProperty({ description: 'City name', example: 'New York' })
  city: string;

  @ApiProperty({ description: 'ZIP code', example: '10001' })
  zipCode: string;
}

export class CreateUserDto {
  @ApiProperty({ description: 'User name', example: 'John Doe' })
  name: string;

  @ApiProperty({ description: 'User email', example: 'john@example.com' })
  email: string;

  @ApiProperty({ 
    description: 'User address',
    type: AddressDto
  })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}
```

## Authentication Documentation

### API Key Authentication

```typescript
// In main.ts DocumentBuilder
.addSecurity('apiKey', {
  type: 'apiKey',
  name: 'Api-Key',        // Header name
  in: 'header',           // Location of the key
  description: 'API key for external access'
})

// In controller
@ApiSecurity('apiKey')
@Post('protected-endpoint')
protectedEndpoint() {
  // Implementation
}
```

### JWT Bearer Authentication

```typescript
// In main.ts DocumentBuilder
.addBearerAuth({
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Firebase JWT token'
})

// In controller
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Get('profile')
getProfile() {
  // Implementation
}
```

### Multiple Authentication Methods

```typescript
@ApiSecurity('apiKey')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard, JwtGuard) // Either auth method works
@Post('flexible-endpoint')
flexibleEndpoint() {
  // Implementation
}
```

## Advanced Swagger Features

### File Upload Documentation

```typescript
@Post('upload')
@ApiOperation({ summary: 'Upload a file' })
@ApiConsumes('multipart/form-data')
@ApiBody({
  description: 'File upload',
  type: 'multipart/form-data',
  schema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
      },
      description: {
        type: 'string',
        description: 'File description'
      }
    },
  },
})
@UseInterceptors(FileInterceptor('file'))
async uploadFile(
  @UploadedFile() file: Express.Multer.File,
  @Body('description') description: string
) {
  return this.fileService.upload(file, description);
}
```

### Pagination Documentation

```typescript
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Array of items' })
  data: T[];

  @ApiProperty({ description: 'Total number of items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  totalPages: number;
}

@Get()
@ApiResponse({
  status: 200,
  description: 'Paginated users list',
  schema: {
    allOf: [
      { $ref: getSchemaPath(PaginatedResponseDto) },
      {
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(UserResponseDto) },
          },
        },
      },
    ],
  },
})
async getUsers() {
  // Implementation
}
```

### Error Response Documentation

```typescript
export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP status code', example: 400 })
  statusCode: number;

  @ApiProperty({ 
    description: 'Error message(s)',
    oneOf: [
      { type: 'string', example: 'Validation failed' },
      { type: 'array', items: { type: 'string' }, example: ['email must be an email', 'name is required'] }
    ]
  })
  message: string | string[];

  @ApiProperty({ description: 'Error type', example: 'Bad Request' })
  error: string;

  @ApiProperty({ description: 'Request timestamp', example: '2023-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ description: 'Request path', example: '/api/users' })
  path: string;
}

// Use in controller responses
@ApiResponse({
  status: 400,
  description: 'Validation error',
  type: ErrorResponseDto
})
@ApiResponse({
  status: 404,
  description: 'Resource not found',
  type: ErrorResponseDto
})
```

## Custom Decorators for Documentation

### Common Response Decorator

```typescript
export const ApiCommonResponses = () => {
  return applyDecorators(
    ApiResponse({ status: 400, description: 'Bad Request', type: ErrorResponseDto }),
    ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
    ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto }),
    ApiResponse({ status: 500, description: 'Internal Server Error', type: ErrorResponseDto }),
  );
};

// Usage
@Get()
@ApiCommonResponses()
@ApiResponse({ status: 200, description: 'Success', type: [UserResponseDto] })
async getUsers() {
  // Implementation
}
```

### Paginated Response Decorator

```typescript
export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiOkResponse({
      description: 'Paginated response',
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
};

// Usage
@Get()
@ApiPaginatedResponse(UserResponseDto)
async getUsers() {
  // Implementation
}
```

## Environment-Specific Documentation

### Conditional Documentation

```typescript
// In main.ts
const configService = app.get(ConfigService);
const nodeEnv = configService.get('NODE_ENV');

// Only enable Swagger in development and staging
if (nodeEnv !== 'production') {
  const document = SwaggerModule.createDocument(app, config);
  
  app.use(
    '/documentation',
    apiReference({
      theme: 'purple',
      spec: {
        content: document,
      },
    }),
  );
}
```

### Multiple API Versions

```typescript
// V1 API
const configV1 = new DocumentBuilder()
  .setTitle('API v1')
  .setVersion('1.0')
  .addTag('v1')
  .build();

const documentV1 = SwaggerModule.createDocument(app, configV1, {
  include: [V1Module],
});

SwaggerModule.setup('api/v1/docs', app, documentV1);

// V2 API
const configV2 = new DocumentBuilder()
  .setTitle('API v2')
  .setVersion('2.0')
  .addTag('v2')
  .build();

const documentV2 = SwaggerModule.createDocument(app, configV2, {
  include: [V2Module],
});

SwaggerModule.setup('api/v2/docs', app, documentV2);
```

## Best Practices

### 1. Comprehensive Documentation

```typescript
// Good: Detailed documentation
@ApiOperation({ 
  summary: 'Create user account',
  description: 'Creates a new user account with the provided information. Email must be unique.'
})
@ApiBody({ 
  type: CreateUserDto,
  description: 'User registration data'
})
@ApiResponse({ 
  status: 201, 
  description: 'User created successfully',
  type: UserResponseDto
})
@ApiResponse({ 
  status: 409, 
  description: 'Email already exists'
})
```

### 2. Consistent Response Formats

```typescript
// Use consistent response DTOs
export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiProperty({ description: 'Response message', example: 'Operation completed successfully' })
  message: string;
}
```

### 3. Security Documentation

```typescript
// Always document security requirements
@ApiSecurity('apiKey')
@ApiOperation({ 
  summary: 'Protected endpoint',
  description: 'This endpoint requires a valid API key in the Api-Key header'
})
```

### 4. Example Values

```typescript
// Provide realistic examples
@ApiProperty({
  description: 'User email address',
  example: 'john.doe@company.com', // Realistic example
  format: 'email'
})
email: string;
```

## Testing API Documentation

### Accessing Documentation

```bash
# Start the application
npm run start:dev

# Access Scalar documentation
open http://localhost:3000/documentation

# Test endpoints directly from the documentation interface
```

### Validating Documentation

```typescript
// Test that Swagger document is generated correctly
describe('Swagger Documentation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should generate OpenAPI document', () => {
    const config = new DocumentBuilder()
      .setTitle('Test API')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    
    expect(document.info.title).toBe('Test API');
    expect(document.paths).toBeDefined();
    expect(Object.keys(document.paths).length).toBeGreaterThan(0);
  });
});
```

## Next Steps

- Learn about [Controllers & Routing](../nestjs-features/controllers-routing.md)
- Understand [Validation & DTOs](../nestjs-features/validation-dtos.md)
- Explore [Authentication](../nestjs-features/guards-auth.md)

---

*Good API documentation is essential for developer experience. Use Swagger decorators to create comprehensive, interactive documentation that stays in sync with your code.*