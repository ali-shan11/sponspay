import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ApiSecurityProfile,
  ApiSecureEndpoint,
  ApiCommonResponses,
} from '../decorators/api-security-docs.decorator';
import { TermsService } from './terms.service';
import { UpdateTermsDto } from './dto/update-terms.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../decorators/role.decorator';
import { UserRole } from '../creator/enums/user.enum';

@ApiTags('terms')
@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get('latest')
  @ApiTags('onboarding')
  @ApiOperation({
    summary: 'Get the latest version of terms and conditions',
    description:
      ApiSecurityProfile({
        auth: 'None',
        authLocation: 'N/A - Public endpoint',
        authorization: 'None - Publicly accessible',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Public',
        auditLogging: 'No',
        securityConsiderations: [
          'Public endpoint for onboarding flow',
          'Returns current terms HTML content',
          'No sensitive information exposed',
          'Cacheable response',
        ],
        commonErrors: {
          '404': 'No terms available (development environment only)',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      "Retrieves the most recent version of the platform's terms and conditions. This endpoint is publicly accessible and does not require authentication.\n\n" +
      '**When to Call:**\n' +
      'Call this endpoint in the following scenarios:\n' +
      '- During creator onboarding, before displaying terms for user acceptance\n' +
      '- When showing updated terms to existing users who need to re-accept\n' +
      '- To display current terms in a "Terms & Conditions" page or modal\n' +
      '- Before calling POST /creator/accept-terms to get the version number to submit\n\n' +
      '**Response Data:**\n' +
      'The response includes:\n' +
      '- `id`: Unique identifier (UUID) of this terms version\n' +
      '- `version`: Integer version number (auto-incremented, starting from 1)\n' +
      '- `html`: The full HTML content of the terms and conditions\n' +
      '- `createdAt`: Timestamp when this version was created\n\n' +
      '**Version Management:**\n' +
      'The version number is automatically managed:\n' +
      '- First terms created will have version 1\n' +
      '- Each new terms publication increments the version by 1\n' +
      '- Users accept a specific version number when they agree to terms\n' +
      '- This allows tracking which version users have agreed to\n\n' +
      '**HTML Content:**\n' +
      'The `html` field contains the complete terms document as HTML. Your frontend should:\n' +
      '- Render this HTML safely (sanitize if needed, though admin-created content is trusted)\n' +
      '- Apply appropriate styling for readability\n' +
      '- Ensure the content is scrollable if lengthy\n' +
      "- Display the version number so users know what they're accepting\n\n" +
      '**No Terms Available:**\n' +
      'If no terms have been published yet (typically only in development/testing environments), this endpoint returns a 404 error. In production, there should always be at least one version available.\n\n' +
      '**Caching Considerations:**\n' +
      "Since terms don't change frequently, consider caching the response on the client side. However, you should still fetch fresh data:\n" +
      '- At the start of the onboarding flow\n' +
      '- When users explicitly request to view terms\n' +
      '- Periodically (e.g., on app launch) to detect updates\n\n' +
      '**HTTP Caching**: Supports automatic ETag-based HTTP caching via Express. Subsequent requests with matching ETags will receive HTTP 304 (Not Modified) responses with no body, reducing bandwidth.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Successfully retrieved the latest terms and conditions version.',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        version: 3,
        html: '<h1>Terms and Conditions</h1><p>Last updated: January 2025</p><p>Welcome to our platform...</p>',
        createdAt: '2025-01-09T21:58:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_MODIFIED,
    description:
      'Content not modified - ETag matches (automatic HTTP caching via Express)',
  })
  @ApiResponse({
    status: 404,
    description:
      'No terms and conditions are available. This typically only occurs in development environments where terms have not been created yet.',
    schema: {
      example: {
        statusCode: 404,
        message: 'No terms available',
        error: 'Not Found',
      },
    },
  })
  @ApiCommonResponses()
  async getLatest() {
    const terms = await this.termsService.getLatest();
    if (!terms) {
      throw new NotFoundException('No terms available');
    }
    return terms;
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Post()
  @ApiOperation({
    summary: 'Create a new version of terms and conditions (Admin only)',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Admin role required',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Internal',
        auditLogging: 'Yes - Terms publication logged',
        securityConsiderations: [
          'Admin-only endpoint',
          'Version number auto-incremented',
          'Immutable once created',
          'Previous versions retained for audit',
          'HTML content should be sanitized client-side',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Forbidden - Admin role required',
          '400': 'Invalid HTML content or validation failure',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
          '500': 'Database error or version conflict',
        },
      }) +
      '\n\n' +
      "Creates and publishes a new version of the platform's terms and conditions. This endpoint is restricted to Admin users only and should be used when terms need to be updated or initially published.\n\n" +
      '**When to Call:**\n' +
      'Use this endpoint when:\n' +
      '- Publishing the initial version of terms (version 1)\n' +
      '- Updating terms due to legal requirements or policy changes\n' +
      '- Fixing errors in previously published terms\n' +
      '- Adding new clauses or sections to existing terms\n\n' +
      '**Version Management:**\n' +
      'The system automatically manages version numbers:\n' +
      '- First publication creates version 1\n' +
      '- Subsequent publications auto-increment (2, 3, 4, etc.)\n' +
      '- Each version is immutable once created\n' +
      '- Previous versions remain in the database for audit trail\n' +
      '- Users are linked to the specific version they accepted\n\n' +
      '**HTML Content Requirements:**\n' +
      'The `html` parameter should contain:\n' +
      '- Complete, well-formed HTML markup\n' +
      '- Proper semantic structure (headings, paragraphs, lists)\n' +
      '- Clear section divisions for readability\n' +
      '- NO JavaScript or executable code (security risk)\n' +
      '- NO external resource references that could break (embed images as data URIs if needed)\n' +
      '- Recommended: Include a "Last Updated" date in the content\n\n' +
      '**User Impact:**\n' +
      'When new terms are published:\n' +
      '- The new version becomes immediately available via GET /terms/latest\n' +
      '- Existing users may need to be prompted to accept the new version\n' +
      '- New users onboarding will see and accept this latest version\n' +
      "- The system can identify users who haven't accepted the latest version\n\n" +
      '**Best Practices:**\n' +
      '- Review HTML thoroughly before publishing (typos cannot be fixed without creating a new version)\n' +
      '- Test HTML rendering in your frontend before publishing\n' +
      '- Consider having a legal review process for term changes\n' +
      '- Document the reason for version updates in your internal records\n' +
      '- Plan user communication strategy for major term changes\n\n' +
      '**Security:**\n' +
      'Only users with Admin role can create new terms. The Firebase JWT must be valid and the user must have elevated privileges. Regular creators and fans cannot access this endpoint.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Terms and conditions version created successfully. The new version is now available via GET /terms/latest.',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        version: 4,
        html: '<h1>Terms and Conditions</h1><p>Last updated: January 2025</p><p>Welcome to our platform...</p>',
        createdAt: '2025-01-09T22:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid request data. The html field must be a non-empty string.',
    schema: {
      example: {
        statusCode: 400,
        message: ['html should not be empty', 'html must be a string'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Missing or invalid Firebase authentication token. Ensure you include a valid Bearer token in the Authorization header.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'User does not have Admin role. Only administrators can create new versions of terms and conditions.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Insufficient permissions',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. Common causes:\n' +
      '- Database connection error\n' +
      '- Failed to save terms to database\n' +
      '- Version number conflict (rare, due to concurrent admin operations)\n\n' +
      'If this occurs, verify the database is accessible and retry the operation.',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Admin,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  @Role(UserRole.Admin)
  async create(@Body() dto: UpdateTermsDto) {
    return this.termsService.create(dto.html);
  }
}
