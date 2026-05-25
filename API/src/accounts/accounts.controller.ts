import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../decorators/role.decorator';
import { UserRole } from '../creator/enums/user.enum';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Request } from 'express';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiSecurityProfile,
  ApiSecureEndpoint,
  ApiCommonResponses,
} from '../decorators/api-security-docs.decorator';
import { ProviderCountryDto } from './dto/provider-country.dto';
import { VerifyAccountDto } from './dto/verify-account.dto';
import { ResendVerificationResponseDto } from './dto/resend-verification-response.dto';
import { AuditLogListDto } from './dto/audit-log.dto';
import { AuditLogService } from './services/audit-log.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Throttle } from '@nestjs/throttler';
import { Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class AuditLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

@ApiTags('accounts')
@Controller('accounts')
@UseGuards(FirebaseAuthGuard, RolesGuard, ThrottlerGuard)
@ApiSecurity('firebase-jwt')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List verified accounts for the authenticated creator',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Critical',
        auditLogging: 'No',
        securityConsiderations: [
          'Returns only verified accounts owned by authenticated user',
          'Unverified accounts excluded from response',
          'Phone numbers included in response',
          'User identity verified from JWT token',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Retrieves all verified payment accounts belonging to the authenticated creator. Only accounts that have completed SMS verification (isVerified=true) are included in the response, making this the source of truth for accounts that can receive payouts.\n\n' +
      '**When to Call:**\n' +
      'Call this endpoint when:\n' +
      "- Application or dashboard loads - to display user's available payout accounts\n" +
      '- After successful account verification - to refresh the account list and show newly verified account\n' +
      '- Before selecting a payout account - to present current options to the user\n' +
      '- When refreshing account list in settings/profile section\n' +
      '- To check if user has any verified accounts before prompting to add one\n' +
      '- Periodically to detect account changes (deletions, new additions)\n\n' +
      '**Response Behavior:**\n' +
      'This endpoint filters accounts automatically:\n' +
      '- **Only verified accounts**: Accounts with isVerified=true are returned\n' +
      '- **Unverified excluded**: Accounts still awaiting SMS verification are not shown\n' +
      '- **Soft-deleted excluded**: Accounts with deletedAt timestamp are not included\n' +
      '- **Owner filtering**: Only returns accounts created by the authenticated user (based on Firebase UID)\n' +
      '- **Ordered by creation**: Accounts sorted by creation date (newest first by default)\n\n' +
      '**Empty Response:**\n' +
      'If the response array is empty ([]):\n' +
      '- User has not added any payment accounts yet, OR\n' +
      '- User has added accounts but none are verified yet (still awaiting SMS verification), OR\n' +
      '- All previously verified accounts have been soft-deleted\n' +
      'Action: Prompt user to add a payment account via POST /accounts\n\n',
  })
  @ApiOkResponse({
    description: 'List of verified accounts successfully retrieved',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier for the account',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          phoneNumber: {
            type: 'string',
            description: 'Phone number associated with the payment account',
            example: '+1234567890',
          },
          fullName: {
            type: 'string',
            description: 'Full name of the account holder',
            example: 'John Doe',
          },
          nickname: {
            type: 'string',
            nullable: true,
            description: 'Optional nickname for the account',
            example: 'My Main Account',
          },
          providerName: {
            type: 'string',
            description: 'Name of the payment provider',
            example: 'MTN Mobile Money',
          },
          country: {
            type: 'string',
            description: 'Country where the payment provider operates',
            example: 'Uganda',
          },
          isVerified: {
            type: 'boolean',
            description:
              'Verification status of the account (always true in response)',
            example: true,
          },
          verifiedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp when the account was verified',
            example: '2023-12-01T10:30:00.000Z',
          },
        },
        required: [
          'id',
          'phoneNumber',
          'fullName',
          'providerName',
          'country',
          'isVerified',
          'verifiedAt',
        ],
      },
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          phoneNumber: '+256701234567',
          fullName: 'John Doe',
          providerName: 'MTN Mobile Money',
          country: 'Uganda',
          isVerified: true,
          verifiedAt: '2023-12-01T10:30:00.000Z',
        },
        {
          id: '987fcdeb-51a2-43d1-9f12-123456789abc',
          phoneNumber: '+254701234567',
          fullName: 'Jane Smith',
          providerName: 'M-Pesa',
          country: 'Kenya',
          isVerified: true,
          verifiedAt: '2023-12-02T14:15:30.000Z',
        },
      ],
    },
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  @Role(UserRole.Creator)
  async findMine(@Req() req: Request) {
    const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    return this.accountsService.findAllForCreator(uid);
  }

  @Get('countries')
  @ApiOperation({
    summary: 'List unique countries supported by payment providers',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Public',
        auditLogging: 'No',
        securityConsiderations: [
          'Returns list of payment provider countries',
          'Public reference data',
          'No sensitive information exposed',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Retrieves the list of unique countries where payment providers operate, along with their ISO alpha-3 country codes. This reference data is used to populate country selection dropdowns when creating payment accounts.\n\n',
  })
  @ApiOkResponse({
    description:
      'Unique payment provider countries including ISO alpha-3 codes',
    type: ProviderCountryDto,
    isArray: true,
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  @Role(UserRole.Fan)
  async listCountries() {
    return this.accountsService.listProviderCountries();
  }

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute for account creation
  @ApiOperation({
    summary: 'Create a new account for the authenticated creator',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '3 requests per minute',
        dataSensitivity: 'Critical',
        auditLogging: 'Yes - Account creation logged with phone masking',
        securityConsiderations: [
          'Cryptographically secure verification codes (crypto.randomInt)',
          'Database transactions ensure consistency',
          'Phone numbers validated using libphonenumber-js',
          'Input sanitization prevents XSS attacks',
          'Account takeover protection - unverified accounts can be claimed',
          'Phone numbers anonymized on deletion (SHA-256 with salt)',
          'SMS verification required before account is active',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '400':
            'Invalid phone number format (must be E.164) or validation failure',
          '429': 'Rate limit exceeded - Maximum 3 requests per minute',
          '500': 'Database transaction failed',
        },
      }) +
      '\n\n' +
      'Creates a new payment account for the authenticated creator. The account is initially created as unverified and requires SMS verification before it can be used for receiving payouts.\n\n' +
      '**Account Lifecycle Scenarios:**\n' +
      'This endpoint handles five distinct scenarios based on the phone number and account history:\n\n' +
      '1. **New Account Creation**: Phone number has never been registered → Creates new account (201), sends SMS verification code to the phone number\n' +
      '2. **Existing Verified Account (Same Creator)**: You previously added and verified this number → Returns existing account (200), no SMS sent, response includes `alreadyExists: true`\n' +
      '3. **Existing Verified Account (Different Creator)**: Another user owns this verified number → Error (400), cannot take over verified accounts owned by others\n' +
      '4. **Soft-Deleted Account (Same Creator)**: You previously deleted this account → Restores the account (201), clears deletedAt timestamp, forces re-verification for security\n' +
      '5. **Soft-Deleted Account (Different Creator)**: Another user deleted this number → Anonymizes the old account completely, creates fresh account for you (201)\n\n' +
      '**Prerequisites:**\n' +
      'Before calling this endpoint, ensure:\n' +
      '- User has completed creator onboarding via POST /creator/onboard\n' +
      '- User has Creator or Admin role in the system\n' +
      '- Phone number is valid E.164 international format (+[country code][number])\n' +
      '- Payment provider exists in the system and supports the specified country\n' +
      '- User has not reached any account limits (if applicable)\n\n' +
      '**Phone Number Validation:**\n' +
      'Phone numbers must meet these requirements:\n' +
      '- Must start with + followed by country code\n' +
      '- Validated using libphonenumber-js library for accuracy\n' +
      '- Cannot be all 9s (e.g., +256999999999) - reserved for anonymization\n' +
      '- Examples: ✓ +256701234567 (Uganda), ✓ +254701234567 (Kenya), ✗ 0701234567 (missing country code), ✗ 256701234567 (missing + prefix)\n\n' +
      '**Verification Requirement:**\n' +
      'All newly created accounts require SMS verification:\n' +
      '- Account is created with isVerified=false status\n' +
      '- SMS code sent automatically to the provided phone number\n' +
      '- User must complete POST /accounts/:id/verify within 5 minutes\n' +
      '- Unverified accounts cannot be used for receiving payouts\n' +
      '- Account will appear in GET /accounts only after successful verification\n\n' +
      '**Response Variants:**\n' +
      'This endpoint returns different HTTP status codes based on the scenario:\n' +
      '- **201 Created**: New account created or restored from soft-delete, SMS verification sent, redirect user to verification screen\n' +
      '- **200 OK**: Account already exists and is verified by same creator, can be used immediately, response includes `alreadyExists: true` flag\n\n' +
      '**Best Practices:**\n' +
      '- Validate phone number format on the client side before calling to provide immediate feedback\n' +
      '- Handle both 200 and 201 responses appropriately in your integration\n' +
      '- For 201 response: Redirect user to SMS verification screen\n' +
      '- For 200 response with alreadyExists=true: Show message "Account already added to your profile"\n' +
      '- Implement retry logic with exponential backoff for 429 and 500 errors\n' +
      '- Display clear, user-friendly error messages for 400 validation failures\n' +
      '- Consider showing list of existing accounts before user adds duplicate\n\n',
  })
  @ApiResponse({
    status: 201,
    description: 'New account created successfully',
    schema: {
      type: 'object',
      properties: {
        account: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the account',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            phoneNumber: {
              type: 'string',
              description: 'Phone number associated with the payment account',
              example: '+256701234567',
            },
            fullName: {
              type: 'string',
              description: 'Full name of the account holder',
              example: 'John Doe',
            },
            nickname: {
              type: 'string',
              nullable: true,
              description: 'Optional nickname for the account',
              example: 'My Main Account',
            },
            providerName: {
              type: 'string',
              description: 'Name of the payment provider',
              example: 'MTN Mobile Money',
            },
            country: {
              type: 'string',
              description: 'Country where the payment provider operates',
              example: 'Uganda',
            },
            isVerified: {
              type: 'boolean',
              description:
                'Verification status of the account (false for new accounts)',
              example: false,
            },
            verifiedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description:
                'Timestamp when the account was verified (null for new accounts)',
              example: null,
            },
          },
          required: [
            'id',
            'phoneNumber',
            'fullName',
            'nickname',
            'providerName',
            'country',
            'isVerified',
            'verifiedAt',
          ],
        },
      },
      required: ['account'],
      example: {
        account: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          phoneNumber: '+256701234567',
          fullName: 'John Doe',
          nickname: 'My Main Account',
          providerName: 'MTN Mobile Money',
          country: 'Uganda',
          isVerified: false,
          verifiedAt: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Existing account returned (same creator re-adding verified account)',
    schema: {
      type: 'object',
      properties: {
        account: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the account',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            phoneNumber: {
              type: 'string',
              description: 'Phone number associated with the payment account',
              example: '+256701234567',
            },
            fullName: {
              type: 'string',
              description: 'Full name of the account holder',
              example: 'John Doe',
            },
            nickname: {
              type: 'string',
              nullable: true,
              description: 'Optional nickname for the account',
              example: 'My Main Account',
            },
            providerName: {
              type: 'string',
              description: 'Name of the payment provider',
              example: 'MTN Mobile Money',
            },
            country: {
              type: 'string',
              description: 'Country where the payment provider operates',
              example: 'Uganda',
            },
            isVerified: {
              type: 'boolean',
              description:
                'Verification status of the account (true for existing verified accounts)',
              example: true,
            },
            verifiedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the account was verified',
              example: '2023-12-01T10:30:00.000Z',
            },
          },
          required: [
            'id',
            'phoneNumber',
            'fullName',
            'nickname',
            'providerName',
            'country',
            'isVerified',
            'verifiedAt',
          ],
        },
        message: {
          type: 'string',
          description: 'Informative message about the operation',
          example: 'This account is already added to your profile.',
        },
        alreadyExists: {
          type: 'boolean',
          description: 'Indicates if the account already existed',
          example: true,
        },
      },
      required: ['account', 'message', 'alreadyExists'],
      example: {
        account: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          phoneNumber: '+256701234567',
          fullName: 'John Doe',
          nickname: 'My Main Account',
          providerName: 'MTN Mobile Money',
          country: 'Uganda',
          isVerified: true,
          verifiedAt: '2023-12-01T10:30:00.000Z',
        },
        message: 'This account is already added to your profile.',
        alreadyExists: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data or business rule violation.\n\n' +
      'Common causes and solutions:\n' +
      '- **Invalid phone number format**: Use E.164 format: +[country code][number] (e.g., +256701234567). Must start with + symbol.\n' +
      '- **Phone number with all 9s**: Cannot use phone numbers like +256999999999 (reserved for system anonymization).\n' +
      '- **Verified account owned by different creator**: This phone number is already registered and verified by another user. Use a different phone number.\n' +
      '- **Missing required fields**: Ensure fullName, phoneNumber, and providerId are all provided in request body.\n' +
      '- **Invalid provider ID**: Payment provider must exist in the system. Call GET /payment-providers to see valid options.\n' +
      '- **Provider-country mismatch**: Selected provider must support the country of the phone number.\n\n' +
      'If you receive this error repeatedly with valid data, contact support with the error message and timestamp.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          oneOf: [
            { type: 'string', example: 'Phone number must be in E.164 format' },
            {
              type: 'string',
              example:
                'This phone number is already registered to another user',
            },
            { type: 'string', example: 'Invalid phone number' },
            {
              type: 'array',
              items: { type: 'string' },
              example: [
                'phoneNumber must be a valid phone number',
                'fullName should not be empty',
              ],
            },
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description:
      'Too Many Requests - Rate limit exceeded.\n\n' +
      'This endpoint is limited to 3 account creation requests per minute to prevent abuse. ' +
      'Wait at least 20 seconds before retrying. The rate limit helps protect against:\n' +
      '- Accidental duplicate submissions\n' +
      '- SMS spam (each account creation triggers an SMS)\n' +
      '- System abuse\n\n' +
      'Implement exponential backoff in your client: wait 20s, then 40s, then 60s between retries.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal Server Error - Database transaction failed or system error.\n\n' +
      'Common causes:\n' +
      '- Database transaction rollback (safe to retry - operation is idempotent)\n' +
      '- SMS service temporarily unavailable (account created but verification SMS not sent)\n' +
      '- Temporary database connectivity issue\n\n' +
      'This operation is designed to be idempotent and safe to retry. If calling again with the same phone number:\n' +
      '- Scenario 2 will apply (existing account returned)\n' +
      '- No duplicate accounts will be created\n' +
      '- Retry is safe and recommended\n\n' +
      'If error persists after 3 retry attempts, contact support with:\n' +
      '- Error timestamp\n' +
      '- Phone number (last 4 digits only)\n' +
      '- Your user ID',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '3 requests per minute',
  })
  @ApiCommonResponses()
  @Role(UserRole.Creator)
  async create(@Req() req: Request, @Body() dto: CreateAccountDto) {
    const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    return this.accountsService.createForCreator(uid, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update account metadata',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Critical',
        auditLogging: 'Yes - Account updates logged',
        securityConsiderations: [
          'Only fullName and nickname can be modified',
          'Phone number and provider cannot be changed for security',
          'Input sanitization applied',
          'Must own the account to update it',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '400': 'Invalid input data or validation failure',
          '404': 'Account not found or not owned by user',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Updates the editable metadata (full name and nickname) of an existing payment account. This endpoint allows users to correct names, add organizational labels, or update account display information without affecting the core account identity.\n\n' +
      '**When to Call:**\n' +
      'Call this endpoint when:\n' +
      '- User edits account nickname in settings/profile page (organizing accounts with labels)\n' +
      '- User corrects a misspelled full name after account creation\n' +
      '- User wants to add a custom label to distinguish between multiple accounts\n' +
      '- User wants to remove a nickname (by setting it to null or empty string)\n' +
      '- Updating account display information for better organization\n\n' +
      '**Editable vs Read-Only Fields:**\n' +
      'This endpoint has strict limitations on what can be modified:\n\n' +
      '✓ **Editable Fields:**\n' +
      '- fullName: Name of the account holder (1-100 characters, required)\n' +
      '- nickname: Optional custom label for account organization (0-50 characters, can be null)\n\n' +
      '✗ **Read-Only Fields** (cannot be changed):\n' +
      '- phoneNumber: Phone number is immutable for security and audit reasons\n' +
      '- providerId: Payment provider cannot be changed after account creation\n' +
      '- country: Derived from provider and phone number, cannot be modified\n' +
      '- isVerified: Managed by verification process only\n' +
      '- verifiedAt: System-managed timestamp, cannot be altered\n\n' +
      '**Why Phone Number Cannot Change:**\n' +
      'Phone numbers are intentionally immutable for critical reasons:\n' +
      '- **Security**: Phone number is the verified identity of the account holder\n' +
      '- **Audit Trail**: Changing it would break the link to transaction history and verification records\n' +
      '- **Compliance**: Payment regulations require immutable account identifiers for anti-fraud tracking\n' +
      '- **Solution**: If phone number needs to change, delete the old account (soft-delete) and create a new one with the correct number\n\n' +
      '**Validation Rules:**\n' +
      'Input fields are validated with these constraints:\n' +
      '- **fullName**: Must be 1-100 characters, cannot be empty or whitespace-only\n' +
      '- **nickname**: Optional, 0-50 characters maximum, can be null/empty to remove nickname\n' +
      '- **Both fields**: Sanitized to prevent XSS attacks (HTML tags stripped, special characters escaped)\n\n',
  })
  @ApiOkResponse({
    description: 'Account successfully updated',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          description: 'Unique identifier for the account',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        phoneNumber: {
          type: 'string',
          description:
            'Phone number associated with the payment account (read-only)',
          example: '+256701234567',
        },
        fullName: {
          type: 'string',
          description: 'Full name of the account holder',
          example: 'John Doe',
        },
        nickname: {
          type: 'string',
          nullable: true,
          description: 'Optional nickname for the account',
          example: 'My Main Account',
        },
        providerName: {
          type: 'string',
          description: 'Name of the payment provider (read-only)',
          example: 'MTN Mobile Money',
        },
        country: {
          type: 'string',
          description:
            'Country where the payment provider operates (read-only)',
          example: 'Uganda',
        },
        isVerified: {
          type: 'boolean',
          description: 'Verification status of the account (read-only)',
          example: true,
        },
        verifiedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          description: 'Timestamp when the account was verified (read-only)',
          example: '2023-12-01T10:30:00.000Z',
        },
      },
      required: [
        'id',
        'phoneNumber',
        'fullName',
        'providerName',
        'country',
        'isVerified',
      ],
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        phoneNumber: '+256701234567',
        fullName: 'Jane Smith',
        nickname: 'Updated Nickname',
        providerName: 'MTN Mobile Money',
        country: 'Uganda',
        isVerified: true,
        verifiedAt: '2023-12-01T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request: validation errors',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['fullName must be a string', 'nickname must be a string'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'Account not found or does not belong to the authenticated creator',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Account not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  @Role(UserRole.Creator)
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    return this.accountsService.updateForCreator(uid, id, dto);
  }

  @Post(':id/verify')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 verification attempts per minute
  @ApiOperation({
    summary: 'Verify an account using the latest SMS code',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '5 requests per minute',
        dataSensitivity: 'Critical',
        auditLogging: 'Yes - Verification attempts logged (success/failure)',
        securityConsiderations: [
          'Cryptographically secure 6-digit codes',
          'Maximum 3 failed attempts before code is disabled',
          'Codes expire after configured time period',
          'Failed attempts tracked and audited',
          'Account locked after too many failures',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '400': 'Invalid code, expired code, or too many attempts',
          '404': 'Account not found or not owned by user',
          '429': 'Rate limit exceeded - Maximum 5 requests per minute',
        },
      }) +
      '\n\n' +
      'Verifies a payment account by validating the 6-digit SMS verification code sent to the phone number. Successfully verified accounts can immediately be used for receiving payouts.\n\n' +
      '**Verification Flow:**\n' +
      'The complete verification process follows these steps:\n\n' +
      '1. **Account Creation**: POST /accounts creates an unverified account (isVerified=false)\n' +
      '2. **SMS Sent**: System automatically generates cryptographically secure 6-digit code and sends via Infobip SMS gateway\n' +
      '3. **User Receives**: Code arrives in SMS message (typically within seconds, may take up to 1 minute internationally)\n' +
      '4. **User Submits**: User enters code in your UI, frontend calls this endpoint with the code and account ID\n' +
      '5. **Verification**: Backend validates code against stored hash, checks expiration and attempt count\n' +
      '6. **Success**: Account status changes to isVerified=true, verifiedAt timestamp recorded, account now active\n\n' +
      '**Code Security:**\n' +
      'Verification codes are generated with strong security guarantees:\n' +
      '- Generated using crypto.randomInt() for cryptographic randomness\n' +
      '- 6 digits in range 100,000 to 999,999 (one million possible combinations)\n' +
      '- Each code is one-time use only\n' +
      '- Codes cannot be guessed or predicted\n' +
      '- Previous code immediately invalidated when new code is generated\n\n' +
      '**Attempt Limits:**\n' +
      'To protect against brute force attacks:\n' +
      '- Maximum 3 failed verification attempts per code\n' +
      '- After 3rd failed attempt: code is permanently disabled\n' +
      '- User must request new code via POST /accounts/:id/resend-verification\n' +
      '- Attempt counter resets to 0 when new code is generated\n' +
      '- All failed attempts are logged with IP address for security auditing\n\n' +
      '**Expiration Behavior:**\n' +
      'Verification codes have a time-limited validity:\n' +
      '- Codes expire exactly 5 minutes after generation\n' +
      '- Expired code returns 400 error with clear message\n' +
      '- Timer starts from SMS send time, not when user receives it\n' +
      '- After expiration, user must request new code via resend endpoint\n' +
      '- No grace period or extension available\n\n' +
      '**Next Steps After Verification:**\n' +
      'Once verification succeeds:\n' +
      '- Account status immediately changes to isVerified=true\n' +
      '- verifiedAt timestamp is recorded with current date/time\n' +
      '- Account appears in GET /accounts list (only verified accounts shown)\n' +
      '- Account can now be selected as payout destination for fan transactions\n' +
      '- No further verification required unless account is deleted and restored\n' +
      '- Redirect user to account list or success confirmation screen\n\n' +
      '**Troubleshooting Common Issues:**\n' +
      '- ❌ **"Verification code has expired"**: Code was sent more than 5 minutes ago. Solution: Click "Resend Code" button to receive fresh code.\n' +
      '- ❌ **"Too many failed attempts"**: User entered wrong code 3 times. Solution: Request new code via POST /accounts/:id/resend-verification.\n' +
      '- ❌ **"Invalid verification code. 2 attempts remaining"**: Code doesn\'t match. Solution: Double-check SMS message for correct 6-digit code, you have 2 more tries.\n' +
      '- ❌ **"Invalid verification code. 1 attempt remaining"**: Second incorrect attempt. Solution: Carefully verify code from SMS - this is your last chance before code is disabled.\n' +
      '- ❌ **"No verification code found"**: System error or code was never generated. Solution: Request new code via resend endpoint.\n' +
      '- ✓ **Success**: Account verified! Redirect user to dashboard/account list to see their newly verified account.',
  })
  @ApiOkResponse({
    description: 'Account successfully verified',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        phoneNumber: { type: 'string' },
        fullName: { type: 'string' },
        providerName: { type: 'string' },
        country: { type: 'string' },
        isVerified: { type: 'boolean', example: true },
        verifiedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Various validation errors',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          oneOf: [
            {
              example:
                'No verification code found. Please request a new verification code.',
            },
            {
              example:
                'Too many failed attempts. Please request a new verification code.',
            },
            {
              example:
                'Verification code has expired. Please request a new code.',
            },
            { example: 'Invalid verification code. 2 attempts remaining.' },
            { example: 'Invalid verification code. 1 attempt remaining.' },
            {
              example:
                'Invalid verification code. Too many failed attempts. Please request a new verification code.',
            },
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'Account not found or does not belong to the authenticated creator.\n\n' +
      'Common causes:\n' +
      '- **Invalid account ID**: Verify the account ID is a valid UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)\n' +
      '- **Account ownership mismatch**: You can only verify accounts you created. Double-check the account ID matches one from your GET /accounts list.\n' +
      '- **Account was deleted**: If account was soft-deleted, it returns 404. Create a new account instead.\n' +
      '- **Typo in URL parameter**: Ensure :id in URL path is correctly set to the account UUID\n\n' +
      'To verify the account exists and belongs to you, call GET /accounts to see all your accounts.',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '5 requests per minute',
  })
  @ApiCommonResponses()
  @Role(UserRole.Creator)
  async verify(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: VerifyAccountDto,
  ) {
    const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    return this.accountsService.verifyAccount(uid, id, dto);
  }

  @Post(':id/resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 resend requests per minute
  @ApiOperation({
    summary: 'Resend a verification code for an account',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '3 requests per minute',
        dataSensitivity: 'Critical',
        auditLogging: 'Yes - Code resend events logged',
        securityConsiderations: [
          'Cooldown period enforced between resends',
          'Cryptographically secure codes generated',
          'Previous verification attempts reset',
          'SMS delivery via Infobip',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '400': 'Cooldown period not elapsed',
          '404': 'Account not found or not owned by user',
          '429': 'Rate limit exceeded - Maximum 3 requests per minute',
        },
      }) +
      '\n\n' +
      "Generates and sends a fresh SMS verification code to the phone number associated with the account. This endpoint is used when the original code expired, user didn't receive the SMS, or exceeded the maximum verification attempts.\n\n" +
      '**When to Call:**\n' +
      'Call this endpoint when:\n' +
      "- User didn't receive the initial SMS (network issues, phone turned off, blocked messages)\n" +
      '- Verification code expired before user could enter it (more than 5 minutes passed)\n' +
      '- User exceeded 3 failed verification attempts and code was disabled\n' +
      '- User accidentally deleted the SMS message\n' +
      '- User requests a new code for any reason\n' +
      '- POST /accounts/:id/verify returns "Too many failed attempts" error\n\n' +
      '**Cooldown Period:**\n' +
      'To prevent SMS spam, a 20-second cooldown is enforced:\n' +
      '- Minimum 20 seconds must elapse between resend requests for the same account\n' +
      '- Prevents accidental rapid-fire SMS sending\n' +
      '- Protects against denial-of-service attacks via SMS flooding\n' +
      '- Helps control SMS delivery costs\n' +
      '- If called too soon: Returns 400 error with remaining cooldown time\n' +
      '- Display countdown timer in your UI to show user when they can resend\n\n' +
      '**What Happens:**\n' +
      'When you call this endpoint:\n' +
      '1. Previous verification code is immediately invalidated (cannot be used anymore)\n' +
      '2. New cryptographically secure 6-digit code is generated (100,000-999,999)\n' +
      '3. Verification attempt counter is reset to 0 (user gets 3 fresh attempts)\n' +
      '4. New 5-minute expiration timer starts from current time\n' +
      '5. SMS message is sent to the phone number on the account\n' +
      '6. Response includes success confirmation\n\n' +
      '**Rate Limiting Strategy:**\n' +
      'This endpoint has dual rate limiting protection:\n' +
      '- **Endpoint-level**: 3 resend requests per minute (enforced by @Throttle guard)\n' +
      '- **Application-level**: 20-second cooldown between requests (enforced by service logic)\n' +
      '- Both limits work together to prevent abuse while allowing legitimate retries\n' +
      '- Why needed: Each SMS costs money, prevents malicious actors from flooding phone numbers\n\n' +
      '**Best Practices:**\n' +
      '- Show a countdown timer in your UI (20 seconds) before enabling "Resend Code" button\n' +
      '- Disable the resend button during cooldown period to prevent user frustration\n' +
      '- Display remaining cooldown seconds to the user ("Resend available in 15s")\n' +
      '- Inform user to check spam/blocked messages folder on their phone\n' +
      "- If user repeatedly doesn't receive codes, suggest verifying phone number is correct\n" +
      '- After 3 resend attempts with no SMS received, suggest contacting support\n' +
      '- Track resend count client-side to detect delivery issues early\n\n',
  })
  @ApiOkResponse({
    description: 'Verification code resend result',
    type: ResendVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Cooldown period has not elapsed.\n\n' +
      'You must wait at least 20 seconds between resend requests for the same account. ' +
      'This cooldown prevents SMS spam and protects against abuse.\n\n' +
      'Solution: Wait for the remaining cooldown time (shown in error message if available), then retry. ' +
      'Display a countdown timer in your UI showing when the user can request a new code.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Please wait 12 seconds before requesting another code',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'Account not found or does not belong to you.\n\n' +
      'Common causes:\n' +
      '- **Invalid account ID**: Verify the account ID is a valid UUID format\n' +
      '- **Account ownership**: You can only resend codes for your own accounts\n' +
      '- **Account deleted**: Soft-deleted accounts return 404. Create new account instead.\n\n' +
      'Verify the account exists by calling GET /accounts to see all your accounts.',
  })
  @ApiResponse({
    status: 429,
    description:
      'Too Many Requests - Rate limit exceeded.\n\n' +
      'Maximum 3 resend requests per minute. Wait at least 20 seconds before trying again.\n\n' +
      'This limit protects against SMS flooding and helps control costs. Implement exponential backoff in your client.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal Server Error - SMS delivery failure or system error.\n\n' +
      'Common causes:\n' +
      '- **SMS service temporarily unavailable**: Infobip gateway may be experiencing issues. Retry in 1 minute.\n' +
      '- **Database error**: Temporary connectivity issue. Safe to retry.\n' +
      '- **Code generation failure**: Rare system error. Contact support if persists.\n\n' +
      'This operation is safe to retry. If SMS continues to fail after 3 attempts, verify the account still exists via GET /accounts. ' +
      'If problem persists, contact support with error timestamp and account ID.',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '3 requests per minute',
  })
  @ApiCommonResponses()
  @Role(UserRole.Creator)
  async resend(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ResendVerificationResponseDto> {
    const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    return this.accountsService.resendVerification(uid, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete an account',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '5 requests per minute',
        dataSensitivity: 'Critical',
        auditLogging: 'Yes - Deletion logged with phone masking',
        securityConsiderations: [
          'Soft delete - data retained for recovery',
          'Phone number anonymized (SHA-256 with salt)',
          'Can be restored if needed',
          'Must own the account to delete it',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '404': 'Account not found or not owned by user',
          '429': 'Rate limit exceeded - Maximum 5 requests per minute',
        },
      }) +
      '\n\n' +
      'Soft deletes a payment account by marking it as deleted and anonymizing the phone number. The account data is retained for audit trails and compliance, but the account is removed from user-facing lists and cannot receive new payouts.\n\n' +
      '**When to Call:**\n' +
      'Call this endpoint when:\n' +
      '- User removes a payment account from their profile\n' +
      '- User no longer wants to use a specific payment account\n' +
      '- User entered an incorrect phone number and wants to start over\n' +
      '- User is switching to a different payment provider\n' +
      '- User wants to clean up old or unused accounts\n\n' +
      '**Soft Delete Behavior:**\n' +
      'The account is NOT permanently deleted from the database. Instead:\n' +
      '- Account record remains in database with deletedAt timestamp set to current time\n' +
      '- Phone number is anonymized using SHA-256 hash with application-specific salt\n' +
      '- Original phone number becomes all 9s (e.g., +256701234567 → +256999999999)\n' +
      '- Account is marked as deleted but all historical data is retained\n' +
      '- Account no longer appears in GET /accounts response\n' +
      '- Cannot be used for new payout allocations\n\n' +
      '**Why Soft Delete:**\n' +
      'Soft deletion (vs permanent deletion) serves multiple purposes:\n' +
      '- **Audit Trail**: Maintain complete history of all accounts for compliance and fraud prevention\n' +
      '- **Transaction History**: Past payouts reference this account, permanent deletion would break referential integrity\n' +
      '- **Recovery**: Same creator can restore account by re-adding same phone number (triggers re-verification)\n' +
      '- **Legal Compliance**: Payment regulations often require data retention for tax and anti-money laundering purposes\n' +
      '- **Fraud Prevention**: Track patterns of deleted accounts to detect suspicious behavior\n\n' +
      '**Recovery Process:**\n' +
      'Accounts can be restored if the same creator re-adds them:\n' +
      '1. Same creator calls POST /accounts with same phone number\n' +
      '2. System detects existing soft-deleted account with matching phone (before anonymization)\n' +
      '3. deletedAt timestamp is cleared (account restored)\n' +
      '4. Account is forced to re-verify via SMS for security\n' +
      '5. After verification, account reappears in GET /accounts list\n' +
      'Note: Different creator adding same number triggers anonymization of old account and creation of new one\n\n' +
      '**Data Retention:**\n' +
      'What happens to different data fields:\n' +
      '- **Phone number**: Anonymized immediately (replaced with all 9s, original stored as SHA-256 hash)\n' +
      '- **Full name & nickname**: Retained as-is (not considered PII without phone number)\n' +
      '- **Transaction history**: Fully preserved and linked to account\n' +
      '- **Audit logs**: Maintained with all deletion details (who, when, from what IP)\n' +
      '- **Account ID**: Never changes, permanent identifier\n\n' +
      '**Privacy Considerations:**\n' +
      'Anonymization protects user privacy while maintaining audit capabilities:\n' +
      '- Phone anonymization uses SHA-256 with application-specific salt (ANONYMIZATION_SALT env variable)\n' +
      '- Original phone number is computationally infeasible to recover from hash\n' +
      '- Meets GDPR/CCPA requirements for PII protection\n' +
      '- Users can request full hard deletion via support if legally required (manual process)\n\n' +
      '**Impact on Active Transactions:**\n' +
      'Before deleting an account:\n' +
      '- Cannot delete account with pending/in-flight payout transactions\n' +
      '- Must wait for all active transactions to reach terminal state (completed/failed)\n' +
      '- Past completed transactions remain linked and visible in transaction history\n' +
      '- No disruption to historical reporting or tax records\n\n' +
      '**Best Practices:**\n' +
      '- Confirm deletion with user (show confirmation dialog: "Are you sure?")\n' +
      '- Warn user that account can be restored by re-adding same phone number\n' +
      '- Check for pending transactions before allowing deletion\n' +
      '- Refresh account list (GET /accounts) after successful deletion\n' +
      '- Consider showing "Undo" option immediately after deletion (restore via POST /accounts)',
  })
  @ApiResponse({
    status: 204,
    description: 'The account has been successfully soft-deleted.',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '5 requests per minute',
  })
  @ApiCommonResponses()
  @Role(UserRole.Creator)
  async remove(@Req() req: Request, @Param('id') id: string): Promise<void> {
    const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    return this.accountsService.softDelete(uid, id);
  }

  @Get(':id/audit-logs')
  @ApiOperation({
    summary: 'Get audit logs for a specific account',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Sensitive',
        auditLogging: 'No - This endpoint retrieves audit logs',
        securityConsiderations: [
          'Returns audit trail for account operations',
          'Phone numbers masked in log entries',
          'Paginated results (max 100 per page)',
          'Must own the account to view its logs',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '404': 'Account not found or not owned by user',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Retrieves comprehensive audit logs for a specific payment account, providing a complete history of all operations performed on the account. This endpoint is essential for compliance, debugging, and security monitoring.\n\n' +
      '**When to Call:**\n' +
      'Call this endpoint when:\n' +
      '- Viewing account activity history in user profile or settings page\n' +
      '- Generating compliance reports or audit trails for regulatory requirements\n' +
      '- Debugging verification issues ("Why isn\'t my account verified?")\n' +
      '- Investigating user support inquiries ("What happened to this account?")\n' +
      '- Performing security review to detect suspicious activity patterns\n' +
      '- Troubleshooting failed operations by reviewing attempt history\n\n' +
      '**Audit Trail Contents:**\n' +
      'The audit log captures all significant account events:\n' +
      '- **Account Creation**: Initial account creation with creator identity and timestamp\n' +
      '- **Verification Attempts**: Each SMS code submission (both successful and failed), including IP address and remaining attempts\n' +
      '- **Verification Success**: Exact timestamp when account became verified\n' +
      '- **Metadata Updates**: All changes to fullName or nickname fields, showing old and new values\n' +
      '- **Resend Verification**: Each time a new SMS code was requested\n' +
      '- **Soft Deletion**: When account was marked as deleted, including who deleted it\n' +
      '- **Restoration**: When a soft-deleted account was restored by re-adding same phone number\n\n' +
      '**Pagination Guide:**\n' +
      'Logs are paginated to handle large audit histories:\n' +
      '- **Default**: 50 logs per page (use ?page=1 or omit page parameter)\n' +
      '- **Maximum**: 100 logs per page (controlled by validation)\n' +
      '- **Query params**: ?page=2&limit=25 for page 2 with 25 items\n' +
      '- **Response fields**: total (total log count), page (current page), limit (items per page), totalPages (calculated)\n' +
      '- **Navigation**: Increment page number to get next page, keep limit consistent across requests\n' +
      '- **Example**: First page: ?page=1&limit=50, Second page: ?page=2&limit=50, Third page: ?page=3&limit=50\n\n' +
      '**Phone Number Masking:**\n' +
      'Privacy protection is enforced in audit logs:\n' +
      '- Phone numbers shown as: +256XXX***567 (first 6 and last 3 digits visible, middle masked)\n' +
      '- Protects sensitive PII while maintaining identifiability for account owner\n' +
      '- Still allows user to recognize their own phone number\n' +
      '- Full phone number never exposed in audit logs\n' +
      '- Complies with data minimization principles\n\n' +
      '**Use Cases:**\n' +
      '- **Compliance Reporting**: Generate audit report showing complete account lifecycle for regulators\n' +
      '- **Debugging Verification**: User says "I verified but account shows unverified" → Check verification attempt logs to see what happened\n' +
      '- **Support Investigation**: User claims "I never deleted my account" → Review deletion log showing IP, timestamp, and user agent to confirm\n' +
      '- **Security Analysis**: Review verification attempts from unusual IP addresses to detect account takeover attempts\n' +
      '- **Operational Insights**: Track how many verification attempts users typically need before success\n\n',
  })
  @ApiOkResponse({
    description: 'Audit logs retrieved successfully',
    type: AuditLogListDto,
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  @Role(UserRole.Creator)
  async getAccountAuditLogs(
    @Req() req: Request,
    @Param('id') id: string,
    @Query() query: AuditLogQueryDto,
  ): Promise<AuditLogListDto> {
    const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;

    // Verify account ownership
    await this.accountsService.findAllForCreator(uid);

    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    const result = await this.auditLogService.getAccountAuditLogs(
      id,
      limit,
      offset,
    );

    return {
      logs: result.logs.map((log) => ({
        id: log.id,
        accountId: log.accountId,
        userId: log.userId,
        action: log.action,
        description: log.description,
        details: log.details,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
        user: log.user
          ? {
              id: log.user.id,
              firebaseUid: log.user.firebaseUid,
            }
          : undefined,
      })),
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }
}
