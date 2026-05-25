import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ApiSecurityProfile,
  ApiSecureEndpoint,
  ApiCommonResponses,
} from '../decorators/api-security-docs.decorator';
import { Request } from 'express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../decorators/role.decorator';
import { UserRole } from './enums/user.enum';
import { CreatorService } from './creator.service';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { CreatorOnboardingResponseDto } from './dto/creator-onboarding-response.dto';
import { AcceptTermsDto } from './dto/accept-terms.dto';
import { AcceptTermsResponseDto } from './dto/accept-terms-response.dto';
import { CancelOnboardingDto } from './dto/cancel-onboarding.dto';
import { SignInResponseDto } from './dto/sign-in-response.dto';

@ApiTags('creator')
@Controller('creator')
export class CreatorController {
  constructor(private creatorService: CreatorService) {}

  @UseGuards(ApiKeyGuard)
  @Post('sign-in')
  @ApiTags('onboarding')
  @ApiOperation({
    summary: 'Create/update CRM contact and optionally create channel snapshot',
    description:
      ApiSecurityProfile({
        auth: 'API Key',
        authLocation: 'api-key header',
        authorization: 'None - Public endpoint',
        rateLimit: '5 requests per minute',
        dataSensitivity: 'Sensitive',
        auditLogging: 'No',
        securityConsiderations: [
          'Email validation enforced',
          'Phone number validation if provided',
          'CRM integration for contact tracking',
          'Optional channel snapshot for creators',
          'Idempotent - safe to call multiple times',
          'Performance optimization: firebaseUid field skips Firebase lookup',
        ],
        commonErrors: {
          '401': 'Invalid or missing API key',
          '400': 'Invalid email format or missing required fields',
          '429': 'Rate limit exceeded - Maximum 5 requests per minute',
        },
      }) +
      '\n\n' +
      'Creates or updates a contact record in CRM when a user signs in. Call this endpoint immediately after a user completes the onboarding sign-in flow.\n\n' +
      '**User Identification (Performance Optimization):**\n' +
      'For retrieving onboarding status, you can provide either or both of the following fields:\n' +
      '- `firebaseUid` (recommended): The Firebase UID directly. When provided, skips Firebase API lookup for better performance.\n' +
      '- `googleUserId`: Legacy field for Firebase UID lookup. Only used if `firebaseUid` is not provided.\n\n' +
      'If neither field is provided, the endpoint will still succeed but will skip the onboarding status check.\n\n' +
      '**Onboarding Status Indicators:**\n' +
      'If the user exists in Firebase and has started onboarding, the response includes:\n' +
      '- `isCreator`: Whether user has been onboarded as a creator (has Creator or Admin role)\n' +
      '- `isCoAdmin`: Whether a co-admin has been added to their Telegram channel\n' +
      '- `hasAcceptedTerms`: Whether user has accepted the platform terms and conditions\n\n' +
      'These indicators help the frontend determine which onboarding step to show:\n' +
      '- If `isCreator` is false or missing: User has not started onboarding\n' +
      '- If `isCreator` is true but `isCoAdmin` is false: Direct user to add co-admin step\n' +
      '- If `isCreator` is true but `hasAcceptedTerms` is false: Direct user to accept terms\n' +
      '- If all are true: User has completed onboarding\n\n' +
      '**Channel Snapshot Creation (Optional):**\n' +
      'If the user is an onboarded creator and the following fields are provided, a channel snapshot will be automatically created to track channel growth:\n' +
      '- `countryAnalysis` (JSONB object with country distribution data)\n' +
      '- `youtubePayingUsersPercentage` (0-100)\n' +
      '- `sponspayPayingUsersPercentage` (0-100)\n' +
      '- `youtubeChannels` (array with subscriber counts)\n\n' +
      'Multiple snapshots can be created over time to build a history of channel metrics. Each snapshot is timestamped automatically.\n\n' +
      '**Note:** Snapshot creation will be silently skipped if:\n' +
      '- User is not a creator (role must be Creator or Admin)\n' +
      '- Required snapshot fields are missing\n' +
      '- YouTube channel is not found in the database',
  })
  @ApiResponse({
    status: 201,
    description:
      'Sign-in contact created or updated successfully. If applicable, channel snapshot was also created. Includes onboarding status indicators if user exists in Firebase.',
    type: SignInResponseDto,
    schema: {
      oneOf: [
        {
          description: 'User has not started onboarding',
          example: {
            success: true,
            message: 'Contact created or updated successfully in ZohoCRM',
          },
        },
        {
          description: 'User is a creator but has not completed onboarding',
          example: {
            success: true,
            message: 'Contact created or updated successfully in ZohoCRM',
            isCreator: true,
            isCoAdmin: false,
            hasAcceptedTerms: false,
          },
        },
        {
          description: 'User has completed onboarding',
          example: {
            success: true,
            message: 'Contact created or updated successfully in ZohoCRM',
            isCreator: true,
            isCoAdmin: true,
            hasAcceptedTerms: true,
          },
        },
      ],
    },
  })
  @ApiSecureEndpoint({
    auth: 'apiKey',
    rateLimit: '5 requests per minute',
  })
  @ApiCommonResponses()
  async createSignInContact(
    @Body() signInData: CreateProspectDto,
  ): Promise<SignInResponseDto> {
    return await this.creatorService.createSignInContact(signInData);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('onboard/cancel')
  @ApiTags('onboarding')
  @ApiOperation({
    summary: 'Record onboarding cancellation and update CRM contact',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Any authenticated user',
        rateLimit: '5 requests per minute',
        dataSensitivity: 'Sensitive',
        auditLogging: 'No',
        securityConsiderations: [
          'User email derived from Firebase UID via User entity',
          'Users can only cancel their own onboarding',
          'CRM integration for tracking cancellations',
          'Fault-tolerant - logs locally if CRM unavailable',
          'Multiple cancellations append to existing contact',
          'Newsletter preference captured for marketing campaigns',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '400': 'User not found in database',
          '429': 'Rate limit exceeded - Maximum 5 requests per minute',
        },
      }) +
      '\n\n' +
      'Notifies the backend that a creator has cancelled the onboarding process. Call this endpoint when a user abandons the onboarding flow at any point after sign-in.\n\n' +
      '**Authentication:**\n' +
      "This endpoint requires Firebase JWT authentication. The user's email is automatically derived from their Firebase UID via the User entity, so the frontend does not need to provide it. This ensures users can only cancel their own onboarding.\n\n" +
      '**CRM Integration:**\n' +
      'This endpoint automatically updates the corresponding contact record in the CRM system with:\n' +
      '- Department field updated to "Cancelled"\n' +
      '- Description field appended with cancellation timestamp, optional reason, and newsletter preference\n' +
      '- Email Opt Out field set to true if user does not want updates (wantsUpdates: false)\n' +
      '- Contact status tracking for analytics and follow-up campaigns\n\n' +
      '**When to Call:**\n' +
      '- User explicitly clicks a "Cancel" or "Exit" button during onboarding\n' +
      '- User navigates away from the onboarding flow without completing it\n' +
      '- User closes the onboarding modal/window before completion\n\n' +
      '**Data Handling:**\n' +
      "- Email is automatically derived from the authenticated user's Firebase UID\n" +
      '- Cancellation reason is optional but recommended for analytics\n' +
      '- Newsletter preference (wantsUpdates) is optional and defaults to false if not provided\n' +
      '- Multiple cancellations for the same user will append new notes to the existing contact\n\n' +
      '**Newsletter Preference:**\n' +
      'The `wantsUpdates` field captures whether the user wants to receive updates about new features and availability. This helps maintain engagement with users who cancelled but are still interested in the platform.\n\n' +
      '**Note:** This operation is designed to be fault-tolerant. If the CRM system is unavailable, the cancellation will be logged locally but the endpoint will still return success.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Onboarding cancellation processed successfully. Contact record updated in CRM (if available).',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    rateLimit: '5 requests per minute',
  })
  @ApiCommonResponses()
  async cancelOnboarding(
    @Body() dto: CancelOnboardingDto,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    if (!uid) {
      throw new UnauthorizedException('Missing Firebase user identity');
    }
    return this.creatorService.cancelOnboarding(uid, dto);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('onboard')
  @ApiTags('onboarding')
  @ApiOperation({
    summary: 'Onboard authenticated user as a Creator',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization:
          'Any authenticated user (role assigned during onboarding)',
        rateLimit: '3 requests per minute',
        dataSensitivity: 'Sensitive',
        auditLogging: 'Yes - User creation and role assignment logged',
        securityConsiderations: [
          'Requires YouTube OAuth connection before onboarding',
          'Backend fetches and validates YouTube channel data via OAuth',
          'Database transaction ensures atomicity',
          'Telegram channel creation via external API',
          'Transaction rolled back on any failure',
          'Idempotent - safe to retry on failure',
          'Admin role preserved if user already has it',
          'Firebase custom claims updated with role',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '400':
            'Invalid request data, YouTube not connected, selected channel not found, or Telegram handle unavailable',
          '429': 'Rate limit exceeded - Maximum 3 requests per minute',
          '500': 'Transaction failed - safe to retry',
        },
      }) +
      '\n\n' +
      'Onboards the authenticated Firebase user as a Creator by performing all necessary setup within a single database transaction. This endpoint is **idempotent** - if the user is already a creator, it returns their current status without making changes.\n\n' +
      '**When to Call:**\n' +
      'Call this endpoint when the user decides to create their Telegram channel and complete the creator onboarding process.\n\n' +
      '**Prerequisites:**\n' +
      '- User must have connected their YouTube account via OAuth before calling this endpoint\n' +
      '- YouTube connection provides backend access to fetch channel data and analytics\n\n' +
      '**Transaction Process:**\n' +
      'The following operations are performed atomically within a single database transaction:\n' +
      '1. **User Creation/Update**: Creates new user or updates existing user\n' +
      '   - If user is Admin: preserves Admin role (does not downgrade)\n' +
      '   - If user is Fan: upgrades to Creator role\n' +
      '   - If new user: creates with Creator role\n' +
      '2. **YouTube Data Fetching**: Backend fetches channel data via YouTube OAuth\n' +
      '   - Validates YouTube connection exists\n' +
      '   - Fetches channel name and subscriber count from YouTube API\n' +
      '   - Fetches country analytics (optional - continues if unavailable)\n' +
      "   - Validates selected channelId exists in user's connected account\n" +
      '3. **YouTube Channel Linking**: Links YouTube channel to the user\n' +
      '   - If channel exists (created during sign-in): links it to this user and updates name with fetched data\n' +
      '   - If channel does not exist: creates new YouTube channel record with fetched data\n' +
      '4. **Channel Snapshot**: Captures initial channel metrics\n' +
      '   - Only created if YouTube channel did not exist previously\n' +
      '   - Skipped if snapshot was already created during sign-in to avoid duplication\n' +
      '   - Includes: fetched subscriber count, fetched country analysis, user-provided paying user percentages\n' +
      '5. **Telegram Channel Creation**: Creates a private Telegram channel via Telegram API\n' +
      '   - Channel handle must be available (check with `/telegram/is-channel-name-available` first)\n' +
      '   - Stores channel ID and handle in database\n' +
      '6. **Firebase Custom Claims**: Assigns Creator role in Firebase\n' +
      '   - Skipped if user is Admin (preserves Admin role)\n' +
      '   - Enables role-based access control across the platform\n\n' +
      '**Idempotency & Status Flags:**\n' +
      'If the user is already onboarded as a creator, the endpoint:\n' +
      '- Returns HTTP 200 (not 201) with success: true\n' +
      '- Includes status flags: isCreator, isCoAdmin, hasAcceptedTerms\n' +
      '- Does NOT perform any database operations\n' +
      '- Does NOT create duplicate resources\n\n' +
      '**Transaction Safety:**\n' +
      'If ANY operation fails (especially Telegram channel creation), the ENTIRE transaction is rolled back:\n' +
      '- No partial state is saved\n' +
      '- Database remains consistent\n' +
      '- User can retry the operation\n\n' +
      '**Admin Role Preservation:**\n' +
      'Users with Admin role maintain their elevated privileges when onboarding as creators. They are not downgraded to Creator role.\n\n' +
      '**Response Structure:**\n' +
      '- `success`: Operation success status\n' +
      '- `message`: Human-readable message\n' +
      '- `isCreator`: Whether user has Creator or Admin role\n' +
      '- `isCoAdmin`: Whether a co-admin has been added to their Telegram channel\n' +
      '- `hasAcceptedTerms`: Whether user has accepted terms and conditions\n' +
      '- `data`: (Optional) Only included for new onboardings, contains IDs and handles',
  })
  @ApiResponse({
    status: 200,
    description:
      'User is already onboarded as a creator. Returns current status without making changes.',
    type: CreatorOnboardingResponseDto,
    schema: {
      example: {
        success: true,
        message: 'User already onboarded as a creator',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: true,
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Creator onboarded successfully. All resources created and transaction committed.',
    type: CreatorOnboardingResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Creator onboarded successfully',
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          youtubeChannelId: '123e4567-e89b-12d3-a456-426614174000',
          telegramChannelHandle: 'johns_channel',
          role: 'Creator',
        },
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: false,
      },
    },
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    rateLimit: '3 requests per minute',
  })
  @ApiCommonResponses()
  async onboardCreator(
    @Body() createCreatorDto: CreateCreatorDto,
    @Req() req: Request,
  ): Promise<CreatorOnboardingResponseDto> {
    const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    if (!uid) {
      throw new UnauthorizedException('Missing Firebase user identity');
    }
    const status = await this.creatorService.getCreatorOnboardingStatus(uid);
    if (status.isCreator) {
      return {
        success: true,
        message: 'User already onboarded as a creator',
        ...status,
      };
    }
    const result = await this.creatorService.onboardCreator(
      uid,
      createCreatorDto,
    );
    return { ...result, ...status, isCreator: true };
  }

  @Get('channels')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Role(UserRole.Creator)
  @ApiOperation({
    summary: 'List channels managed by the authenticated creator',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: 'None',
        dataSensitivity: 'Internal',
        auditLogging: 'No',
        securityConsiderations: [
          'Returns only channels the authenticated user has access to via UserChannel junction',
          'Includes both owned and managed channels',
          'Channel IDs in response are UUIDs used as channelId parameter in all creator-insights endpoints',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
        },
      }) +
      '\n\n' +
      "Returns all YouTube channels the authenticated user has access to, including their paired Telegram channel handles and the user's role on each channel.\n\n" +
      '**When to Call:**\n' +
      'Call this endpoint after login to populate the channel selector in the dashboard. ' +
      'The returned `id` field (YouTubeChannel UUID) is the `channelId` parameter required by all creator-insights endpoints ' +
      '(revenue-per-day, transactions, channel-statistics, account-statistics, payouts, etc.).\n\n' +
      '**Response Fields:**\n' +
      '- `id`: YouTubeChannel UUID — use this as the `channelId` query parameter in all channel-scoped API calls\n' +
      "- `youtubeChannelId`: YouTube's external channel ID (e.g., `UC...`)\n" +
      '- `channelName`: Display name of the YouTube channel\n' +
      '- `telegramHandle`: Paired Telegram channel handle (without @), or `null` if not yet created\n' +
      '- `role`: `"owner"` (the user who onboarded this channel) or `"manager"` (invited collaborator)\n' +
      '- `createdAt`: Timestamp of when the user was linked to this channel\n\n' +
      '**Multi-Channel Support:**\n' +
      'A user can own multiple channels and also be a manager on other channels. ' +
      'The frontend should let the user switch between channels and pass the selected `id` to all dashboard API calls.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of channels the user has access to',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description:
              'YouTubeChannel UUID — use as channelId in creator-insights endpoints',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          youtubeChannelId: {
            type: 'string',
            description: "YouTube's external channel ID",
            example: 'UCxxxxxxxxxxxxxxxxxxxxxx',
          },
          channelName: {
            type: 'string',
            description: 'YouTube channel display name',
            example: 'My Channel',
          },
          telegramHandle: {
            type: 'string',
            nullable: true,
            description: 'Paired Telegram channel handle (without @), or null',
            example: 'my_channel',
          },
          role: {
            type: 'string',
            enum: ['owner', 'manager'],
            description: "User's role on this channel",
            example: 'owner',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'When the user was linked to this channel',
            example: '2026-02-05T14:30:00.000Z',
          },
        },
      },
    },
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
  })
  @ApiCommonResponses()
  async getMyChannels(@Req() req: Request) {
    const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    if (!uid) {
      throw new UnauthorizedException('Missing Firebase user identity');
    }
    const isAdmin = (req as any)?.user?.role === UserRole.Admin;
    return this.creatorService.getUserChannels(uid, isAdmin);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Post('accept-terms')
  @ApiTags('onboarding')
  @ApiOperation({
    summary: 'Accept terms and conditions',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Creator role or higher',
        rateLimit: '5 requests per minute',
        dataSensitivity: 'Sensitive',
        auditLogging: 'Yes - Terms acceptance logged with timestamp',
        securityConsiderations: [
          'User must be onboarded as creator first',
          'Version number validated against published terms',
          'Idempotent - updates timestamp on repeated calls',
          'Acceptance cannot be revoked programmatically',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Insufficient permissions - Creator role required',
          '400': 'Invalid version number (must be positive integer)',
          '429': 'Rate limit exceeded - Maximum 5 requests per minute',
          '500': 'Terms version not found or database error',
        },
      }) +
      '\n\n' +
      "Records the authenticated creator's acceptance of a specific version of the platform's terms and conditions. This endpoint should be called after the user has reviewed and agreed to the terms during the onboarding flow or when terms are updated.\n\n" +
      '**When to Call:**\n' +
      'This endpoint must be called in the following scenarios:\n' +
      '- During initial creator onboarding, after the user reviews the terms\n' +
      '- When platform terms are updated and users need to re-accept\n' +
      '- Before granting full access to creator features (terms acceptance is a prerequisite)\n\n' +
      '**Workflow:**\n' +
      '1. Call `GET /terms/latest` to fetch the current terms version and content\n' +
      '2. Display the terms to the user in your UI\n' +
      '3. Once user explicitly accepts, call this endpoint with the version number\n' +
      '4. The backend records the acceptance with a timestamp and links the user to that specific version\n\n' +
      '**Data Persistence:**\n' +
      'The acceptance is recorded in the database with:\n' +
      '- A link to the specific terms version that was accepted\n' +
      '- A timestamp of when the acceptance occurred\n' +
      '- Association with the authenticated user (derived from Firebase JWT)\n\n' +
      '**Prerequisites:**\n' +
      'The user must already be onboarded as a creator before calling this endpoint. If the user does not exist in the database, the endpoint will return a 500 error. Users should complete the creator onboarding process (`POST /creator/onboard`) before accepting terms.\n\n' +
      '**Idempotency:**\n' +
      'Calling this endpoint multiple times with the same version will update the acceptance timestamp to the most recent call. Users can accept terms multiple times (e.g., if terms are re-published or user wants to confirm).\n\n' +
      '**Role Requirements:**\n' +
      'This endpoint requires the user to have at least the "Creator" role. However, the role check is enforced by `RolesGuard`, which allows:\n' +
      '- Admin users (highest privilege)\n' +
      '- Creator users (target audience)\n' +
      '- Users without a Creator role will receive a 403 Forbidden response\n\n' +
      '**Version Validation:**\n' +
      'The version number provided must correspond to a valid, published terms version in the database. If an invalid version is provided, the endpoint will return a 500 error with message "Terms version {version} not found".\n\n' +
      '**Security:**\n' +
      "The user's Firebase UID is extracted from the verified JWT token - never send the UID in the request body. This prevents UID spoofing and ensures the acceptance is recorded for the authenticated user only.",
  })
  @ApiResponse({
    status: 200,
    description:
      'Terms accepted successfully. The acceptance has been recorded with a timestamp.',
    type: AcceptTermsResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Terms and conditions accepted successfully',
        acceptedVersion: 1,
        acceptedAt: '2025-01-09T21:58:00.000Z',
      },
    },
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Creator,
    rateLimit: '5 requests per minute',
  })
  @ApiCommonResponses()
  @Role(UserRole.Creator)
  async acceptTerms(
    @Body() dto: AcceptTermsDto,
    @Req() req: Request,
  ): Promise<AcceptTermsResponseDto> {
    const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    if (!uid) {
      throw new UnauthorizedException('Missing Firebase user identity');
    }
    return this.creatorService.acceptTerms(uid, dto.version);
  }
}
