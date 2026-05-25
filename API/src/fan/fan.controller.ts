import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiParam,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiSecurityProfile } from '../decorators/api-security-docs.decorator';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { FanService } from './fan.service';
import { ChannelInfoResponseDto } from './dto/channel-info.response.dto';
import { FanPaymentRequestDto } from './dto/fan-payment-request.dto';
import { FanPaymentResponseDto } from './dto/fan-payment-response.dto';
import { ChannelMessagesQueryDto } from './dto/channel-messages-query.dto';

@ApiTags('fan')
@Controller('fan')
export class FanController {
  constructor(private readonly fanService: FanService) {}

  @Get(':channelHandle')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiParam({
    name: 'channelHandle',
    description: 'Telegram channel handle (without @)',
    example: 'myawesomechannel',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recent messages to fetch (1-20, default: 5)',
    example: 5,
  })
  @ApiOperation({
    summary: 'Get creator channel information for fans',
    description:
      ApiSecurityProfile({
        auth: 'API Key',
        authLocation: 'api-key header',
        authorization: 'None - Public endpoint',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Public',
        auditLogging: 'No',
        securityConsiderations: [
          'Public endpoint for creator pages',
          'Returns only public-facing channel information',
          'YouTube API quota limits apply',
          'Real-time YouTube Data API v3 call on every request (with 5-min Redis cache)',
          'Messages fetched directly from Telegram channel (with 1-min Redis cache)',
          'Message count configurable via limit query parameter (1-20, default 5)',
          'Text-only messages returned (media and service messages filtered out)',
          'Creator messages identified by checking channel admin status',
          'Case-insensitive channel handle matching',
          'No payment amounts or payer information exposed',
          'Verifies channel access and creator presence for payment availability',
          'Payment countries and operators retrieved from PawaPay availability API (cached)',
        ],
        commonErrors: {
          '401': 'Invalid or missing API key',
          '404': 'Channel handle not found',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
          '500': 'YouTube API error or internal server error',
        },
      }) +
      '\n\n' +
      'Retrieves public information about a creator channel including validated channel handle, ' +
      'current YouTube live stream (or latest video if no stream active) from the YouTube channel ' +
      'provided during creator onboarding, and recent messages fetched directly from the Telegram channel (configurable 1-20, default 5). ' +
      'Designed for embedding on creator landing pages. YouTube data is cached in Redis for 5 minutes and Telegram messages for 2 minutes to reduce API load. ' +
      '\n\n**HTTP Caching**: This endpoint supports automatic ETag-based HTTP caching via Express. ' +
      'On first request, the server returns HTTP 200 with an ETag header. Subsequent requests with matching ETags ' +
      'will receive HTTP 304 (Not Modified) responses with no body, reducing bandwidth and improving performance. ' +
      'Client should handle both 200 and 304 responses appropriately.' +
      '\n\n**Note**: One user equals one YouTube channel (1:1 relationship established during onboarding).' +
      '\n\n**Payment Availability**: The response includes a `paymentsAvailable` boolean field that indicates whether ' +
      'the channel is currently accepting payments. This field is set to `false` if the creator is not present in the ' +
      'Telegram channel or if the bot cannot access the channel. When `false`, the frontend should display a message ' +
      'such as "We are not taking payments at this time for this channel" and disable the payment form.' +
      '\n\n**Invite Link**: The response includes an `inviteLink` field containing an unlimited-use ' +
      'Telegram invite link for fans to join the creator channel. This link is validated and regenerated ' +
      'if expired. Frontend should use this link to generate QR codes. Returns `null` if link generation fails.' +
      '\n\n**Payment Countries & Pricing**: The response includes a `paymentCountries` array that provides ' +
      'comprehensive payment options grouped by country. For each country, you receive:\n' +
      '- **Country Information**: ISO 3166-1 alpha-3 country code, country name, and currency code (ISO 4217)\n' +
      '- **Available Operators**: Array of payment operators (mobile money providers) available in that country\n\n' +
      'Each payment operator includes:\n' +
      '- **Name & Display Name**: Internal operator name (e.g., "MTN_MOMO_ZMB") and human-readable name (e.g., "MTN MOMO ZMB")\n' +
      '- **Status**: Availability status for deposits - either "OPERATIONAL" or "DELAYED"\n' +
      '- **Price**: Effective minimum price for this operator (accounting for both currency price and provider minimum)\n' +
      '- **Max Multiple**: Maximum price multiple allowed (calculated as floor(maxPrice/price), capped at 100)\n\n' +
      'Only countries with configured currency prices and operators with OPERATIONAL or DELAYED deposit status are included. ' +
      'This data is fetched from PawaPay availability API and cached to minimize external API calls. ' +
      'Frontend should use this data to display available payment options and validate user input before submission',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Channel information retrieved successfully',
    type: ChannelInfoResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_MODIFIED,
    description:
      'Content not modified - ETag matches (automatic HTTP caching via Express)',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Channel handle not found',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
  })
  async getChannelInfo(
    @Param('channelHandle') channelHandle: string,
    @Query() query: ChannelMessagesQueryDto,
  ): Promise<ChannelInfoResponseDto> {
    return this.fanService.getChannelInfo(channelHandle, query.limit || 5, {
      referralSource: query.referralSource ?? null,
      referralMedium: query.referralMedium ?? null,
      referralCampaign: query.referralCampaign ?? null,
      referrerUrl: query.referrer ?? null,
      referrerNetwork: query.network ?? null,
    });
  }

  @Post(':channelHandle/payment')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiParam({
    name: 'channelHandle',
    description: 'Creator Telegram channel handle (without @)',
    example: 'myawesomechannel',
  })
  @ApiOperation({
    summary: 'Initiate fan payment with message',
    description:
      ApiSecurityProfile({
        auth: 'API Key',
        authLocation: 'api-key header',
        authorization: 'None - Public endpoint',
        rateLimit: 'None - supports concurrent fan payments',
        dataSensitivity: 'Sensitive',
        auditLogging: 'Yes - transaction recorded',
        securityConsiderations: [
          'PawaPay deposit initiated asynchronously',
          'Phone number validated (E.164 format)',
          'Channel must be verified (coAdminAdded=true)',
          'Payment confirmation via webhook',
          'Message delivery on successful payment',
          'Automatic refund if message delivery fails',
          'Real-time WebSocket notifications to fan',
          'Price calculated server-side based on countryPrice × priceMultiple',
          'Country auto-looked-up from payment provider to prevent mismatches',
          'Price multiple must be integer between 1-100',
          'Operator availability verified against PawaPay API (OPERATIONAL/DELAYED only)',
          'Amount validated against operator-specific min/max limits',
          'Price multiple enforced by operator limits (maxMultiple = floor(maxPrice/minPrice), capped at 100)',
          'Validation uses 5-minute cached availability data for performance',
          'Referral tracking parameters (source, medium, campaign) are optional and stored for analytics',
        ],
        commonErrors: {
          '400':
            'Invalid request - validation failures include: ' +
            '(1) operator unavailable/closed, ' +
            '(2) amount below operator minimum, ' +
            '(3) amount above operator maximum, ' +
            '(4) price multiple exceeds operator limit, ' +
            '(5) currency/provider mismatch, ' +
            '(6) price not configured',
          '401': 'Invalid or missing API key',
          '404': 'Channel not found or not ready for payments',
          '500': 'PawaPay API error or internal server error',
        },
      }) +
      '\n\n' +
      '## Overview\n\n' +
      'Initiates a fan-to-creator payment with a message. The fan pays a multiple (1-100x) of the base message price ' +
      'to comment on a livestream or video. Base price is retrieved from the currencies table and the actual amount ' +
      'is calculated server-side: basePrice × priceMultiple. Country is auto-determined from the payment provider. ' +
      'Payment is processed asynchronously via PawaPay. On successful payment confirmation (via webhook), ' +
      "the message is posted to the creator's private Telegram channel. " +
      'If message delivery fails after retries, the payment is automatically refunded. ' +
      'Fans receive real-time status updates via WebSocket (use fanSessionId from response).' +
      '\n\n' +
      '## Validation Requirements\n\n' +
      'Before initiating payment, the following validations are performed:\n\n' +
      '**Operator Availability**:\n' +
      '- Operator must exist in PawaPay active configuration\n' +
      '- Deposit operation status must be OPERATIONAL or DELAYED (not CLOSED)\n' +
      '- Availability checked against PawaPay API (5-minute cache)\n\n' +
      '**Currency Validation**:\n' +
      '- Operator must support the requested currency\n' +
      '- Currency must have a configured base price\n\n' +
      '**Amount Limits**:\n' +
      '- Minimum: max(countryPrice, operator.minDepositLimit)\n' +
      '- Maximum: operator.maxDepositLimit\n' +
      '- Calculated amount must fall within [min, max] range\n\n' +
      '**Price Multiple**:\n' +
      '- Input range: 1-100 (DTO validation)\n' +
      '- Effective maximum: floor(maxPrice / minPrice), capped at 100\n' +
      '- Example: If minPrice=50 and maxPrice=5000, maxMultiple=100\n' +
      '- Example: If minPrice=100 and maxPrice=2000, maxMultiple=20\n\n' +
      'Frontend should fetch payment options from GET /:channelHandle endpoint ' +
      'to display available operators with their limits before submission.\n\n' +
      '## Referral Tracking\n\n' +
      'Optional referral parameters can be included for marketing analytics:\n' +
      '- `referralSource`: Traffic source (e.g., "facebook", "instagram", "email")\n' +
      '- `referralMedium`: Marketing medium (e.g., "social", "cpc", "organic")\n' +
      '- `referralCampaign`: Campaign identifier (e.g., "summer_2025", "launch_promo")\n\n' +
      'These parameters are stored with the transaction and included in PawaPay metadata for end-to-end tracking.\n\n' +
      '## Payment Flow & Process\n\n' +
      '**Step 1: Request Validation**\n' +
      '- Channel handle is validated (must exist and have `coAdminAdded=true`)\n' +
      '- Phone number is validated against E.164 format\n' +
      '- Message content is validated (required, non-empty)\n' +
      '- If validation fails → 400 Bad Request\n' +
      '- If channel not found or not ready → 404 Not Found\n\n' +
      '**Step 2: Transaction Creation**\n' +
      '- A `Transaction` record is created in the database with status `PENDING`\n' +
      '- A unique `fanSessionId` (UUID) is generated for WebSocket tracking\n' +
      '- Initial response is returned immediately to the client with `fanSessionId`\n\n' +
      '**Step 3: Asynchronous Payment Initiation**\n' +
      '- PawaPay deposit request is sent asynchronously (non-blocking)\n' +
      '- **Immediate Rejection Handling**: If PawaPay immediately rejects the request (HTTP 200 with REJECTED status):\n' +
      '  - Transaction status updated to `rejected`\n' +
      '  - Error returned to client: `{ message: "PawaPay deposit was rejected", rejectionReason: {...}, reference: "..." }`\n' +
      '  - Common rejection reasons: wrong phone number format, invalid operator, compliance issues\n' +
      '  - This happens BEFORE webhooks (synchronous validation by PawaPay)\n' +
      '- **Duplicate Detection**: If same depositId already submitted (HTTP 409):\n' +
      '  - Transaction status remains `PENDING` (original request still processing)\n' +
      '  - Error returned: `{ message: "PawaPay deposit was ignored as duplicate", reference: "..." }`\n' +
      '- **Network/Server Errors**: Retried automatically (3 attempts with exponential backoff)\n' +
      '- If accepted by PawaPay → Transaction status remains `PENDING` until webhook confirmation\n' +
      '- Fan can connect to WebSocket using `fanSessionId` to receive real-time updates\n\n' +
      '**Step 4: Payment Confirmation (via Webhook)**\n' +
      '- PawaPay sends webhook when payment status changes (PROCESSING, COMPLETED, or FAILED)\n' +
      '- **Processing**: Transaction status updated to `processing`, WebSocket event `paymentStatus` emitted\n' +
      '- **Successful payment** (COMPLETED):\n' +
      '  - Transaction status updated to `succeeded`\n' +
      '  - WebSocket event `paymentStatus` emitted with `status: "succeeded"`\n' +
      "  - Fan's message is posted to creator's private Telegram channel (Step 5)\n" +
      '- **Failed payment** (FAILED):\n' +
      '  - Transaction status updated to `failed`\n' +
      '  - WebSocket event `paymentStatus` emitted with `status: "failed"` and `reason` field\n' +
      '  - Common failure reasons: insufficient funds, user canceled, timeout, etc.\n\n' +
      '**Step 5: Message Delivery & Error Handling**\n' +
      '- After successful payment, message delivery to Telegram channel begins\n' +
      '- **Successful delivery** (most common):\n' +
      '  - Message posted to creator channel\n' +
      '  - Transaction `messageDeliveryStatus` updated to `delivered`\n' +
      '  - WebSocket event `messageDelivery` emitted with `status: "delivered"` and `messageId`\n' +
      '- **Delivery failure** (rare - network issues, bot blocked, channel deleted):\n' +
      '  - Automatic retry mechanism: 3 attempts with exponential backoff (1s, 5s, 15s)\n' +
      '  - If all retries fail:\n' +
      '    - Transaction `messageDeliveryStatus` updated to `failed`\n' +
      '    - Automatic refund initiated via PawaPay API\n' +
      '    - Management alert email sent\n' +
      '    - WebSocket event `messageDelivery` emitted with `status: "failed"`, `refunded: true`, and `error` message\n' +
      '  - Refund processed asynchronously (separate PawaPay webhook confirms refund completion)\n\n' +
      '## WebSocket Integration\n\n' +
      'To receive real-time payment status updates:\n' +
      '1. Call this endpoint to initiate payment and receive `fanSessionId`\n' +
      '2. Connect to WebSocket: `ws://your-domain/fan` (or wss:// for production)\n' +
      '3. Join your session room by emitting: `{ type: "joinFanRoom", data: "fanSessionId-here" }`\n' +
      '4. Listen for `roomJoined` confirmation with your session details\n' +
      '5. Listen for real-time payment events (all events include `timestamp` field):\n\n' +
      '**Event: `paymentStatus`**\n' +
      '- Emitted when payment status changes (processing, succeeded, failed)\n' +
      '- Payload structure:\n' +
      '  ```json\n' +
      '  {\n' +
      '    "status": "processing" | "succeeded" | "failed",\n' +
      '    "depositId": "deposit-uuid",\n' +
      '    "transactionId": "tx-uuid",\n' +
      '    "reason": "FAILURE_CODE: Message" (only for failed payments),\n' +
      '    "timestamp": "2025-01-15T12:00:00.000Z"\n' +
      '  }\n' +
      '  ```\n' +
      '- Possible status values:\n' +
      '  - `processing` - Payment is being processed by the mobile money provider\n' +
      '  - `succeeded` - Payment completed successfully (message delivery in progress)\n' +
      '  - `failed` - Payment failed (insufficient funds, canceled, wrong number, etc.)\n' +
      '- Failure reasons include codes like:\n' +
      '  - `INSUFFICIENT_FUNDS: Customer has insufficient balance`\n' +
      '  - `WRONG_MSISDN: Invalid phone number`\n' +
      '  - `TRANSACTION_CANCELLED: User cancelled the transaction`\n\n' +
      '**Event: `messageDelivery`**\n' +
      '- Emitted after successful payment when message delivery completes or fails\n' +
      '- Payload structure:\n' +
      '  ```json\n' +
      '  {\n' +
      '    "status": "delivered" | "failed",\n' +
      '    "messageId": "telegram-msg-id" (null if failed),\n' +
      '    "error": "Error description" (only if failed),\n' +
      '    "refunded": true (only if failed - indicates automatic refund initiated),\n' +
      '    "timestamp": "2025-01-15T12:00:30.000Z"\n' +
      '  }\n' +
      '  ```\n' +
      '- If `status: "failed"` with `refunded: true`, the payment has been automatically refunded\n' +
      '- Message delivery has 3 retry attempts with exponential backoff (1s, 5s, 15s)\n\n' +
      '**Complete Payment Flow Timeline:**\n' +
      '1. API returns immediately with `fanSessionId` (transaction created as `pending`)\n' +
      '2. PawaPay processes payment asynchronously (may receive `paymentStatus: "processing"`)\n' +
      '3. Payment succeeds → Receive `paymentStatus: "succeeded"`\n' +
      '4. Message delivery attempts (3 retries with backoff):\n' +
      '   - Success → Receive `messageDelivery: { status: "delivered", messageId: "123" }`\n' +
      '   - All retries fail → Receive `messageDelivery: { status: "failed", refunded: true }`\n' +
      '   - Automatic refund initiated in background\n' +
      '5. If payment fails → Receive `paymentStatus: { status: "failed", reason: "..." }`\n\n' +
      '## Important Notes\n\n' +
      '- **Non-blocking**: This endpoint returns immediately after creating the transaction record\n' +
      '- **WebSocket Required**: Frontend MUST connect to WebSocket to receive payment status updates\n' +
      '  - Initial API response only provides `fanSessionId` - actual payment status comes via WebSocket\n' +
      '  - Without WebSocket, frontend cannot know if payment succeeded/failed or if message was delivered\n' +
      '- **Rejection vs Failure**:\n' +
      '  - **Rejected**: PawaPay immediately rejects (sync, before webhook) → API returns error, transaction marked `rejected`\n' +
      '  - **Failed**: Payment processed but failed (async, via webhook) → WebSocket event, transaction marked `failed`\n' +
      '- **Idempotency**: Client must send a unique `idempotencyKey` (UUID) with each payment intent. ' +
      'If the same key is sent while a payment is still active (pending/processing/succeeded), ' +
      'the original transaction is returned without creating a duplicate. ' +
      'For failed/rejected payments, the key is cleared to allow retry with the same key.\n' +
      '- **Channel Verification**: Only channels with `coAdminAdded=true` can receive payments\n' +
      '- **Automatic Refunds**: System guarantees refund if message delivery fails after successful payment\n' +
      '- **Retry Logic**: Network errors retried automatically (3 attempts); message delivery retried 3 times\n' +
      '- **Transaction Logging**: All payment attempts logged for audit purposes with full trace',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment initiated successfully',
    type: FanPaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request (validation failed)',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Channel not found or not ready for payments',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
  })
  async initiatePayment(
    @Param('channelHandle') channelHandle: string,
    @Body() dto: FanPaymentRequestDto,
  ): Promise<FanPaymentResponseDto> {
    return this.fanService.initiatePayment(channelHandle, dto);
  }
}
