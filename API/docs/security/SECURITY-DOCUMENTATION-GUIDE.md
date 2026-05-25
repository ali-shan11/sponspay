# Security Documentation Guide

This guide defines standards for documenting security requirements in API endpoints using Swagger decorators.

## Overview

Every API endpoint should clearly communicate its security requirements to developers. This includes:
- Authentication methods
- Authorization requirements (roles/permissions)
- Rate limiting rules
- Data sensitivity levels
- Audit logging status
- Security considerations and best practices

## Custom Decorators

We provide custom decorators in `src/decorators/api-security-docs.decorator.ts` to standardize security documentation.

### Available Decorators

#### 1. `ApiSecurityProfile(config)`

Generates a formatted security profile section for operation descriptions.

**Usage:**
```typescript
import { ApiSecurityProfile } from '../decorators/api-security-docs.decorator';

@ApiOperation({
  summary: 'Create payment account',
  description: ApiSecurityProfile({
    auth: 'Firebase JWT',
    authLocation: 'Authorization Bearer header',
    authorization: 'Creator role or higher',
    rateLimit: '3 requests per minute',
    dataSensitivity: 'Critical',
    auditLogging: 'Yes - All operations logged with phone masking',
    securityConsiderations: [
      'Database transactions ensure consistency',
      'Phone numbers validated and sanitized',
      'Failed attempts trigger account locking after 5 tries'
    ],
    commonErrors: {
      '401': 'Missing or invalid Firebase JWT token',
      '403': 'Insufficient permissions - Creator role required',
      '429': 'Rate limit exceeded - Maximum 3 requests per minute'
    }
  }) + '\n\n' + 
  'Creates a new payment account for the authenticated creator...'
})
```

**Renders in Swagger as:**
```
SECURITY PROFILE

Authentication: Firebase JWT
Auth Location: Authorization Bearer header
Authorization: Creator role or higher
Rate Limit: 3 requests per minute
Data Sensitivity: Critical
Audit Logging: Yes - All operations logged with phone masking

Security Considerations:
- Database transactions ensure consistency
- Phone numbers validated and sanitized
- Failed attempts trigger account locking after 5 tries

Common Security Errors:
- 401: Missing or invalid Firebase JWT token
- 403: Insufficient permissions - Creator role required
- 429: Rate limit exceeded - Maximum 3 requests per minute
```

#### 2. `ApiSecureEndpoint(config)`

Composite decorator that combines authentication, authorization, and rate limiting.

**Usage:**
```typescript
import { ApiSecureEndpoint } from '../decorators/api-security-docs.decorator';
import { UserRole } from '../creator/enums/user.enum';

@ApiSecureEndpoint({
  auth: 'firebase-jwt',
  role: UserRole.Creator,
  rateLimit: '5 requests per minute'
})
@Post('protected-endpoint')
async protectedOperation() {
  // Implementation
}
```

**What it does:**
- Adds `@ApiBearerAuth()` (or `@ApiSecurity('apiKey')` for API key auth)
- Adds 401 Unauthorized response documentation
- Adds 403 Forbidden response documentation (if role specified)
- Adds 429 Too Many Requests response documentation (if rate limit specified)

#### 3. `ApiAuthRequired(authType)`

Documents authentication requirements only.

**Usage:**
```typescript
import { ApiAuthRequired } from '../decorators/api-security-docs.decorator';

// API Key authentication
@ApiAuthRequired('apiKey')
@Post('public-endpoint')

// Firebase JWT authentication
@ApiAuthRequired('firebase-jwt')
@Post('user-endpoint')

// Both methods accepted
@ApiAuthRequired('both')
@Post('flexible-endpoint')
```

#### 4. `ApiRoleRequired(role)`

Documents role-based authorization.

**Usage:**
```typescript
import { ApiRoleRequired } from '../decorators/api-security-docs.decorator';
import { UserRole } from '../creator/enums/user.enum';

@ApiRoleRequired(UserRole.Admin)
@Post('admin-only')
```

#### 5. `ApiRateLimited(limit)`

Documents rate limiting rules.

**Usage:**
```typescript
import { ApiRateLimited } from '../decorators/api-security-docs.decorator';

@ApiRateLimited('3 requests per minute')
@Post('rate-limited-endpoint')
```

#### 6. `ApiCommonResponses()`

Adds standard validation and server error responses.

**Usage:**
```typescript
import { ApiCommonResponses } from '../decorators/api-security-docs.decorator';

@ApiCommonResponses()
@Post('standard-endpoint')
```

Adds:
- 400 Bad Request (validation errors)
- 500 Internal Server Error

## Security Documentation Patterns

### Pattern 1: Public API Key Endpoint

**Use case:** Public endpoints that require API key authentication (e.g., contact forms, webhooks)

```typescript
@UseGuards(ApiKeyGuard)
@Post('contactus')
@ApiTags('marketing')
@ApiOperation({
  summary: 'Submit contact form',
  description: ApiSecurityProfile({
    auth: 'API Key',
    authLocation: 'api-key header',
    authorization: 'None - Public endpoint',
    rateLimit: '5 requests per minute',
    dataSensitivity: 'Public',
    auditLogging: 'No',
    securityConsiderations: [
      'Input sanitization applied to all fields',
      'Email validation enforced',
      'Phone number format validated (E.164)'
    ],
    commonErrors: {
      '401': 'Invalid or missing API key',
      '400': 'Invalid email format or missing required fields',
      '429': 'Rate limit exceeded - Maximum 5 requests per minute'
    }
  }) + '\n\n' +
  'Submits a contact form and creates/updates CRM record...'
})
@ApiResponse({ status: 201, description: 'Contact form submitted successfully' })
@ApiSecureEndpoint({
  auth: 'apiKey',
  rateLimit: '5 requests per minute'
})
@ApiCommonResponses()
async submitContactForm(@Body() dto: ContactUsDTO) {
  // Implementation
}
```

### Pattern 2: Authenticated User Endpoint

**Use case:** Endpoints for authenticated users without role restrictions

```typescript
@UseGuards(FirebaseAuthGuard)
@Get('profile')
@ApiTags('user')
@ApiOperation({
  summary: 'Get user profile',
  description: ApiSecurityProfile({
    auth: 'Firebase JWT',
    authLocation: 'Authorization Bearer header',
    authorization: 'Any authenticated user',
    rateLimit: '10 requests per minute',
    dataSensitivity: 'Internal',
    auditLogging: 'No',
    securityConsiderations: [
      'User ID extracted from verified JWT token',
      'Cannot access other users\' profiles'
    ],
    commonErrors: {
      '401': 'Missing or invalid Firebase JWT token',
      '404': 'User profile not found',
      '429': 'Rate limit exceeded'
    }
  }) + '\n\n' +
  'Retrieves the authenticated user\'s profile information...'
})
@ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
@ApiSecureEndpoint({
  auth: 'firebase-jwt',
  rateLimit: '10 requests per minute'
})
@ApiCommonResponses()
async getUserProfile(@Req() req: Request) {
  // Implementation
}
```

### Pattern 3: Role-Protected Endpoint

**Use case:** Endpoints restricted to specific roles (Creator, Admin)

```typescript
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Post('onboard')
@Role(UserRole.Creator)
@ApiTags('creator', 'onboarding')
@ApiOperation({
  summary: 'Onboard as creator',
  description: ApiSecurityProfile({
    auth: 'Firebase JWT',
    authLocation: 'Authorization Bearer header',
    authorization: 'Creator role or higher',
    rateLimit: '3 requests per minute',
    dataSensitivity: 'Sensitive',
    auditLogging: 'Yes - User creation and role assignment logged',
    securityConsiderations: [
      'Database transaction ensures atomicity',
      'Telegram channel creation via external API',
      'Transaction rolled back on any failure',
      'Idempotent - safe to retry'
    ],
    commonErrors: {
      '401': 'Missing or invalid Firebase JWT token',
      '403': 'Insufficient permissions - Creator role required',
      '400': 'Invalid request data or telegram handle unavailable',
      '429': 'Rate limit exceeded - Maximum 3 requests per minute',
      '500': 'Transaction failed - safe to retry'
    }
  }) + '\n\n' +
  'Onboards the authenticated user as a Creator...'
})
@ApiResponse({ status: 201, description: 'Creator onboarded successfully' })
@ApiResponse({ status: 200, description: 'Already onboarded' })
@ApiSecureEndpoint({
  auth: 'firebase-jwt',
  role: UserRole.Creator,
  rateLimit: '3 requests per minute'
})
@ApiCommonResponses()
async onboardCreator(@Body() dto: CreateCreatorDto, @Req() req: Request) {
  // Implementation
}
```

### Pattern 4: Critical Security Endpoint

**Use case:** Endpoints handling sensitive data with strict security (payment accounts, financial data)

```typescript
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Post('accounts')
@Role(UserRole.Creator)
@ApiTags('accounts')
@ApiOperation({
  summary: 'Create payment account',
  description: ApiSecurityProfile({
    auth: 'Firebase JWT',
    authLocation: 'Authorization Bearer header',
    authorization: 'Creator role or higher',
    rateLimit: '3 requests per minute',
    dataSensitivity: 'Critical',
    auditLogging: 'Yes - All operations logged with phone masking',
    securityConsiderations: [
      'Cryptographically secure verification codes (crypto.randomInt)',
      'Database transactions ensure consistency',
      'Phone numbers validated using libphonenumber-js',
      'Input sanitization prevents XSS attacks',
      'Account takeover protection with verification',
      'Failed verification attempts tracked (locked after 5 failures)',
      'Phone numbers anonymized on deletion (SHA-256 with salt)'
    ],
    commonErrors: {
      '401': 'Missing or invalid Firebase JWT token',
      '403': 'Insufficient permissions - Creator role required',
      '400': 'Invalid phone number format (must be E.164)',
      '429': 'Rate limit exceeded - Maximum 3 requests per minute',
      '500': 'Database transaction failed'
    }
  }) + '\n\n' +
  'Creates a new payment account for the authenticated creator...'
})
@ApiResponse({ status: 201, description: 'Account created successfully' })
@ApiSecureEndpoint({
  auth: 'firebase-jwt',
  role: UserRole.Creator,
  rateLimit: '3 requests per minute'
})
@ApiCommonResponses()
async createAccount(@Body() dto: CreateAccountDto, @Req() req: Request) {
  // Implementation
}
```

### Pattern 5: Admin-Only Endpoint

**Use case:** Administrative endpoints with highest security requirements

```typescript
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Delete('users/:id')
@Role(UserRole.Admin)
@ApiTags('admin')
@ApiOperation({
  summary: 'Delete user account',
  description: ApiSecurityProfile({
    auth: 'Firebase JWT',
    authLocation: 'Authorization Bearer header',
    authorization: 'Admin role required',
    rateLimit: '10 requests per minute',
    dataSensitivity: 'Critical',
    auditLogging: 'Yes - All administrative actions logged',
    securityConsiderations: [
      'Soft delete - data retained for recovery',
      'Cascading deletion of related resources',
      'Audit trail maintained',
      'Cannot be undone without admin intervention'
    ],
    commonErrors: {
      '401': 'Missing or invalid Firebase JWT token',
      '403': 'Forbidden - Admin role required',
      '404': 'User not found',
      '429': 'Rate limit exceeded'
    }
  }) + '\n\n' +
  'Soft deletes a user account and related resources...'
})
@ApiResponse({ status: 204, description: 'User deleted successfully' })
@ApiSecureEndpoint({
  auth: 'firebase-jwt',
  role: UserRole.Admin,
  rateLimit: '10 requests per minute'
})
@ApiCommonResponses()
async deleteUser(@Param('id') id: string) {
  // Implementation
}
```

## Data Sensitivity Levels

Choose the appropriate level based on the data handled:

| Level | Description | Examples |
|-------|-------------|----------|
| **Public** | Non-sensitive, publicly available data | Marketing content, public profiles, contact forms |
| **Internal** | Internal use data, not publicly shared | User preferences, non-financial settings |
| **Sensitive** | Personal data requiring protection | Email addresses, names, channel statistics |
| **Critical** | Financial or highly sensitive data | Payment accounts, phone numbers, financial transactions |

## Rate Limiting Guidelines

Standard rate limits by endpoint type:

| Endpoint Type | Rate Limit | Rationale |
|---------------|------------|-----------|
| **Public API Key** | 5-10 req/min | Prevent abuse while allowing legitimate use |
| **Read Operations** | 10-20 req/min | Allow reasonable data access |
| **Write Operations** | 3-5 req/min | Prevent rapid state changes |
| **Critical Operations** | 3 req/min | Maximum protection for sensitive operations |
| **Admin Operations** | 10 req/min | Admins need higher limits but still protected |

## Security Checklist

When documenting an endpoint, ensure you've addressed:

- [ ] Authentication method clearly specified
- [ ] Authorization requirements documented (if applicable)
- [ ] Rate limiting rules specified
- [ ] Data sensitivity level identified
- [ ] Audit logging status declared
- [ ] Security considerations listed
- [ ] Common error codes documented (401, 403, 429)
- [ ] Input validation requirements mentioned
- [ ] Transaction safety noted (if applicable)
- [ ] Idempotency behavior explained (if applicable)

## Testing Security Documentation

After adding security documentation:

1. **Visual Check:**
   - Start dev server: `npm run start:dev`
   - Open Swagger UI: `http://localhost:3000/documentation`
   - Verify security profile is rendered correctly
   - Check that security badge shows correct auth method

2. **Functionality Check:**
   - Verify guards are actually applied (`@UseGuards()`)
   - Confirm rate limiting is configured
   - Test auth rejection scenarios (401, 403)

3. **Consistency Check:**
   - Documentation matches actual implementation
   - Error codes documented match thrown errors
   - Rate limits match throttler configuration

## Common Mistakes to Avoid

❌ **Don't:** Document security in comments only
```typescript
// This endpoint requires Firebase JWT auth
@Post('endpoint')
```

✅ **Do:** Use decorators for Swagger documentation
```typescript
@ApiSecureEndpoint({ auth: 'firebase-jwt' })
@Post('endpoint')
```

---

❌ **Don't:** Mix authentication in description without structured format
```typescript
@ApiOperation({
  summary: 'Do something',
  description: 'This endpoint needs JWT and has rate limits'
})
```

✅ **Do:** Use `ApiSecurityProfile` for structured documentation
```typescript
@ApiOperation({
  summary: 'Do something',
  description: ApiSecurityProfile({
    auth: 'Firebase JWT',
    authLocation: 'Authorization Bearer header',
    // ... full profile
  })
})
```

---

❌ **Don't:** Forget to document error codes
```typescript
@ApiResponse({ status: 200, description: 'Success' })
```

✅ **Do:** Document all relevant error codes
```typescript
@ApiResponse({ status: 200, description: 'Success' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden' })
@ApiResponse({ status: 429, description: 'Too Many Requests' })
```

## Migration Guide

To update existing endpoints:

1. **Import decorators:**
```typescript
import {
  ApiSecurityProfile,
  ApiSecureEndpoint,
  ApiCommonResponses
} from '../decorators/api-security-docs.decorator';
```

2. **Add security profile to operation:**
```typescript
@ApiOperation({
  summary: 'Existing summary',
  description: ApiSecurityProfile({
    // ... config
  }) + '\n\n' + 'Existing description...'
})
```

3. **Replace manual security decorators:**
```typescript
// Before:
@UseGuards(FirebaseAuthGuard)
@ApiSecurity('firebase-jwt')
@ApiResponse({ status: 401, description: '...' })

// After:
@UseGuards(FirebaseAuthGuard)
@ApiSecureEndpoint({ auth: 'firebase-jwt' })
```

4. **Add common error responses:**
```typescript
@ApiCommonResponses()
```

## Examples by Module

See the following controllers for reference implementations:

- **Marketing Module:** `src/marketing/marketing.controller.ts`
  - Public API key endpoints
  - Admin role-protected endpoints
  
- **Creator Module:** `src/creator/creator.controller.ts`
  - Firebase JWT authentication
  - Complex authorization rules
  - Onboarding workflows

- **Accounts Module:** `src/accounts/accounts.controller.ts`
  - Critical security requirements
  - Rate limiting examples
  - Comprehensive audit logging

## Resources

- [Swagger/OpenAPI Specification](https://swagger.io/specification/)
- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Accounts Security Review](../accounts/SECURITY-REVIEW.md)

---

**Last Updated:** January 2025
**Maintainer:** Security Team
