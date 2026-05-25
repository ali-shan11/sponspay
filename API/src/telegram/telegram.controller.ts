import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CheckChannelHandlesDto } from './dto/check-channel-handles.dto';
import { ChannelInviteInfoResponseDto } from './dto/channel-invite-info-response.dto';
import { CoAdminStatusResponseDto } from './dto/co-admin-status-response.dto';
import { TelegramService } from './telegram.service';
import {
  ApiSecurity,
  ApiTags,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../decorators/role.decorator';
import { UserRole } from '../creator/enums/user.enum';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';

@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('check-channel-availability')
  @UseGuards(ApiKeyGuard)
  @ApiTags('onboarding')
  @ApiSecurity('apiKey')
  @ApiOperation({
    summary: 'Check Telegram channel handle availability',
    description:
      'Verifies which Telegram channel handles are already registered in the system database. This endpoint is essential during the creator onboarding flow to help users choose available channel handles and avoid conflicts.\n\n' +
      '**When to Call:**\n' +
      'This endpoint should be called:\n' +
      '- During the creator onboarding process when the user is choosing a Telegram channel handle\n' +
      '- Before calling `POST /creator/onboard` to ensure the desired handle is available\n' +
      '- When implementing real-time handle validation in the UI (e.g., on input blur or debounced input)\n' +
      "- To check multiple handle variations at once (e.g., user's preferred name with different suffixes)\n\n" +
      '**How It Works:**\n' +
      '1. Accepts 1-5 channel handle strings in the request body\n' +
      '2. Queries the database for existing Telegram channels with matching handles\n' +
      '3. Returns only the handles that are already taken (registered by other creators)\n' +
      '4. Handles not in the response are available for use\n\n' +
      '**Handle Format:**\n' +
      '- Handles should be provided as plain strings without the "@" prefix\n' +
      '- Example: "mychannel" not "@mychannel"\n' +
      '- Telegram handles are case-insensitive but stored as-is\n' +
      '- Valid characters: letters, numbers, and underscores\n' +
      '- Length: 5-32 characters (enforced by Telegram)\n\n' +
      '**Batch Checking:**\n' +
      'You can check up to 5 handles in a single request to improve UX:\n' +
      '- Check the user\'s preferred handle plus variations (e.g., "john_channel", "john_official", "john_media")\n' +
      '- Reduce API calls by batching related checks\n' +
      '- Present multiple available options to the user at once\n\n' +
      '**Response Interpretation:**\n' +
      '- Empty `taken` array = all handles are available\n' +
      "- If a handle appears in `taken`, it's already registered and cannot be used\n" +
      '- Handles not in the response are available for registration\n\n' +
      '**Integration Pattern:**\n' +
      '```typescript\n' +
      '// Example: Check handle availability\n' +
      'const response = await fetch("/telegram/check-channel-availability", {\n' +
      '  method: "POST",\n' +
      '  headers: { "Api-Key": apiKey, "Content-Type": "application/json" },\n' +
      '  body: JSON.stringify({ handles: ["mychannel", "my_channel", "mychannel_official"] })\n' +
      '});\n' +
      'const { taken } = await response.json();\n' +
      '// taken = ["mychannel"] means "my_channel" and "mychannel_official" are available\n' +
      '```\n\n' +
      '**Important Notes:**\n' +
      '- This only checks database records, not actual Telegram availability\n' +
      '- A handle may be available in our database but taken on Telegram itself\n' +
      '- The final validation happens when creating the channel via `POST /creator/onboard`\n' +
      '- This endpoint does not reserve handles - they are claimed on first-come, first-served basis during onboarding',
  })
  @ApiOkResponse({
    description:
      'Successfully checked handle availability. Returns only the handles that are already registered in the system.',
    schema: {
      type: 'object',
      properties: {
        taken: {
          type: 'array',
          items: { type: 'string' },
          description:
            'List of channel handles from the request that are already registered in the database. ' +
            'Handles not in this array are available for use.',
          example: ['mychannel', 'example_channel'],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid request data. Common causes:\n' +
      '- Missing or empty handles array\n' +
      '- More than 5 handles provided (max limit)\n' +
      '- Invalid handle format (must be strings)\n' +
      '- Handles array is not an array type',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'handles must contain at least 1 elements',
          'handles must contain no more than 5 elements',
          'each value in handles must be a string',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Missing or invalid API key. Ensure you include a valid Api-Key in the request header.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. Common causes:\n' +
      '- Database connection failure\n' +
      '- Unexpected error during query execution\n\n' +
      'If this occurs, verify the database is accessible and retry the request.',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  async checkChannelAvailability(@Body() dto: CheckChannelHandlesDto) {
    const taken = await this.telegramService.findTakenChannelHandles(
      dto.handles,
    );
    return { taken };
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Get('channel-invite-info')
  @ApiTags('onboarding')
  @ApiSecurity('firebase-jwt')
  @ApiOperation({
    summary: "Get the creator's Telegram channel invite information",
    description:
      "Retrieves the authenticated creator's Telegram channel information formatted for generating QR codes and invite links. This endpoint is essential for the frontend to display the channel invite link that users can scan or share.\n\n" +
      '**When to Call:**\n' +
      'This endpoint should be called when:\n' +
      '- The frontend needs to display a QR code for users to join the Telegram channel\n' +
      '- The creator wants to share their channel invite link\n' +
      '- The frontend needs to check if a co-admin has been added to the channel\n' +
      '- Building a dashboard or profile page that shows channel information\n\n' +
      '**Prerequisites:**\n' +
      '- The authenticated user must be onboarded as a creator with an existing Telegram channel\n' +
      '- The creator must have completed the creator onboarding process (`POST /creator/onboard`)\n' +
      '- User must have a valid Firebase JWT token with Creator or Admin role\n\n' +
      '**Response Data:**\n' +
      'The endpoint returns:\n' +
      '- `channelHandle`: The Telegram channel username/handle (e.g., "johns_channel")\n' +
      '- `inviteLink`: The full Telegram invite URL (e.g., "https://t.me/johns_channel")\n' +
      '- `channelId`: The Telegram channel ID (if available)\n' +
      '- `coAdminAdded`: Boolean indicating whether a co-admin has been added to the channel\n\n' +
      '**Invite Link Format:**\n' +
      'The invite link follows the standard Telegram format:\n' +
      '- Public channels: `https://t.me/{channelHandle}`\n' +
      '- This link can be opened directly in Telegram or used to generate a QR code\n' +
      '- Users can click the link or scan the QR code to join the channel\n\n' +
      '**Frontend Integration:**\n' +
      '```typescript\n' +
      '// Example: Fetch channel info and generate QR code\n' +
      'const response = await fetch("/telegram/channel-invite-info", {\n' +
      '  headers: { "Authorization": `Bearer ${firebaseToken}` }\n' +
      '});\n' +
      'const { inviteLink, channelHandle, coAdminAdded } = await response.json();\n' +
      '\n' +
      '// Generate QR code with the invite link\n' +
      'generateQRCode(inviteLink);\n' +
      '\n' +
      '// Display channel info\n' +
      'console.log(`Join my channel: ${channelHandle}`);\n' +
      'console.log(`Co-admin added: ${coAdminAdded}`);\n' +
      '```\n\n' +
      '**Channel Selection:**\n' +
      'If a creator has multiple Telegram channels (rare), this endpoint returns information for their most recently created channel. In typical usage, creators have only one channel.\n\n' +
      '**Security:**\n' +
      '- Only the authenticated creator can access their own channel information\n' +
      "- The Firebase JWT determines which creator's data is returned\n" +
      '- No channel information is exposed without proper authentication\n\n' +
      '**Error Scenarios:**\n' +
      '- 401: Missing or invalid Firebase authentication token\n' +
      '- 403: User does not have Creator or Admin role\n' +
      '- 404: Creator has not completed onboarding or has no Telegram channel',
  })
  @ApiOkResponse({
    description:
      'Successfully retrieved channel invite information. The response includes the channel handle, invite link, and co-admin status.',
    type: ChannelInviteInfoResponseDto,
    schema: {
      example: {
        channelHandle: 'johns_channel',
        inviteLink: 'https://t.me/johns_channel',
        channelId: '1234567890',
        coAdminAdded: false,
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
        message: 'Missing Firebase user identity',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'User does not have the required Creator role. Only users with Creator or Admin roles can access channel invite information.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Insufficient permissions',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'No Telegram channel found for this user. The creator has not completed the onboarding process or has not created a Telegram channel yet.',
    schema: {
      example: {
        statusCode: 404,
        message:
          'No Telegram channel found for this user. Please complete the creator onboarding process first.',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. Common causes:\n' +
      '- Database connection failure\n' +
      '- Unexpected error during query execution\n\n' +
      'Check server logs for detailed error information.',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  @Role(UserRole.Creator)
  async getChannelInviteInfo(
    @Req() req: Request,
  ): Promise<ChannelInviteInfoResponseDto> {
    const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    if (!uid) {
      throw new UnauthorizedException('Missing Firebase user identity');
    }
    return this.telegramService.getChannelInviteInfo(uid);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute for polling
  @Get('co-admin-status')
  @ApiTags('onboarding')
  @ApiSecurity('firebase-jwt')
  @ApiOperation({
    summary: 'Check co-admin status for the authenticated user',
    description:
      'Lightweight endpoint to check if the authenticated user has been promoted to co-admin status in their Telegram channel. ' +
      'This endpoint is designed for polling when WebSocket connections are unavailable.\n\n' +
      '**When to Call:**\n' +
      'This endpoint should be used as a polling fallback when:\n' +
      '- WebSocket connection to the `telegram` namespace is unavailable or unreliable\n' +
      '- The frontend needs to periodically check promotion status (recommended: 5-second intervals)\n' +
      '- Implementing a fallback mechanism for real-time status updates\n\n' +
      '**Important Notes:**\n' +
      '- This is a READ-ONLY endpoint - it only queries the database\n' +
      '- Does NOT regenerate invite links or perform heavy operations\n' +
      '- Optimized for frequent polling (< 100ms response time)\n' +
      '- WebSocket should be the primary mechanism; use this only as fallback\n\n' +
      '**Differences from `/telegram/channel-invite-info`:**\n' +
      '- Does NOT generate new invite links\n' +
      '- Does NOT generate QR codes\n' +
      '- Minimal response payload for efficiency\n' +
      '- Designed specifically for polling scenarios\n\n' +
      '**Polling Pattern:**\n' +
      '```typescript\n' +
      '// Example: Poll for co-admin status every 5 seconds\n' +
      'const pollInterval = setInterval(async () => {\n' +
      '  const response = await fetch("/telegram/co-admin-status", {\n' +
      '    headers: { "Authorization": `Bearer ${firebaseToken}` }\n' +
      '  });\n' +
      '  const { coAdminAdded } = await response.json();\n' +
      '  \n' +
      '  if (coAdminAdded) {\n' +
      '    clearInterval(pollInterval);\n' +
      '    // Update UI to show promotion success\n' +
      '  }\n' +
      '}, 5000);\n' +
      '```\n\n' +
      '**WebSocket Integration:**\n' +
      '- Primary: Connect to WebSocket namespace `telegram` and listen for `coAdminAdded` event\n' +
      '- Fallback: Use this endpoint for polling if WebSocket fails\n' +
      '- Stop polling once WebSocket connection is established\n\n' +
      '**Performance Considerations:**\n' +
      '- Simple database lookup (indexed query)\n' +
      '- No external API calls\n' +
      '- Safe for frequent polling (every 5 seconds)\n' +
      '- Response typically < 100ms',
  })
  @ApiOkResponse({
    description:
      'Successfully retrieved co-admin status. Returns current promotion status without modifying any data.',
    type: CoAdminStatusResponseDto,
    schema: {
      example: {
        coAdminAdded: true,
        channelHandle: 'mychannel',
        channelId: '-1001234567890',
        lastChecked: '2025-11-02T14:30:15.000Z',
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
        message: 'Missing Firebase user identity',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'User does not have the required Creator role. Only users with Creator or Admin roles can check co-admin status.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Insufficient permissions',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'No Telegram channel found for this user. The creator has not completed the onboarding process.',
    schema: {
      example: {
        statusCode: 404,
        message: 'No Telegram channel found for this user',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. Check server logs for detailed error information.',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  @Role(UserRole.Creator)
  async getCoAdminStatus(
    @Req() req: Request,
  ): Promise<CoAdminStatusResponseDto> {
    const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    if (!uid) {
      throw new UnauthorizedException('Missing Firebase user identity');
    }
    return this.telegramService.getCoAdminStatus(uid);
  }
}
