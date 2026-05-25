import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { UserRole } from '../creator/enums/user.enum';

/**
 * Security profile configuration for API endpoints
 */
export interface SecurityProfileConfig {
  /** Authentication method used */
  auth: string;
  /** Where the auth credential is provided (e.g., 'x-api-key header', 'Authorization Bearer header') */
  authLocation: string;
  /** Authorization requirements (role, permissions, or 'None') */
  authorization: string;
  /** Rate limiting rule (e.g., '5 requests per minute') */
  rateLimit: string;
  /** Data sensitivity level */
  dataSensitivity: 'Public' | 'Internal' | 'Sensitive' | 'Critical';
  /** Whether operations are logged for audit */
  auditLogging: 'Yes' | 'No' | string;
  /** Security considerations and notes */
  securityConsiderations: string[];
  /** Common security-related error codes and their meanings */
  commonErrors?: Record<string, string>;
}

/**
 * Generates a formatted security profile section for API operation descriptions
 *
 * @param config - Security profile configuration
 * @returns Formatted markdown string for inclusion in @ApiOperation description
 *
 * @example
 * ```typescript
 * @ApiOperation({
 *   summary: 'Create account',
 *   description: ApiSecurityProfile({
 *     auth: 'Firebase JWT',
 *     authLocation: 'Authorization Bearer header',
 *     authorization: 'Creator role or higher',
 *     rateLimit: '3 requests per minute',
 *     dataSensitivity: 'Critical',
 *     auditLogging: 'Yes - All operations logged',
 *     securityConsiderations: [
 *       'Database transactions ensure consistency',
 *       'Phone numbers validated and sanitized'
 *     ],
 *     commonErrors: {
 *       '401': 'Missing or invalid Firebase token',
 *       '403': 'Insufficient permissions',
 *       '429': 'Rate limit exceeded'
 *     }
 *   }) + '\n\n' + 'Additional endpoint description...'
 * })
 * ```
 */
export function ApiSecurityProfile(config: SecurityProfileConfig): string {
  const {
    auth,
    authLocation,
    authorization,
    rateLimit,
    dataSensitivity,
    auditLogging,
    securityConsiderations,
    commonErrors,
  } = config;

  let profile = `**SECURITY PROFILE**<br/><br/>`;
  profile += `**Authentication:** ${auth}<br/>`;
  profile += `**Auth Location:** ${authLocation}<br/>`;
  profile += `**Authorization:** ${authorization}<br/>`;
  profile += `**Rate Limit:** ${rateLimit}<br/>`;
  profile += `**Data Sensitivity:** ${dataSensitivity}<br/>`;
  profile += `**Audit Logging:** ${auditLogging}<br/><br/>`;

  if (securityConsiderations.length > 0) {
    profile += `**Security Considerations:**<br/>`;
    securityConsiderations.forEach((consideration) => {
      profile += `- ${consideration}<br/>`;
    });
    profile += `<br/>`;
  }

  if (commonErrors && Object.keys(commonErrors).length > 0) {
    profile += `**Common Security Errors:**<br/>`;
    Object.entries(commonErrors).forEach(([code, description]) => {
      profile += `- **${code}**: ${description}<br/>`;
    });
  }

  return profile;
}

/**
 * Documents authentication requirements for an endpoint
 *
 * @param authType - Type of authentication required
 * @returns Decorator that adds authentication documentation
 *
 * @example
 * ```typescript
 * @ApiAuthRequired('apiKey')
 * @Post('public-endpoint')
 * ```
 */
export const ApiAuthRequired = (
  authType: 'apiKey' | 'firebase-jwt' | 'both',
) => {
  const decorators: MethodDecorator[] = [];

  if (authType === 'apiKey') {
    decorators.push(ApiSecurity('apiKey'));
    decorators.push(
      ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid API key',
      }),
    );
  } else if (authType === 'firebase-jwt') {
    decorators.push(ApiSecurity('bearer'));
    decorators.push(
      ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid Firebase JWT token',
      }),
    );
  } else if (authType === 'both') {
    decorators.push(ApiSecurity('apiKey'));
    decorators.push(ApiSecurity('bearer'));
    decorators.push(
      ApiResponse({
        status: 401,
        description:
          'Unauthorized - Missing or invalid authentication credentials (API key or Firebase JWT)',
      }),
    );
  }

  return applyDecorators(...decorators);
};

/**
 * Documents role-based authorization requirements
 *
 * @param role - Minimum role required to access the endpoint
 * @returns Decorator that adds authorization documentation
 *
 * @example
 * ```typescript
 * @ApiRoleRequired(UserRole.Creator)
 * @Post('creator-only')
 * ```
 */
export const ApiRoleRequired = (role: UserRole) => {
  const roleNames = {
    [UserRole.Fan]: 'Fan',
    [UserRole.Creator]: 'Creator',
    [UserRole.Admin]: 'Admin',
  };

  return applyDecorators(
    ApiResponse({
      status: 403,
      description: `Forbidden - ${roleNames[role]} role or higher required`,
    }),
  );
};

/**
 * Documents rate limiting for an endpoint
 *
 * @param limit - Rate limit description (e.g., '5 requests per minute')
 * @returns Decorator that adds rate limit documentation
 *
 * @example
 * ```typescript
 * @ApiRateLimited('3 requests per minute')
 * @Post('rate-limited-endpoint')
 * ```
 */
export const ApiRateLimited = (limit: string) => {
  return applyDecorators(
    ApiResponse({
      status: 429,
      description: `Too Many Requests - Rate limit exceeded (Max: ${limit})`,
    }),
  );
};

/**
 * Comprehensive security documentation decorator
 * Combines authentication, authorization, and rate limiting documentation
 *
 * @param config - Security configuration
 * @returns Combined decorator with all security documentation
 *
 * @example
 * ```typescript
 * @ApiSecureEndpoint({
 *   auth: 'firebase-jwt',
 *   role: UserRole.Creator,
 *   rateLimit: '5 requests per minute',
 *   securityNotes: [
 *     'Database transactions ensure consistency',
 *     'All operations are audited'
 *   ]
 * })
 * @Post('secure-operation')
 * ```
 */
export const ApiSecureEndpoint = (config: {
  /** Authentication method required */
  auth: 'apiKey' | 'firebase-jwt' | 'both';
  /** Minimum role required (optional) */
  role?: UserRole;
  /** Rate limit description (optional) */
  rateLimit?: string;
  /** Additional security notes (optional) */
  securityNotes?: string[];
}) => {
  const decorators: MethodDecorator[] = [ApiAuthRequired(config.auth)];

  if (config.role) {
    decorators.push(ApiRoleRequired(config.role));
  }

  if (config.rateLimit) {
    decorators.push(ApiRateLimited(config.rateLimit));
  }

  return applyDecorators(...decorators);
};

/**
 * Standard error responses for common validation failures
 *
 * @example
 * ```typescript
 * @ApiValidationErrors()
 * @Post('endpoint-with-validation')
 * ```
 */
export const ApiValidationErrors = () => {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid request data or validation failure',
      schema: {
        example: {
          statusCode: 400,
          message: [
            'email must be a valid email address',
            'name should not be empty',
          ],
          error: 'Bad Request',
        },
      },
    }),
  );
};

/**
 * Standard error responses for database/server errors
 *
 * @example
 * ```typescript
 * @ApiServerErrors()
 * @Post('database-operation')
 * ```
 */
export const ApiServerErrors = () => {
  return applyDecorators(
    ApiResponse({
      status: 500,
      description:
        'Internal Server Error - Database error, transaction rollback, or server failure',
      schema: {
        example: {
          statusCode: 500,
          message: 'Internal server error',
          error: 'Internal Server Error',
        },
      },
    }),
  );
};

/**
 * Complete set of common API responses including auth, validation, and server errors
 *
 * @example
 * ```typescript
 * @ApiCommonResponses()
 * @Post('standard-endpoint')
 * ```
 */
export const ApiCommonResponses = () => {
  return applyDecorators(ApiValidationErrors(), ApiServerErrors());
};
