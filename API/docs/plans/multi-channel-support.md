# Multi-Channel Support - Backend Implementation Plan

## Context

The recent auth refactor (Feb 4-5) separated the user identity from the YouTube channel - users now sign up as `Fan` and onboard channels separately. However, the data model still assumes 1:1 user-to-channel: transactions are tied to `User` (beneficiary), creator-insights queries scope by `firebaseUid`, and `TelegramChannel`/`YouTubeChannel` both have direct FKs to `User`.

We need to extend this so that:
- One person can manage **multiple channels**
- Multiple people can manage the **same channel** (many-to-many)
- Transactions are tied to a **channel**, not just a user
- Dashboard API endpoints accept a `channelId` parameter so the frontend can show data per-channel

## Design Decision: YouTubeChannel as the Channel Identity

Use `YouTubeChannel` as the primary "channel" concept rather than creating a new abstract entity. Rationale:
- The system is YouTube-centric - each onboarded channel IS a YouTube channel paired with a Telegram channel
- `YouTubeChannel` already has a unique external ID (`channelId`), name, and snapshots
- YAGNI - no need for an abstraction layer until a non-YouTube channel type exists

## Database Schema Changes

**No migrations needed.** `DB_SYNC=true` in development, so all entity changes auto-sync to PostgreSQL on app restart. The dev DB has clean/minimal data, so column drops are safe. No migration files to generate or run.

The implementation order below is structured so that new columns/tables are added first (additive, non-breaking) and old columns are removed later, but with a clean DB this is a convenience rather than a requirement.

## Entity Changes

### 1. New: `UserChannel` junction entity
**File:** `src/creator/entities/user-channel.entity.ts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `userId` | UUID FK → User | NOT NULL |
| `youtubeChannelId` | UUID FK → YouTubeChannel | NOT NULL |
| `role` | enum(`owner`, `manager`) | default `owner` |
| `createdAt` | timestamp | auto |
| `updatedAt` | timestamp | auto |

- **UNIQUE constraint** on `(userId, youtubeChannelId)`
- `owner` = the user who onboarded the channel; `manager` = invited collaborators

### 2. Modify: `YouTubeChannel` entity
**File:** `src/creator/entities/youtube-channel.entity.ts`

- **Remove** `creatorId` column and `@ManyToOne(() => User)` relation
- **Add** `@OneToMany(() => UserChannel, uc => uc.youtubeChannel)`
- **Add** `@OneToOne(() => TelegramChannel, tc => tc.youtubeChannel)` (inverse)

### 3. Modify: `TelegramChannel` entity
**File:** `src/creator/entities/telegram-channel.entity.ts`

- **Replace** `creatorId` (FK → User) with `youtubeChannelId` (FK → YouTubeChannel)
- **Replace** `@ManyToOne(() => User)` with `@OneToOne(() => YouTubeChannel)`
- Relationship chain becomes: `User → UserChannel → YouTubeChannel → TelegramChannel`

### 4. Modify: `Transaction` entity
**File:** `src/transaction/entities/transaction.entity.ts`

- **Add** `youtubeChannelId` column (UUID FK → YouTubeChannel, nullable initially, then non-nullable)
- **Add** `@ManyToOne(() => YouTubeChannel)` relation
- **Keep** `beneficiary` (FK → User) - still needed for fee calculation (`feePercentage` is on User) and payout linkage

### 5. Modify: `User` entity
**File:** `src/creator/entities/user.entity.ts`

- **Remove** `@OneToMany(() => TelegramChannel)` and `@OneToMany(() => YouTubeChannel)`
- **Add** `@OneToMany(() => UserChannel, uc => uc.user)`

### 6. No changes: `Account`, `Payout`, `ChannelSnapshot`, `YouTubeOAuthToken`
- Accounts/payouts belong to users (a person's mobile money account, not a channel's)
- ChannelSnapshot already FKs to YouTubeChannel
- OAuth tokens belong to users (one Google account, multiple channels)

## New Endpoint

### `GET /creator/channels` - List user's channels
- **Auth:** FirebaseAuthGuard + RolesGuard (Creator)
- **Response:** Array of channel objects

```typescript
[
  {
    id: "uuid",                        // YouTubeChannel.id (use as channelId param)
    youtubeChannelId: "UC...",         // YouTube's external ID
    channelName: "My Channel",
    telegramHandle: "@mychannel",
    role: "owner",                     // user's role on this channel
    createdAt: "2026-02-05T..."
  }
]
```

## Updated Endpoints (creator-insights)

All channel-scoped endpoints get a **required** `channelId` query parameter (the `YouTubeChannel.id` UUID):

| Endpoint | Change |
|----------|--------|
| `GET /creator-insights/revenue-per-day` | Add required `channelId`; filter transactions by `youtubeChannelId` instead of `beneficiary.firebaseUid` |
| `GET /creator-insights/top-earning-countries` | Same pattern |
| `GET /creator-insights/channel-statistics` | Use TelegramChannel linked to the given YouTubeChannel |
| `GET /creator-insights/transactions` | Filter by `youtubeChannelId`; get TelegramChannel from YouTubeChannel for reply checks |
| `GET /creator-insights/message-unit-statistics` | Filter by `youtubeChannelId` |
| `GET /creator-insights/account-statistics` | Keep user-scoped (accounts belong to users), optionally accept `channelId` to filter transactions |
| `GET /creator-insights/payouts` | Keep user-scoped, optionally accept `channelId` |

Each endpoint validates channel access via `UserChannel` junction before serving data.

## Service Changes (non-insights)

### `FanService.initiatePayment` (`src/fan/fan.service.ts:439`)
Currently: `beneficiary: telegramChannel.creator`
After: Navigate `telegramChannel.youtubeChannel → userChannels (owner) → user` to find beneficiary, and also set `youtubeChannel` on the transaction.

### `FanService.getChannelInfo` (`src/fan/fan.service.ts:82`)
Currently: `youtubeChannelRepo.findOne({ creatorId: telegramChannel.creatorId })`
After: Use `telegramChannel.youtubeChannel` directly (it's the owning side of the 1:1).

### `PawapayWebhookService.processDepositCallback` (`src/pawapay/pawapay-webhook.service.ts:82`)
Currently: Loads `beneficiary.telegramChannels`
After: Load `transaction.youtubeChannel.telegramChannel` instead.

### `TelegramMessageService.deliverWithRetry` (`src/telegram/services/telegram-message.service.ts:68`)
Currently: `transaction.beneficiary.telegramChannels?.[0]`
After: `transaction.youtubeChannel.telegramChannel`

### `CreatorService.onboardCreator` (`src/creator/creator.service.ts:418-429`)
After creating YouTubeChannel + TelegramChannel, also create a `UserChannel` record with `role: 'owner'`. Set `youtubeChannelId` on TelegramChannel instead of `creatorId`.

### `CreatorService.getCreatorOnboardingStatus` (`src/creator/creator.service.ts:44-81`)
Navigate through `UserChannel → YouTubeChannel → TelegramChannel` instead of `user.telegramChannels`.

## Implementation Order

### Phase 1: Add new entity + new FK (non-breaking, additive)
1. Create `UserChannel` entity
2. Add `youtubeChannelId` (nullable) to `Transaction`
3. Register `UserChannel` in modules
4. Restart app (DB_SYNC creates table + column)

### Phase 2: Update onboarding to create UserChannel records
5. Modify `onboardCreator` to create `UserChannel(role: 'owner')` alongside channel creation
6. Set `youtubeChannelId` on TelegramChannel (add column alongside existing `creatorId` temporarily)
7. Implement `GET /creator/channels` endpoint
8. Update `getCreatorOnboardingStatus`

### Phase 3: Update transaction creation to populate youtubeChannelId
9. Update `FanService.initiatePayment` to set `youtubeChannel` on new transactions
10. Update `FanService.getChannelInfo` to use `telegramChannel.youtubeChannel`

### Phase 4: Rewire TelegramChannel and clean up old FKs
11. Update `TelegramMessageService.deliverWithRetry`
12. Update `PawapayWebhookService.processDepositCallback`
13. Remove `creatorId` from `TelegramChannel` entity (replaced by `youtubeChannelId`)
14. Remove `creatorId` from `YouTubeChannel` entity (replaced by `UserChannel` junction)
15. Update `User` entity relations

### Phase 5: Update creator-insights to be channel-scoped
16. Add `validateChannelAccess` helper to `CreatorInsightsService`
17. Update all 7 creator-insights endpoints to accept `channelId`
18. Update service methods to filter by `youtubeChannelId` instead of `beneficiary.firebaseUid`

### Phase 6: Harden + tests
19. Change `youtubeChannelId` on Transaction from nullable to non-nullable (clean dev DB - no backfill needed)
20. Update all affected tests

## Future Work: Channel Invitation Flow

When implementing the ability to invite users as `manager` to pre-existing channels, the following areas will need attention:

### `getCreatorOnboardingStatus` (`src/creator/creator.service.ts:45`)
Currently uses `findOne` on `UserChannel`, so it only checks co-admin status for whichever channel is returned first. For a user who owns channel A (co-admin added) and manages channel B (co-admin not added), the result is non-deterministic. Options:
- Check co-admin status across **all owned channels** and return `isCoAdmin: true` only if all have co-admin added
- Return per-channel onboarding status instead of a single boolean
- Keep as-is if onboarding status is only relevant during initial single-channel onboarding (current behavior is fine for this case)

### Invitation endpoint (new)
- `POST /creator/channels/:channelId/invite` — invite a user by email/firebaseUid as `manager`
- Validate that the requesting user is `owner` of the channel
- Create `UserChannel` record with `role: 'manager'` for the invitee
- Consider whether managers need a separate onboarding flow or just get access immediately

### Access control considerations
- `resetUser` in `admin-dev.service.ts` already scopes transaction deletion to `role: 'owner'` only — managers won't have their managed channels' data wiped
- `preSeedTransactions` seeds across all channels (owned + managed) — may want to limit to owned channels only
- Creator-insights `validateChannelAccess` already works for both owners and managers via `UserChannel` junction

## Verification
- Run `npm run lint:check` after each phase
- Run `npm test` after each phase
- Run `npm run test:e2e` after Phase 5-6
- Manual testing: Start dev server, call `GET /creator/channels` with valid JWT, verify response
- Manual testing: Call creator-insights endpoints with `channelId` param, verify scoping
