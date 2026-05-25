# Controllers & Routing

## What are Controllers?

Controllers are responsible for handling incoming HTTP requests and returning responses to the client. They act as the interface between your application and the outside world.

## Why Use Controllers?

- **Request Handling**: Process HTTP requests (GET, POST, PUT, DELETE, etc.)
- **Route Definition**: Define URL endpoints for your API
- **Data Validation**: Validate incoming request data
- **Response Formatting**: Structure and return appropriate responses
- **Middleware Integration**: Apply guards, interceptors, and pipes

## How Controllers Work in This Project

### Basic Controller Structure

```typescript
// From marketing.controller.ts
@ApiTags('marketing')  // Swagger documentation tag
@Controller('marketing')  // Base route: /marketing
export class MarketingController {
  constructor(private marketingService: MarketingService) {}

  @UseGuards(ApiKeyGuard)  // Apply security guard
  @Post('contactus')  // POST /marketing/contactus
  @ApiSecurity('apiKey')  // Swagger security documentation
  async sendContactUsEmail(@Body() contactUsDto: ContactUsDTO) {
    return await this.marketingService.processContactUsRequest(contactUsDto);
  }
}
```

### Key Decorators Explained

#### @Controller()
```typescript
@Controller('marketing')  // All routes start with /marketing
@Controller()  // Routes start from root /
```

#### HTTP Method Decorators
```typescript
@Get()          // GET request
@Post()         // POST request
@Put()          // PUT request
@Delete()       // DELETE request
@Patch()        // PATCH request
```

#### Route Parameters
```typescript
@Get(':id')  // GET /users/123
getUser(@Param('id') id: string) {
  return this.userService.findOne(id);
}

@Get()  // GET /users?page=1&limit=10
getUsers(@Query('page') page: number, @Query('limit') limit: number) {
  return this.userService.findAll(page, limit);
}
```

## Request Data Handling

### Body Data with DTOs

```typescript
@Post('contactus')
async sendContactUsEmail(@Body() contactUsDto: ContactUsDTO) {
  // contactUsDto is automatically validated against ContactUsDTO class
  return await this.marketingService.processContactUsRequest(contactUsDto);
}
```

**What happens:**
1. Request body is parsed
2. Data is validated against `ContactUsDTO` class
3. If validation fails, automatic error response
4. If valid, data is passed to the method

### DTO Example from This Project

```typescript
// From contact-us.dto.ts
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

## Security with Guards

### API Key Protection

```typescript
@UseGuards(ApiKeyGuard)
@Post('contactus')
@ApiSecurity('apiKey')
async sendContactUsEmail(@Body() contactUsDto: ContactUsDTO) {
  // This endpoint requires a valid API key
}
```

### Multiple Guards

```typescript
@UseGuards(ApiKeyGuard, RoleGuard)
@Post('admin-only')
async adminOnlyEndpoint() {
  // Requires both API key AND admin role
}
```

## Response Handling

### Automatic JSON Responses

```typescript
@Get('users')
async getUsers() {
  return { users: await this.userService.findAll() };
  // Automatically converted to JSON response
}
```

### Custom Status Codes

```typescript
@Post('users')
@HttpCode(201)  // Created status
async createUser(@Body() createUserDto: CreateUserDto) {
  return await this.userService.create(createUserDto);
}
```

### Error Responses

```typescript
@Get('users/:id')
async getUser(@Param('id') id: string) {
  const user = await this.userService.findOne(id);
  if (!user) {
    throw new NotFoundException('User not found');
  }
  return user;
}
```

## API Documentation Integration

### Swagger Decorators

```typescript
@ApiTags('marketing')  // Groups endpoints in Swagger UI
@Controller('marketing')
export class MarketingController {
  
  @Post('contactus')
  @ApiOperation({ summary: 'Send contact us email' })
  @ApiResponse({ status: 201, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiSecurity('apiKey')
  async sendContactUsEmail(@Body() contactUsDto: ContactUsDTO) {
    // Implementation
  }
}
```

## Advanced Routing Patterns

### Nested Routes

```typescript
@Controller('users')
export class UsersController {
  
  @Get(':userId/posts')
  getUserPosts(@Param('userId') userId: string) {
    return this.postsService.findByUser(userId);
  }
  
  @Post(':userId/posts')
  createUserPost(
    @Param('userId') userId: string,
    @Body() createPostDto: CreatePostDto
  ) {
    return this.postsService.create(userId, createPostDto);
  }
}
```

### Query Parameters

```typescript
@Get('search')
searchUsers(
  @Query('q') query: string,
  @Query('page', ParseIntPipe) page: number = 1,
  @Query('limit', ParseIntPipe) limit: number = 10
) {
  return this.userService.search(query, page, limit);
}
```

### Headers and Custom Decorators

```typescript
@Get('profile')
getProfile(
  @Headers('authorization') auth: string,
  @Req() request: Request
) {
  // Access headers and request object
}
```

## File Upload Handling

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  return await this.fileUploadService.upload(file);
}
```

## Controller Best Practices from This Project

### 1. Keep Controllers Thin

```typescript
// Good: Delegate business logic to services
@Post('contactus')
async sendContactUsEmail(@Body() contactUsDto: ContactUsDTO) {
  return await this.marketingService.processContactUsRequest(contactUsDto);
}

// Avoid: Business logic in controller
@Post('contactus')
async sendContactUsEmail(@Body() contactUsDto: ContactUsDTO) {
  // Don't put complex business logic here
  const email = this.buildEmail(contactUsDto);
  await this.emailService.send(email);
  await this.crmService.createLead(contactUsDto);
  // ... more logic
}
```

### 2. Use DTOs for Validation

```typescript
// Always use DTOs for request bodies
@Post('users')
async createUser(@Body() createUserDto: CreateUserDto) {
  // DTO handles validation automatically
}
```

### 3. Apply Guards Consistently

```typescript
// Apply security guards to protected endpoints
@UseGuards(ApiKeyGuard)
@Post('protected-endpoint')
async protectedAction() {
  // Implementation
}
```

### 4. Document with Swagger

```typescript
@ApiTags('feature-name')
@Controller('feature')
export class FeatureController {
  
  @ApiOperation({ summary: 'Clear description of what this does' })
  @ApiResponse({ status: 200, description: 'Success response description' })
  @Post('action')
  async performAction() {
    // Implementation
  }
}
```

## Error Handling in Controllers

### Built-in HTTP Exceptions

```typescript
import { 
  BadRequestException, 
  NotFoundException, 
  UnauthorizedException,
  ForbiddenException,
  ConflictException
} from '@nestjs/common';

@Get('users/:id')
async getUser(@Param('id') id: string) {
  if (!id) {
    throw new BadRequestException('User ID is required');
  }
  
  const user = await this.userService.findOne(id);
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  return user;
}
```

## Testing Controllers

```typescript
// Example test structure
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

  it('should send contact us email', async () => {
    const dto = { /* test data */ };
    await controller.sendContactUsEmail(dto);
    expect(service.processContactUsRequest).toHaveBeenCalledWith(dto);
  });
});
```

## Adding New Endpoints

When adding new functionality:

1. **Create the DTO** for request validation
2. **Add the controller method** with appropriate decorators
3. **Implement business logic** in the service
4. **Add Swagger documentation**
5. **Write tests**

```typescript
@Post('new-feature')
@ApiOperation({ summary: 'Description of new feature' })
@UseGuards(ApiKeyGuard)
async newFeature(@Body() dto: NewFeatureDto) {
  return await this.service.handleNewFeature(dto);
}
```

## Next Steps

- Learn about [Guards & Authentication](./guards-auth.md)
- Understand [Validation & DTOs](./validation-dtos.md)
- Explore [Database Integration](./database-typeorm.md)

---

*Controllers are the entry point to your application. Keep them focused on handling HTTP concerns and delegate business logic to services.*