# Plan: Send Thank You Messages to YouTube After Successful Payments

## Overview
Automatically send thank you messages to YouTube when PawaPay callback confirms successful payment:
- **Livestream payments** → Post message in livestream chat
- **Video payments** → Post comment on the video

## Current State Analysis

### What We Have
1. **Callback Flow**: [pawapay-webhook.service.ts:44-216](src/pawapay/pawapay-webhook.service.ts#L44-L216) processes successful deposits and triggers Telegram message delivery
2. **Message Type Tracking**: Transaction entity has `messageType` enum (livestream/video)
3. **YouTube Read API**: [youtube-api.service.ts](src/fan/youtube/youtube-api.service.ts) fetches active livestreams/latest videos (read-only)
4. **Fan Message Data**: Transactions store `messageContent`, `subject`, fan name
5. **Frontend OAuth**: [WebApp/src/app/services/auth.service.ts](../WebApp/src/app/services/auth.service.ts) handles YouTube OAuth, stores access token in localStorage

### Critical Gaps Identified

#### Gap 1: No YouTube Video/Livestream ID Storage
- Transaction has `livestreamId` field but it's **not populated** during payment flow
- No `youtubeVideoId` field exists
- Payment initiation doesn't capture which specific YouTube video/livestream the payment is for
- Current flow: Fan pays → message goes to Telegram only

#### Gap 2: Read-Only Scopes (MAJOR BLOCKER)
**Current scopes** ([WebApp auth.service.ts:216-217](../WebApp/src/app/services/auth.service.ts#L216-L217)):
```typescript
provider.addScope('https://www.googleapis.com/auth/youtube.readonly');
provider.addScope('https://www.googleapis.com/auth/yt-analytics.readonly');
```

**Problem**: These scopes **cannot post comments or chat messages**

**Required scope for write access**:
- `https://www.googleapis.com/auth/youtube.force-ssl` (for both chat and comments)

**Frontend changes needed**:
- Update OAuth provider configuration to request write scope
- Creators must re-authorize with new scope

#### Gap 3: YouTube Token Not Accessible to Backend
**Current state**:
- YouTube access token stored in frontend localStorage ([WebApp auth.service.ts:277](../WebApp/src/app/services/auth.service.ts#L277))
- Token expires in 1 hour
- Only Firebase ID token sent to backend in Authorization header
- Backend has no access to YouTube token

**Required changes**:
- Pass YouTube access token from frontend to backend
- Store token securely in backend (encrypted in database or memory cache)
- Implement token refresh mechanism

#### Gap 4: Different APIs for Chat vs Comments
**Livestream Chat** (YouTube Live Chat API):
- Endpoint: `youtube.liveChatMessages.insert`
- Requires: `liveChatId` (obtained from video resource via `videos.list`)
- Message type: Chat message with text snippet

**Video Comments** (YouTube Data API):
- Endpoint: `youtube.commentThreads.insert`
- Requires: `videoId`
- Message type: Top-level comment with text snippet

## Feasibility Assessment

### YouTube API Capabilities ✅
Both livestream chat and video comments are **fully supported** by YouTube Data API v3:
- **Live Chat Messages**: Insert method available
- **Comment Threads**: Insert method available
- Library already in use: `googleapis` v167.0.0

### Technical Challenges

#### Challenge 1: Update Frontend OAuth Scopes (MEDIUM)
**Problem**: Frontend requests read-only scopes, cannot post messages
**Solution**:
1. Update [WebApp auth.service.ts:216-217](../WebApp/src/app/services/auth.service.ts#L216-L217) to request `youtube.force-ssl` scope
2. Existing creators must re-authorize to grant new scope
3. Add scope upgrade flow in creator settings

**Complexity**: MEDIUM - requires coordinated frontend/backend deployment and user migration

#### Challenge 2: Pass YouTube Token to Backend (MEDIUM)
**Problem**: YouTube access token stored in frontend localStorage, not accessible to backend
**Solution Options**:
- **Option A (Recommended)**: Include YouTube token in sign-in request, store encrypted in database
- **Option B**: Send YouTube token with each payment request (less secure, more redundant)
- **Option C**: Backend calls frontend API to get token when needed (adds latency)

**Recommended Approach**: Option A with encrypted storage and automatic refresh

#### Challenge 2: Video/Livestream ID Capture (MEDIUM)
**Problem**: Don't currently know which YouTube video payment is for
**Options**:
- **A**: Fan provides video URL when initiating payment (requires frontend changes)
- **B**: Use active livestream detection (current behavior - may not match user intent)
- **C**: Assume latest video/active livestream (error-prone)

**Recommended**: Option A - explicit video URL in payment request

#### Challenge 3: LiveChat ID Resolution (LOW)
**Problem**: To post in livestream chat, need `liveChatId`, not just `videoId`
**Solution**: Frontend extracts `liveChatId` from page context/referrer when payment initiated
**Complexity**: Low - frontend already has access to this data on the livestream page

#### Challenge 4: Comment Permissions & Moderation
**Problem**: Comments may be:
- Disabled on video
- Held for moderation
- Rejected by spam filters

**Solution**: Handle API errors gracefully, log failures, notify creator via email

## Simplified Implementation Plan

### Overview
Since the frontend already handles YouTube OAuth, this implementation focuses on:
1. **Frontend**: Update scope to allow write access + pass token to backend
2. **Backend**: Store token securely, build messaging services, integrate with callback

### Phase 0: Frontend Scope Update (PREREQUISITE)
**Goal**: Update frontend to request write permissions

#### 0.1 Update OAuth Scopes
**File**: [WebApp/src/app/services/auth.service.ts:216-217](../WebApp/src/app/services/auth.service.ts#L216-L217)

**Change**:
```typescript
// OLD (read-only):
provider.addScope('https://www.googleapis.com/auth/youtube.readonly');
provider.addScope('https://www.googleapis.com/auth/yt-analytics.readonly');

// NEW (add write access):
provider.addScope('https://www.googleapis.com/auth/youtube.force-ssl');
provider.addScope('https://www.googleapis.com/auth/yt-analytics.readonly');
```

#### 0.2 Update Sign-In Request
**File**: [WebApp/src/app/services/creator.service.ts](../WebApp/src/app/services/creator.service.ts)

Add to `CreatorSignInBody`:
```typescript
{
  // ... existing fields
  youtubeRefreshToken: string; // REQUIRED - critical for token refresh
  youtubeScopes: string[]; // Granted scopes
}
```

**CRITICAL**: Extract refresh token from OAuth credential:
```typescript
const credential = GoogleAuthProvider.credentialFromResult(result);
const refreshToken = credential?.refreshToken; // This is what we need!
```

**Note**: Google only provides refresh token on first authorization or when using `prompt: 'consent'`. If missing:
- Force re-consent: `provider.setCustomParameters({ prompt: 'consent' })`
- This ensures we always get a refresh token

#### 0.3 Creator Re-Authorization Flow
**Add to creator settings**:
- Check if creator has `youtube.force-ssl` scope
- If not, show "Upgrade YouTube Permissions" button
- Trigger re-authentication with new scope
- Update backend token after successful upgrade

### Phase 1: Data Model & Storage
**Goal**: Store YouTube tokens and video associations

#### 1.1 Add YouTube Token Storage
See Phase 2.1 above for `YouTubeToken` entity definition.

#### 1.2 Extend Transaction Entity
Add fields to [transaction.entity.ts](src/transaction/entities/transaction.entity.ts):
```typescript
@Column({ nullable: true })
youtubeVideoId: string | null; // Video or livestream ID

@Column({ nullable: true })
youtubeLiveChatId: string | null; // Live chat ID for livestreams (from frontend)

@Column({ nullable: true })
youtubeCommentId: string | null; // Posted comment ID

@Column({ nullable: true })
youtubeMessageId: string | null; // Posted chat message ID

@Column({ type: 'timestamp', nullable: true })
youtubeMessagePostedAt: Date | null;
```

#### 1.3 Update Payment DTOs
Extend `FanPaymentRequestDto`:
```typescript
@IsOptional()
@IsUrl()
@ApiProperty({ description: 'YouTube video/livestream URL' })
youtubeUrl?: string;

@IsOptional()
@IsString()
@ApiProperty({ description: 'YouTube live chat ID (for livestreams only, from referrer)' })
youtubeLiveChatId?: string;
```

**Frontend extraction**:
- Parse video ID from URL formats:
  - `https://youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://youtube.com/live/VIDEO_ID`
- Extract `liveChatId` from referrer or page context if on livestream page
- Send both to backend in payment request

### Phase 2: YouTube Token Management (Backend)
**Goal**: Receive, store, and manage YouTube tokens from frontend

#### 2.1 Create YouTube Token Entity
Add to database schema:
```typescript
@Entity()
class YouTubeToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string; // FK to User (creator)

  @Column({ type: 'text' })
  refreshToken: string; // Encrypted - CRITICAL: This is what we use to get fresh tokens

  @Column({ type: 'simple-array' })
  scopes: string[]; // Granted scopes

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;
}
```

**Important**: We do NOT store access tokens in the database because:
- Access tokens expire in 1 hour
- By the time a fan pays, the creator's access token will be stale
- We use refresh token to generate fresh access tokens on-demand
- Fresh access tokens cached in Redis for 50 minutes

#### 2.2 Update Creator Sign-In Flow
**Frontend changes** ([WebApp creator.service.ts](../WebApp/src/app/services/creator.service.ts)):
- Extract refresh token from OAuth credential
- Include `youtubeRefreshToken` in sign-in request body
- Include granted scopes array
- **Force consent** if refresh token missing: `prompt: 'consent'`

**Backend changes** ([src/creator/creator.service.ts](src/creator/creator.service.ts)):
- Accept `youtubeRefreshToken`, `youtubeScopes` in `CreateProspectDto`
- Validate refresh token by attempting to exchange for access token
- Encrypt refresh token using AES-256-GCM
- Store in `YouTubeToken` entity
- Link to user record via userId

#### 2.3 Token Storage Service
Create `YouTubeTokenService`:
```typescript
class YouTubeTokenService {
  // Store or update refresh token for a creator
  async upsertRefreshToken(userId: string, refreshToken: string, scopes: string[]): Promise<void>

  // Get fresh access token (always refreshes from stored refresh token)
  async getFreshAccessToken(userId: string): Promise<string | null>

  // Check if creator has required scopes
  async hasRequiredScopes(userId: string, requiredScopes: string[]): Promise<boolean>

  // Delete token (on user request or revocation)
  async revokeToken(userId: string): Promise<void>

  // Get authenticated YouTube client for a creator
  async getYouTubeClient(userId: string): Promise<youtube_v3.Youtube | null>

  // Refresh access token from stored refresh token
  private async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }>

  // Decrypt stored refresh token
  private decryptToken(encrypted: string): string

  // Encrypt refresh token before storage
  private encryptToken(token: string): string
}
```

#### 2.4 Token Refresh Strategy (MANDATORY)
**Reality**: Access tokens WILL be expired when fans pay

**Implementation**:
1. **Store only refresh tokens** in database (encrypted)
2. **Generate access tokens on-demand** when posting YouTube messages
3. **Cache fresh access tokens** in Redis with 50-minute TTL (safer than 60 minutes)
4. **Token refresh flow**:
   ```typescript
   async getFreshAccessToken(userId: string): Promise<string> {
     // Check Redis cache first
     const cached = await this.redis.get(`yt_token:${userId}`);
     if (cached) return cached;

     // Get refresh token from database
     const tokenRecord = await this.repo.findOne({ where: { userId } });
     if (!tokenRecord) throw new Error('No YouTube token found');

     const decrypted = this.decryptToken(tokenRecord.refreshToken);

     // Exchange refresh token for new access token
     const { accessToken, expiresIn } = await this.refreshAccessToken(decrypted);

     // Cache for 50 minutes
     await this.redis.setex(`yt_token:${userId}`, 3000, accessToken);

     return accessToken;
   }
   ```

5. **Error handling**: If refresh fails (token revoked, expired, invalid):
   - Log error with creator ID
   - Send email to creator: "Reconnect YouTube to enable thank-you messages"
   - Continue processing payment without YouTube message (graceful degradation)

### Phase 3: YouTube Messaging Service
**Goal**: Post comments and chat messages

#### 3.1 Create YouTube Message Module
Structure:
```
src/youtube-message/
├── youtube-message.module.ts
├── youtube-message.service.ts (main orchestrator)
├── services/
│   ├── youtube-comment.service.ts (video comments)
│   ├── youtube-chat.service.ts (livestream chat)
│   └── youtube-video-info.service.ts (video metadata)
└── youtube-message.service.spec.ts
```

#### 3.2 Comment Posting Logic
**Service**: `YouTubeCommentService`
**Method**: `postThankYouComment(transaction: Transaction)`

Steps:
1. Retrieve creator's YouTube credentials
2. Get authenticated YouTube client
3. Format thank you message
4. Call `youtube.commentThreads.insert`
5. Store `commentId` in transaction
6. Handle errors (disabled comments, spam filter, etc.)

**Message Format**:
```
Thank you for your support, [Fan Name]! 💙

"[Fan Message Content]"

Payment: [Amount] [Currency]
```

#### 3.3 Chat Message Posting Logic
**Service**: `YouTubeChatService`
**Method**: `postThankYouChatMessage(transaction: Transaction, youtube: youtube_v3.Youtube)`

Steps:
1. Get `liveChatId` from transaction (passed from frontend via referrer)
2. Verify `liveChatId` is not null
3. Format thank you message
4. Call `youtube.liveChatMessages.insert` with liveChatId
5. Store `messageId` in transaction
6. Handle errors (stream ended, chat disabled, invalid liveChatId, etc.)

**Message Format**:
```
💙 Thank you [Fan Name] for [Amount] [Currency]: "[Fan Message]"
```

#### 3.4 Video Info Service (Optional Fallback)
**Purpose**: Get liveChatId from videoId if not provided by frontend
**Method**: `getLiveChatId(videoId: string, youtube: youtube_v3.Youtube)`

API Call:
```typescript
youtube.videos.list({
  part: 'liveStreamingDetails',
  id: videoId
})
```

Returns: `activeLiveChatId` or null if not a livestream

**Note**: This is a fallback. Primary approach is to receive liveChatId from frontend (extracted from referrer/page context).

### Phase 4: Integrate with Callback Flow
**Goal**: Trigger YouTube messages after successful payment

#### 4.1 Update Fan Payment Flow
**File**: [src/fan/fan.service.ts](src/fan/fan.service.ts)

Parse `youtubeUrl` and store YouTube data from `FanPaymentRequestDto`:
```typescript
// Extract video ID from URL
const videoIdMatch = dto.youtubeUrl?.match(/(?:v=|youtu\.be\/|live\/)([^&?/]+)/);
const youtubeVideoId = videoIdMatch?.[1] || null;

// Store in transaction
transaction.youtubeVideoId = youtubeVideoId;
transaction.youtubeLiveChatId = dto.youtubeLiveChatId || null; // From frontend referrer
```

#### 4.2 Update Webhook Service
**File**: [pawapay-webhook.service.ts](src/pawapay/pawapay-webhook.service.ts)

Add after line 157 (after Telegram message delivery):
```typescript
// Send YouTube thank you message
if (transaction.youtubeVideoId) {
  await this.youtubeMessageService.sendThankYouMessage(transaction);
}
```

#### 4.3 Main Orchestrator Method
**Service**: `YouTubeMessageService`
**Method**: `sendThankYouMessage(transaction: Transaction)`

Logic:
```typescript
async sendThankYouMessage(transaction: Transaction): Promise<void> {
  try {
    // Get creator's YouTube client (this refreshes token automatically)
    const youtube = await this.tokenService.getYouTubeClient(transaction.beneficiary.id);

    if (!youtube) {
      this.logger.warn(`Creator ${transaction.beneficiary.id} hasn't connected YouTube`);
      return; // Graceful degradation
    }

    // Verify creator has required scopes
    const hasScopes = await this.tokenService.hasRequiredScopes(
      transaction.beneficiary.id,
      ['https://www.googleapis.com/auth/youtube.force-ssl']
    );

    if (!hasScopes) {
      this.logger.warn(`Creator ${transaction.beneficiary.id} missing youtube.force-ssl scope`);
      // Send email to creator prompting scope upgrade
      await this.notifyCreatorToUpgradeScopes(transaction.beneficiary);
      return;
    }

    // Determine message type and dispatch
    if (transaction.messageType === MessageType.Livestream) {
      await this.youtubeChatService.postThankYouChatMessage(transaction, youtube);
    } else {
      await this.youtubeCommentService.postThankYouComment(transaction, youtube);
    }

    this.logger.log(
      `Posted YouTube ${transaction.messageType} message for transaction ${transaction.id}`
    );
  } catch (error) {
    this.logger.error(
      `Failed to post YouTube message for transaction ${transaction.id}`,
      error instanceof Error ? error.stack : String(error)
    );
    // Don't throw - graceful degradation (payment already processed)
  }
}
```

#### 4.3 Error Handling Strategy
**Failures should NOT block payment processing**:
- Log errors with full context
- Update transaction with failure reason
- Send email notification to creator (optional)
- Continue with Telegram message delivery

Possible errors:
- Creator hasn't authorized YouTube
- Token refresh failed
- Video has comments disabled
- Livestream has ended
- Chat is in slow mode
- Message flagged as spam
- API quota exceeded

### Phase 5: Frontend Payment Form Update
**Goal**: Allow fans to specify which video they're paying for

#### 5.1 Add Video URL Field & LiveChat Detection
**File**: [WebApp fan payment form component](../WebApp/src/app/)

Add input field:
```typescript
{
  label: "YouTube Video/Livestream URL (optional)",
  placeholder: "https://youtube.com/watch?v=...",
  formControlName: "youtubeUrl",
  type: "url"
}
```

**Auto-detect from referrer** (recommended approach):
```typescript
// On component init, check if user came from YouTube
const referrer = document.referrer;
if (referrer.includes('youtube.com')) {
  // Extract video ID from referrer URL
  const videoId = this.extractVideoId(referrer);
  this.paymentForm.patchValue({ youtubeUrl: referrer });

  // If on livestream page, extract liveChatId from referrer params or context
  // liveChatId might be in URL params: continuation=...&live_chat=...
  const liveChatId = this.extractLiveChatIdFromReferrer(referrer);
  if (liveChatId) {
    this.paymentForm.patchValue({ youtubeLiveChatId: liveChatId });
  }
}
```

**Methods to extract liveChatId**:
1. Parse from referrer URL parameters
2. Use YouTube iframe API if embedded
3. Extract from page metadata/DOM if available

#### 5.2 Include in Payment Request
Send `youtubeUrl` and `youtubeLiveChatId` (if livestream) in payment API call to backend.

#### 5.3 Creator Settings UI
**Show YouTube connection status**:
- Display current scopes
- Show "Upgrade to allow thank-you messages" if missing `youtube.force-ssl`
- Button to re-authorize with new scope

## Critical Files to Modify

1. **Transaction Entity**: [src/transaction/entities/transaction.entity.ts](src/transaction/entities/transaction.entity.ts)
   - Add `youtubeVideoId`, `youtubeLiveChatId`, `youtubeCommentId`, `youtubeMessageId`, `youtubeMessagePostedAt` fields

2. **Webhook Service**: [src/pawapay/pawapay-webhook.service.ts](src/pawapay/pawapay-webhook.service.ts)
   - Call YouTube message service after successful payment processing (line ~157)

3. **Fan Payment DTO**: [src/fan/dto/fan-payment-request.dto.ts](src/fan/dto/fan-payment-request.dto.ts)
   - Add optional `youtubeUrl` and `youtubeLiveChatId` fields

4. **Fan Service**: [src/fan/fan.service.ts](src/fan/fan.service.ts)
   - Parse `youtubeUrl` to extract video ID
   - Store `youtubeVideoId` and `youtubeLiveChatId` in transaction during creation

5. **App Module**: [src/app.module.ts](src/app.module.ts)
   - Add YouTube OAuth env vars to Joi validation schema
   - Import new YouTube modules

## Environment Variables

Add to `.env`:
```env
# Token Encryption Key (for encrypting YouTube refresh tokens at rest)
# Generate with: openssl rand -hex 32
YOUTUBE_TOKEN_ENCRYPTION_KEY=<generate-secure-random-key-64-chars>

# Redis for token caching (already configured, but confirm)
REDIS_URL=redis://redis:6379

# YouTube API Configuration (optional, for quota management)
YOUTUBE_API_KEY=<optional-api-key>
```

**Note**: OAuth configuration is already in Firebase on the frontend, no additional backend OAuth env vars needed.

**CRITICAL**: The encryption key must be:
- 64 hex characters (32 bytes for AES-256)
- Stored securely (environment variable, secret manager)
- Never committed to version control
- Same across all backend instances (for decrypt to work)

## Security Considerations

1. **Refresh Token Encryption**: Encrypt refresh tokens at rest using AES-256-GCM
   - Use authenticated encryption to prevent tampering
   - Store IV/nonce with ciphertext
   - Use application-wide encryption key from env

2. **Token Storage Security**:
   - Database: Only encrypted refresh tokens
   - Redis cache: Plain access tokens (ephemeral, 50-minute TTL)
   - Logs: NEVER log tokens (redact in error messages)

3. **Scope Minimization**: Request only `youtube.force-ssl`, not full `youtube` scope

4. **Token Lifecycle**:
   - Refresh tokens: Stored encrypted, used to generate access tokens
   - Access tokens: Cached in Redis, never persisted to database
   - On creator disconnect: Delete from database, evict from Redis

5. **Graceful Degradation**: If refresh fails, log and continue (don't block payment)

6. **Audit Logging**: Log all YouTube API calls with:
   - Creator ID (not token value)
   - Video ID
   - Outcome (success/failure)
   - Error type if failed

## Testing Strategy

### Unit Tests
- Mock YouTube API client responses
- Test token refresh logic
- Test video ID parsing from URLs
- Test message formatting
- Test error handling scenarios

### Integration Tests
- Mock authenticated YouTube client
- Test comment posting flow
- Test chat message posting flow
- Test credential retrieval and refresh
- Test graceful degradation when YouTube unavailable

### E2E Tests (Manual)
1. Creator connects YouTube account
2. Fan makes payment with video URL
3. Payment succeeds via PawaPay callback
4. Verify comment/chat message appears on YouTube
5. Verify transaction updated with message IDs

## Rollout Strategy

### Phase 1: Frontend OAuth Scope Update (Day 1-2)
- [ ] Update frontend OAuth provider to request `youtube.force-ssl` scope
- [ ] Update sign-in flow to send YouTube token to backend
- [ ] Add re-authorization UI for existing creators
- [ ] Test new OAuth flow in development

### Phase 2: Backend Infrastructure (Day 3-4)
- [ ] Database migration for `YouTubeToken` entity and transaction fields
- [ ] YouTube token storage service with encryption
- [ ] Update creator sign-in endpoint to accept and store YouTube token
- [ ] Token validation and scope checking

### Phase 3: YouTube Messaging Services (Day 5-7)
- [ ] YouTube comment posting service
- [ ] YouTube chat message posting service (uses liveChatId from transaction)
- [ ] Optional fallback: Video info service (get liveChatId from videoId if not provided)
- [ ] Main orchestrator service

### Phase 4: Integration (Day 8-9)
- [ ] Update fan payment flow to capture video URL and extract ID
- [ ] Integrate with webhook callback flow
- [ ] Add frontend payment form field for video URL
- [ ] Error handling and logging

### Phase 5: Testing & Deployment (Day 10-14)
- [ ] Unit tests for all new services
- [ ] Integration tests with mocked YouTube client
- [ ] Manual E2E testing with real YouTube account
- [ ] Creator re-authorization campaign
- [ ] Production deployment with monitoring

## Open Questions

1. **Video ID Capture**: Should we require fans to provide video URL, or auto-detect active livestream?
   - **Recommendation**: Require explicit URL to ensure correct video

2. **Message Customization**: Should creators be able to customize thank you message templates?
   - **Recommendation**: Start with fixed template, add customization later

3. **Retry Logic**: Should we retry failed YouTube posts?
   - **Recommendation**: No retries initially - log failure and notify creator

4. **Message Visibility**: What if creator wants YouTube messages disabled but Telegram enabled?
   - **Recommendation**: Add feature flag in creator settings

5. **Historical Messages**: Should we backfill YouTube messages for past transactions?
   - **Recommendation**: No - only apply to new payments going forward

## Dependencies

- ✅ `googleapis` v167.0.0 (already installed)
- ✅ `google-auth-library` v10.4.1 (already installed)
- New: Encryption library for token storage (recommend `@nestjs/config` + `crypto` module)

## Success Criteria

1. Creators can authorize YouTube access via OAuth
2. Fan payments include optional YouTube video URL
3. Successful deposit callbacks trigger YouTube message posting
4. Livestream payments post chat messages
5. Video payments post comments
6. Failures are logged and don't block payment processing
7. Transaction records include YouTube message IDs
8. System handles token refresh automatically
9. Comprehensive error handling prevents service disruption
10. Security audit passes for credential storage

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| YouTube API quota limits | Medium | Monitor usage, implement caching, request quota increase |
| Token revocation by creator | Low | Graceful degradation, notify creator to reconnect |
| Comments disabled on videos | Low | Catch API error, log warning, continue processing |
| Livestream ends before message | Low | Verify stream status before posting, fallback to comment |
| OAuth flow complexity | Medium | Follow Google best practices, use official libraries |
| Security breach of tokens | High | Encrypt tokens, regular security audits, rotation policy |

## Verification Plan

After implementation:

1. **Manual Testing**:
   - Test OAuth flow from start to finish
   - Verify tokens stored encrypted
   - Make test payment with livestream URL → verify chat message
   - Make test payment with video URL → verify comment
   - Revoke token → verify graceful failure

2. **Automated Tests**:
   - Run unit test suite (expect 100% coverage on new code)
   - Run integration tests with mocked YouTube client
   - Verify transaction fields populated correctly

3. **Security Review**:
   - Audit token storage encryption
   - Review OAuth flow for CSRF vulnerabilities
   - Check scope minimization
   - Verify no token leakage in logs

4. **Performance Testing**:
   - Test under load (multiple concurrent callbacks)
   - Verify token refresh doesn't cause bottlenecks
   - Check database query performance

5. **Creator Acceptance**:
   - Onboard 3-5 beta creators
   - Collect feedback on OAuth flow
   - Verify messages appear correctly on their channels
   - Iterate based on feedback
