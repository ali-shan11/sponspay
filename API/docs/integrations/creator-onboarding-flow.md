# Creator Onboarding Flow

This document describes the complete creator onboarding process in the SponsPay platform, including all API endpoints involved and the data flow between frontend and backend.

## Overview

The creator onboarding process transforms a regular user (Fan) into a Creator with a monetized Telegram channel. The process involves multiple steps across several API endpoints, with **automatic co-admin promotion** via Telegram invite links, proper error handling, and idempotency guarantees.

## Prerequisites

Before starting the onboarding flow, ensure:
- User has authenticated with Firebase (Google OAuth, email/password, etc.)
- User has a YouTube channel with analytics data
- User has chosen an available Telegram channel handle

## Complete Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CREATOR ONBOARDING FLOW                       │
│                    (With Auto Co-Admin Promotion)                │
└─────────────────────────────────────────────────────────────────┘

1. User Signs In with Firebase
   ↓
2. POST /creator/sign-in (API Key)
   - Creates/updates CRM contact
   - Optionally creates channel snapshot if data provided
   ↓
3. User Chooses Telegram Handle
   ↓
4. POST /telegram/is-channel-name-available (API Key)
   - Validates handle availability
   - Returns: { available: boolean }
   ↓
5. User Accepts Terms & Conditions
   ↓
6. POST /terms/latest (Public)
   - Fetches current terms version and HTML
   - Returns: { version: number, content: string }
   ↓
7. POST /creator/onboard (Firebase JWT)
   - Creates User (or upgrades from Fan to Creator)
   - Links YouTube channel
   - Creates channel snapshot (if not already created)
   - Creates private Telegram channel
   - Generates single-use invite link  ⭐ NEW
   - Assigns Firebase custom claims
   - Returns status flags
   ↓
8. POST /creator/accept-terms (Firebase JWT)
   - Records terms acceptance
   - Links user to accepted terms version
   ↓
9. GET /telegram/channel-invite-info (Firebase JWT)  ⭐ NEW
   - Returns Telegram invite link and QR code data
   - Generates invite link if missing (self-healing)
   - Returns co-admin status
   ↓
10. Frontend Displays QR Code
    User Scans QR Code → Joins Telegram Channel
   ↓
11. Backend Auto-Promotes User to Co-Admin  ⭐ AUTOMATIC
    - Event listener detects new member join
    - Automatically promotes with restricted admin rights
    - Retries up to 3 times with exponential backoff
    - Sends WebSocket notification on success
    - Sends management alert email on permanent failure
   ↓
12. Frontend Receives Promotion Notification
    - WebSocket event (preferred)  ⭐ NEW
    - OR polling /telegram/co-admin-status (fallback)  ⭐ NEW
   ↓
13. Creator Onboarding Complete ✓
```

## Key Changes from Previous Version

### 🎉 What's New

1. **Automatic Co-Admin Promotion**
   - No manual endpoint needed - promotion happens automatically when user joins
   - Event listener detects when creator scans QR code and joins channel
   - Immediate promotion with retry logic (3 attempts with exponential backoff)

2. **Real Telegram Invite Links**
   - Single-use invite links generated via Telegram API
   - Links work for private channels (previous manual URL didn't work)
   - Self-healing: regenerates if link expires or fails during creation

3. **WebSocket Real-Time Notifications**
   - Frontend receives instant notification when co-admin is added
   - Socket.IO connection to `telegram` namespace
   - User-specific rooms for targeted messaging

4. **Polling Fallback**
   - New endpoint for checking promotion status when WebSocket unavailable
   - Lightweight, optimized for frequent polling
   - Rate-limited to 60 requests/minute

5. **Management Alerts**
   - Automatic email alerts when promotion fails after all retries
   - Comprehensive debugging information for manual intervention
   - Configurable via `MANAGEMENT_EMAIL` environment variable

### ❌ What's Removed

1. **Manual Co-Admin Endpoint**
   - `POST /telegram/co-admin` endpoint has been **REMOVED**
   - No longer needed - promotion is fully automatic
   - Simplifies frontend implementation

## Detailed Endpoint Documentation

### 1. Sign-In Contact Creation

**Endpoint:** `POST /creator/sign-in`  
**Auth:** API Key  
**Purpose:** Create or update CRM contact when user signs in

**Request Body:**
```typescript
{
  firstName: string;
  lastName: string;
  email: string;
  googleUserId: string;
  profilePictureUrl?: string;
  locale?: string;
  youtubeChannels?: Array<{
    id: string;
    title: string;
    thumbnail?: string;
    role?: string;
    subscriberCount?: string;
  }>;
  countryAnalysis?: object;  // Optional: for snapshot
  youtubePayingUsersPercentage?: number;  // Optional: for snapshot
  sponspayPayingUsersPercentage?: number;  // Optional: for snapshot
  signInContext?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Notes:**
- If snapshot fields are provided and complete, creates initial channel snapshot
- Channel snapshot creation is opportunistic and non-blocking
- CRM integration is fault-tolerant (won't fail if CRM is down)

### 2. Telegram Handle Validation

**Endpoint:** `POST /telegram/is-channel-name-available`  
**Auth:** API Key  
**Purpose:** Check if Telegram channel handle is available

**Request Body:**
```typescript
{
  channelName: string;  // Without @ prefix
}
```

**Response:**
```typescript
{
  available: boolean;
  channelName: string;
}
```

**Notes:**
- Must be called before onboarding to ensure handle is available
- Returns quickly (typically < 500ms)
- Handle availability can change, so validate just before onboarding

### 3. Fetch Latest Terms

**Endpoint:** `GET /terms/latest`  
**Auth:** None (Public)  
**Purpose:** Get current terms and conditions version

**Response:**
```typescript
{
  version: number;
  content: string;  // HTML content
  createdAt: string;  // ISO timestamp
}
```

### 4. Creator Onboarding

**Endpoint:** `POST /creator/onboard`  
**Auth:** Firebase JWT (Bearer token)  
**Purpose:** Main onboarding endpoint - creates all creator resources

**Request Body:**
```typescript
{
  youtubeChannelId: string;
  youtubeChannelName: string;
  telegramHandle: string;
  totalSubscribers: number;
  countryAnalysis: object;
  youtubePayingUsersPercentage: number;  // 0-100
  sponspayPayingUsersPercentage: number;  // 0-100
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  isCreator: boolean;
  isCoAdmin: boolean;
  hasAcceptedTerms: boolean;
  data?: {
    userId: string;
    youtubeChannelId: string;
    telegramChannelHandle: string;
    role: 'Admin' | 'Creator' | 'Fan';
  };
}
```

**What Happens:**
1. Creates/upgrades user account
2. Links YouTube channel
3. Creates private Telegram channel
4. **Generates single-use invite link** (new!)
5. Stores invite link in database
6. Starts polling for new channel members (automatic co-admin promotion)
7. Sets Firebase custom claims

**Idempotency:**
- If user is already a creator: returns HTTP 200 with status, no operations performed
- If user is new: returns HTTP 201 with created resources

**Transaction Safety:**
- All operations in a single database transaction
- If Telegram channel creation fails, entire transaction rolls back
- User can safely retry on failure

**Role Preservation:**
- Admin users stay Admin (not downgraded)
- Fan users upgraded to Creator
- New users created as Creator

**Channel Snapshot Logic:**
- Only created if YouTube channel didn't exist before
- Skipped if snapshot was created during sign-in
- Prevents duplicate snapshots

### 5. Accept Terms

**Endpoint:** `POST /creator/accept-terms`  
**Auth:** Firebase JWT (Bearer token)  
**Purpose:** Record user's acceptance of terms and conditions

**Request Body:**
```typescript
{
  version: number;  // From /terms/latest response
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

**Notes:**
- Links user to specific terms version
- Records acceptance timestamp
- Required for creator role

### 6. Get Channel Invite Info ⭐ NEW

**Endpoint:** `GET /telegram/channel-invite-info`  
**Auth:** Firebase JWT (Bearer token)  
**Purpose:** Get Telegram channel invite link and co-admin status

**Response:**
```typescript
{
  channelHandle: string;
  inviteLink: string | null;  // Actual Telegram invite link
  channelId: string;
  coAdminAdded: boolean;
}
```

**Notes:**
- Returns stored invite link from database
- If no invite link exists, attempts to generate one (self-healing)
- If invite link is expired/used, generates a new one with usageLimit: 3
- Starts polling for new members if co-admin not yet added
- Returns `null` for invite link if generation fails (retry recommended)

**Self-Healing Behavior:**
- Checks if stored invite link is still valid
- Regenerates if link is expired, revoked, or already used
- New link has usageLimit: 3 (vs initial usageLimit: 1) to allow retries
- Automatically revokes old invites before generating new ones

**Frontend Usage:**
```typescript
// Get invite info and generate QR code
const response = await fetch('/telegram/channel-invite-info', {
  headers: { 'Authorization': `Bearer ${idToken}` }
});

const { inviteLink, coAdminAdded } = await response.json();

if (inviteLink) {
  // Display QR code with the invite link
  displayQRCode(inviteLink);
  
  // Start listening for promotion updates (see WebSocket section)
  connectWebSocket(firebaseUid);
} else {
  // Show error: invite link not available
  showError('Unable to generate invite link. Please try again.');
}
```

### 7. Check Co-Admin Status ⭐ NEW

**Endpoint:** `GET /telegram/co-admin-status`  
**Auth:** Firebase JWT (Bearer token)  
**Purpose:** Lightweight polling endpoint to check if co-admin has been added

**Response:**
```typescript
{
  coAdminAdded: boolean;
  channelHandle: string;
  channelId: string;
  lastChecked: string;  // ISO 8601 timestamp
}
```

**Notes:**
- **Read-only operation** - does not modify any data
- **Does NOT generate invite links** (unlike channel-invite-info)
- Optimized for frequent polling (< 100ms response time)
- Rate limited to 60 requests/minute
- Use this as fallback when WebSocket is unavailable

**Frontend Usage:**
```typescript
// Poll every 5 seconds when WebSocket is unavailable
const pollInterval = setInterval(async () => {
  const response = await fetch('/telegram/co-admin-status', {
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
  
  const { coAdminAdded } = await response.json();
  
  if (coAdminAdded) {
    clearInterval(pollInterval);
    onPromotionComplete();
  }
}, 5000);

// Stop polling after 30 minutes (timeout)
setTimeout(() => clearInterval(pollInterval), 30 * 60 * 1000);
```

## WebSocket Integration ⭐ NEW

### Connection Setup

The backend provides real-time notifications via Socket.IO when a creator is promoted to co-admin.

**Connection Details:**
- **Namespace:** `telegram`
- **URL:** `ws://localhost:3000/telegram` (development) or `wss://api.sponspay.com/telegram` (production)
- **Event:** `coAdminAdded`

### Frontend Implementation

```typescript
import { io, Socket } from 'socket.io-client';

interface CoAdminAddedPayload {
  channelHandle: string;
  timestamp: string;
  status: 'success';
}

// Connect to telegram namespace
const socket: Socket = io('http://localhost:3000/telegram', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Join user-specific room
socket.on('connect', () => {
  console.log('WebSocket connected');
  
  // Identify this client as belonging to a specific user
  socket.emit('joinUserRoom', firebaseUid);
});

// Listen for co-admin promotion events
socket.on('coAdminAdded', (payload: CoAdminAddedPayload) => {
  console.log('Co-admin promotion completed!', payload);
  
  // Update UI to show success
  onPromotionComplete(payload.channelHandle);
  
  // Disconnect socket (no longer needed)
  socket.disconnect();
});

// Handle connection errors
socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error);
  
  // Fall back to polling
  startPollingFallback();
});

socket.on('disconnect', (reason) => {
  console.log('WebSocket disconnected:', reason);
});
```

### Recommended Strategy: WebSocket + Polling Fallback

```typescript
let isPolling = false;
let pollInterval: NodeJS.Timeout;

function setupPromotionMonitoring(firebaseUid: string, idToken: string) {
  // Try WebSocket first
  const socket = io('http://localhost:3000/telegram');
  
  socket.on('connect', () => {
    socket.emit('joinUserRoom', firebaseUid);
    
    // Stop polling if WebSocket connects
    if (isPolling) {
      clearInterval(pollInterval);
      isPolling = false;
    }
  });
  
  socket.on('coAdminAdded', (payload) => {
    onPromotionComplete(payload);
    socket.disconnect();
  });
  
  socket.on('connect_error', () => {
    // Fall back to polling after WebSocket fails
    if (!isPolling) {
      startPolling(idToken);
    }
  });
  
  // Start polling after 5 seconds if WebSocket doesn't connect
  setTimeout(() => {
    if (!socket.connected && !isPolling) {
      startPolling(idToken);
    }
  }, 5000);
}

function startPolling(idToken: string) {
  isPolling = true;
  
  pollInterval = setInterval(async () => {
    try {
      const response = await fetch('/telegram/co-admin-status', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      
      const { coAdminAdded } = await response.json();
      
      if (coAdminAdded) {
        clearInterval(pollInterval);
        isPolling = false;
        onPromotionComplete({ channelHandle: 'unknown', status: 'success' });
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 5000);
  
  // Timeout after 30 minutes
  setTimeout(() => {
    if (isPolling) {
      clearInterval(pollInterval);
      isPolling = false;
      onPromotionTimeout();
    }
  }, 30 * 60 * 1000);
}
```

## Automatic Co-Admin Promotion Process

### How It Works

1. **User Scans QR Code**
   - Frontend displays QR code with the single-use invite link
   - User scans code with Telegram mobile app
   - User joins the private Telegram channel

2. **Backend Detection**
   - Polling mechanism checks for new channel members every 15 seconds
   - Detects when user count increases from 1 (owner) to 2 (owner + creator)
   - Identifies the new member (excludes the bot/session owner)

3. **Automatic Promotion**
   - Backend automatically calls promotion logic
   - Retries up to 3 times with exponential backoff (1s, 5s, 15s delays)
   - Applies restricted admin rights:
     - ✅ Post messages
     - ✅ Edit messages
     - ✅ Delete messages
     - ❌ All other permissions disabled

4. **Success Notification**
   - Database updated: `coAdminAdded = true`, `joinedUserId` stored
   - WebSocket event emitted to user's room
   - Polling stopped (no longer needed)

5. **Failure Handling**
   - After 3 failed attempts, promotion stops retrying
   - Detailed alert email sent to `MANAGEMENT_EMAIL`
   - Database updated with error details (`promotionAttempts`, `lastPromotionError`)
   - Manual intervention required

### Admin Rights Granted

The auto-promotion grants the same restricted admin rights as the previous manual endpoint:

| Permission | Granted |
|------------|---------|
| Post messages | ✅ Yes |
| Edit messages | ✅ Yes |
| Delete messages | ✅ Yes |
| Change info | ❌ No |
| Ban users | ❌ No |
| Invite users | ❌ No |
| Pin messages | ❌ No |
| Add admins | ❌ No |
| All other rights | ❌ No |

### Retry Logic

```
Attempt 1 → Wait 1 second → Attempt 2 → Wait 5 seconds → Attempt 3
                                                              ↓
                                                    If fails: Send alert email
```

### Polling Mechanism

The backend automatically starts polling when:
- A new channel is created during onboarding
- An invite link is generated/regenerated via `/telegram/channel-invite-info`
- Co-admin has not yet been added

**Polling Details:**
- **Interval:** Every 15 seconds
- **Duration:** Up to 30 minutes
- **Auto-stop:** When co-admin is successfully added
- **Auto-stop:** After 30 minutes (timeout)

**What It Checks:**
- Number of participants in the channel
- If count > 1, identifies new member and triggers promotion

## Configuration

### Environment Variables

#### Required

```bash
# Telegram Bot Configuration
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_STRING=your_session_string  # Must be channel owner

# Management Alerts
MANAGEMENT_EMAIL=sponspay-management@sponspay.com  # Receives failure alerts
FROM_EMAIL=noreply@sponspay.com  # Email sender address
```

#### Optional

```bash
# WebSocket CORS (configure per environment)
# Default: '*' (allow all)
# Production should restrict to specific domains
```

### Management Email Alerts

When automatic co-admin promotion fails after all retries, the system sends a detailed alert email to `MANAGEMENT_EMAIL` containing:

- **Channel Details:** Handle, ID, direct link
- **User Details:** Telegram user ID, Firebase UID
- **Error Details:** Retry attempts (X/3), last error message
- **Action Required:** Manual promotion instructions
- **Database Update:** SQL to mark `coAdminAdded = true`

**Alert Subject:**
```
⚠️ Telegram Co-Admin Promotion Failed - Manual Intervention Required
```

**Manual Intervention Steps:**
1. Open Telegram and navigate to the channel
2. Find the user and promote them manually with these exact rights:
   - Post messages: ✓
   - Edit messages: ✓
   - Delete messages: ✓
   - All others: ✗
3. Update database:
   ```sql
   UPDATE telegram_channels 
   SET co_admin_added = true 
   WHERE id = <channel_id>;
   ```

## Error Handling

### Common Error Scenarios

1. **Telegram Handle Taken**
   - Status: 500
   - Message: "Failed to create Telegram channel..."
   - Action: User must choose different handle
   - Note: Transaction rolled back, safe to retry

2. **Already Onboarded**
   - Status: 200 (not an error)
   - Returns current status flags
   - Action: Proceed to next step in flow

3. **Missing Firebase Token**
   - Status: 401
   - Message: "Missing Firebase user identity"
   - Action: Re-authenticate user and retry

4. **Invalid Input Data**
   - Status: 400
   - Message: Array of validation errors
   - Action: Fix input and retry

5. **Database Transaction Failed**
   - Status: 500
   - Message: "Failed to onboard creator. Please try again."
   - Action: Safe to retry (transaction rolled back)

6. **Invite Link Generation Failed** ⭐ NEW
   - `/telegram/channel-invite-info` returns `inviteLink: null`
   - Action: Retry the endpoint (self-healing will attempt regeneration)
   - Fallback: Contact support if persists

7. **Invite Link Expired/Used** ⭐ NEW
   - Self-healing automatically detects and regenerates
   - New link has usageLimit: 3 for retry attempts
   - Action: Get new link via `/telegram/channel-invite-info`

8. **Auto-Promotion Failed** ⭐ NEW
   - User joins but promotion doesn't happen
   - Backend retries 3 times automatically
   - After final failure: Management alert sent
   - Action: Wait for manual intervention or contact support

9. **WebSocket Connection Failed** ⭐ NEW
   - Frontend unable to connect to Socket.IO
   - Action: Fall back to polling `/telegram/co-admin-status`
   - Note: Promotion still works, just slower notification

10. **Polling Timeout (30 minutes)** ⭐ NEW
    - User hasn't joined channel within 30 minutes
    - Polling stops automatically
    - Action: Regenerate invite link via `/telegram/channel-invite-info`

## Frontend Implementation Example

```typescript
async function onboardCreator(userData: CreatorOnboardingData) {
  try {
    // Step 1: Validate Telegram handle
    const handleCheck = await fetch('/telegram/is-channel-name-available', {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channelName: userData.telegramHandle }),
    });
    
    const { available } = await handleCheck.json();
    if (!available) {
      throw new Error('Telegram handle is not available');
    }

    // Step 2: Fetch latest terms
    const termsResponse = await fetch('/terms/latest');
    const terms = await termsResponse.json();
    
    // Step 3: Show terms to user and get acceptance
    const accepted = await showTermsDialog(terms.content);
    if (!accepted) {
      throw new Error('Terms must be accepted');
    }

    // Step 4: Onboard creator
    const idToken = await getFirebaseIdToken();
    const onboardResponse = await fetch('/creator/onboard', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        youtubeChannelId: userData.youtubeChannelId,
        youtubeChannelName: userData.youtubeChannelName,
        telegramHandle: userData.telegramHandle,
        totalSubscribers: userData.totalSubscribers,
        countryAnalysis: userData.countryAnalysis,
        youtubePayingUsersPercentage: userData.youtubePayingUsersPercentage,
        sponspayPayingUsersPercentage: userData.sponspayPayingUsersPercentage,
      }),
    });

    const result = await onboardResponse.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Onboarding failed');
    }

    // Step 5: Accept terms
    const acceptTermsResponse = await fetch('/creator/accept-terms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ version: terms.version }),
    });

    const termsResult = await acceptTermsResponse.json();
    
    if (!termsResult.success) {
      console.warn('Terms acceptance failed, but creator was onboarded');
    }

    // Step 6: Get invite link and display QR code ⭐ NEW
    const inviteResponse = await fetch('/telegram/channel-invite-info', {
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });

    const { inviteLink, coAdminAdded } = await inviteResponse.json();

    if (!inviteLink) {
      throw new Error('Unable to generate invite link. Please try again.');
    }

    // Display QR code
    displayQRCode(inviteLink);

    // Step 7: Set up real-time monitoring for promotion ⭐ NEW
    if (!coAdminAdded) {
      const promotionComplete = await monitorPromotion(
        getFirebaseUid(),
        idToken
      );
      
      if (!promotionComplete) {
        console.warn('Promotion monitoring timed out');
      }
    }

    return {
      success: true,
      creator: result.data,
      statusFlags: {
        isCreator: result.isCreator,
        isCoAdmin: coAdminAdded,  // May be true if already promoted
        hasAcceptedTerms: termsResult.success,
      },
    };

  } catch (error) {
    console.error('Creator onboarding failed:', error);
    throw error;
  }
}

// Monitor promotion with WebSocket + polling fallback
async function monitorPromotion(
  firebaseUid: string,
  idToken: string
): Promise<boolean> {
  return new Promise((resolve) => {
    let completed = false;
    let socket: Socket | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (socket) socket.disconnect();
      if (pollInterval) clearInterval(pollInterval);
    };

    const onComplete = () => {
      if (!completed) {
        completed = true;
        cleanup();
        resolve(true);
      }
    };

    // Try WebSocket first
    socket = io('http://localhost:3000/telegram');

    socket.on('connect', () => {
      socket!.emit('joinUserRoom', firebaseUid);
    });

    socket.on('coAdminAdded', onComplete);

    socket.on('connect_error', () => {
      // Fall back to polling
      if (!pollInterval) {
        pollInterval = setInterval(async () => {
          try {
            const response = await fetch('/telegram/co-admin-status', {
              headers: { 'Authorization': `Bearer ${idToken}` }
            });
            const { coAdminAdded } = await response.json();
            
            if (coAdminAdded) {
              onComplete();
            }
          } catch (error) {
            console.error('Polling error:', error);
          }
        }, 5000);
      }
    });

    // Timeout after 30 minutes
    setTimeout(() => {
      cleanup();
      resolve(false);
    }, 30 * 60 * 1000);
  });
}
```

## Status Flags Explained

The onboarding endpoint returns three status flags:

### `isCreator: boolean`
- `true`: User has Creator or Admin role
- `false`: User has Fan role or doesn't exist
- Used to determine if user can access creator features

### `isCoAdmin: boolean`
- `true`: User has been promoted to co-admin of their Telegram channel
- `false`: Co-admin promotion not yet completed
- **Note:** This happens automatically after user scans QR code (no manual endpoint needed)

### `hasAcceptedTerms: boolean`
- `true`: User has accepted any version of terms and conditions
- `false`: User hasn't accepted terms yet
- Used to enforce terms acceptance before full access

## Cancellation Flow

If user abandons onboarding at any point:

**Endpoint:** `POST /creator/onboard/cancel`  
**Auth:** API Key

**Request Body:**
```typescript
{
  email: string;
  reason?: string;  // Optional: why user cancelled
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Purpose:**
- Updates CRM contact with cancellation info
- Tracks abandonment for analytics
- Enables follow-up campaigns

## Security Considerations

1. **Never send Firebase UID in request body**
   - Backend derives UID from verified JWT token
   - Prevents UID spoofing attacks

2. **Validate all inputs**
   - DTOs enforce validation rules
   - Percentages must be 0-100
   - All required fields checked

3. **Transaction safety**
   - Rollback on any failure
   - No partial states
   - Safe to retry

4. **Role hierarchy**
   - Admin > Creator > Fan
   - Admins never downgraded
   - Fans upgraded appropriately

5. **Idempotency**
   - Safe to call onboard multiple times
   - Returns status if already onboarded
   - No duplicate resource creation

6. **Single-Use Invite Links** ⭐ NEW
   - Links expire after first use
   - Prevents unauthorized channel access
   - Auto-regenerates if used or expired

7. **Automatic Promotion Security** ⭐ NEW
   - Only first joiner is promoted
   - Database flag prevents multiple promotions
   - Restricted admin rights only (no full admin access)

8. **WebSocket Authentication** ⭐ NEW
   - Clients join user-specific rooms
   - Room naming: `user:${firebaseUid}`
   - Events only sent to authorized users

## Testing

### Unit Tests
- Controller tests mock service layer
- Service tests mock external dependencies (Firebase, Telegram, Database)
- 100% coverage for onboarding logic
- **58 new tests for automatic promotion logic** ⭐ NEW

### Integration Tests
- Test complete flow with real database
- Test transaction rollback scenarios
- Test idempotency guarantees
- **Test WebSocket event emission** ⭐ NEW
- **Test polling mechanism** ⭐ NEW
- **Test invite link self-healing** ⭐ NEW

### Manual Testing Checklist

- [ ] New user can complete onboarding
- [ ] Existing fan upgrades to creator
- [ ] Admin user preserves admin role
- [ ] Telegram channel creation with valid handle
- [ ] Telegram channel creation with taken handle (should fail)
- [ ] Terms acceptance flow
- [ ] Idempotent behavior
