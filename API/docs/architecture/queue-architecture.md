# Queue & Telegram Architecture — Implementation Plan

## Context

Two problems need solving before production:

1. **Payment initiation under load** — `POST /fan/:channelHandle/payment` blocks on PawaPay synchronously. Under load, connections pile up. A crash mid-call leaves the transaction stuck in `pending` forever.
2. **Post-payment fire-and-forget** — Telegram message delivery, YouTube messages, and refunds run as `.catch()` callbacks. A crash drops them silently. A failed delivery has no durable retry.
3. **Telegram multi-instance conflict** — Telegram's MTProto protocol routes all updates to the most recently connected client per session. Running more than one API pod with the same `TELEGRAM_SESSION_STRING` terminates the session entirely (confirmed in practice — scaling beyond 1 pod required secret regeneration and a scale-down to recover).

---

## Solution Overview

Two parallel workstreams:

**1. Telegram Adapter Service** (new repository) — a small TypeScript + Express service that is the only process that ever connects to Telegram. The main API calls it over HTTP; it pushes events back via webhook. No business logic, no queues, no database.

**2. BullMQ Queues in the main API** — replaces fire-and-forget callbacks with durable, retryable jobs. PawaPay deposit creation moves into a queue so the HTTP response returns in ~50ms and crashes no longer lose in-flight work.

---

## Part 1: Telegram Adapter Service

### Repository

New repo: `sponspay-telegram-service`. Separate CI/CD pipeline, separate K8s deployment.

**Stack:** TypeScript + Express. No framework — the service is ~300 lines and a DI container adds no value here.

**Dependencies:** `express`, `telegram` (GramJS), `zod`.

### Source Structure

```
src/
  client.ts    # GramJS client init and connect()
  service.ts   # Telegram operations: sendMessage, promote, getInviteLink, revokeInviteLink
  events.ts    # addEventHandler for UpdateChannelParticipant → webhook delivery with retry
  routes.ts    # Express routes with Zod request validation
  auth.ts      # Bearer token middleware (shared INTERNAL_API_KEY)
  main.ts      # Express server bootstrap
test/
  service.spec.ts   # unit tests — GramJS client mocked
  routes.spec.ts    # integration tests — supertest
Dockerfile
.github/workflows/
  ci.yml        # lint, typecheck, test
  deploy.yml    # build image, push, apply k8s manifest
```

### HTTP API

All endpoints require `Authorization: Bearer <INTERNAL_API_KEY>`.

```
POST /messages
  body: { channelHandle: string, text: string }
  201 on success | 4xx/5xx on failure

POST /promotions
  body: { channelId: string, userId: string }
  200 on success | 4xx/5xx on failure

GET  /invite-links?channelHandle=xxx
  200 { inviteLink: string }

DELETE /invite-links
  body: { inviteLink: string }
  200 on success

GET  /health
  200 { status: 'ok', connected: boolean }
```

### Inbound Telegram Events

`addEventHandler` listens for `UpdateChannelParticipant`. On a new member join, the service POSTs to the main API:

```
POST <MAIN_API_URL>/internal/telegram/events
  Authorization: Bearer <INTERNAL_API_KEY>
  body: { type: 'participant_joined', channelId: string, userId: string, date: number }
```

Delivery is retried 3 times with 2-second backoff. The main API handler must be idempotent.

### Environment Variables

```
TELEGRAM_API_ID
TELEGRAM_API_HASH
TELEGRAM_SESSION_STRING
INTERNAL_API_KEY        # shared with main API
MAIN_API_URL            # e.g. http://sponspay-api-service (internal cluster DNS)
PORT                    # default 3000
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: telegram-service
spec:
  replicas: 1
  strategy:
    type: Recreate        # never overlap — two pods = session terminated
  template:
    spec:
      containers:
        - name: telegram-service
          image: <image>
          envFrom:
            - secretRef:
                name: telegram-service-credentials   # TELEGRAM_SESSION_STRING lives here only
```

`telegram-service-credentials` is a separate K8s Secret. The main API's Secret does not contain any Telegram credentials.

---

## Part 2: Main API Changes

### Remove Telegram Client from API Pods

The main API no longer initialises a `TelegramClient`. All code in `src/telegram/` that wraps GramJS operations is replaced by HTTP calls to the adapter service. The `TELEGRAM_SESSION_STRING`, `TELEGRAM_API_ID`, and `TELEGRAM_API_HASH` environment variables are removed from the main API's deployment manifest and Secret.

A new `TelegramAdapterService` (`src/telegram/telegram-adapter.service.ts`) wraps the HTTP calls:

```typescript
// replaces direct GramJS calls throughout the codebase
sendMessage(channelHandle: string, text: string): Promise<void>
promoteCoAdmin(channelId: string, userId: string): Promise<void>
getInviteLink(channelHandle: string): Promise<string>
revokeInviteLink(inviteLink: string): Promise<void>
```

### Add Internal Webhook Endpoint

New controller: `src/telegram/internal-telegram.controller.ts`

```
POST /internal/telegram/events
  Auth: internal API key (not Firebase, not service account)
  body: { type: 'participant_joined', channelId, userId, date }
```

This endpoint receives events from the adapter service and runs the co-admin promotion business logic (DB lookup, call `POST /promotions` back to adapter, update DB, emit Socket.IO event). This replaces `TelegramCoAdminService.startPollingForNewMember()` entirely.

### Add BullMQ

Install: `@nestjs/bullmq`, `bullmq`. Redis is already running.

Register `BullModule` in `AppModule` with the existing Redis connection. Add Bull Board at `/queues` for monitoring.

### Queue Processors

#### `fan-payment` queue

**Producer:** `FanService.initiatePayment()` — replaces the synchronous `createDeposit()` call.

**Consumer:** `PaymentProcessor`
- Calls PawaPay `createDeposit()`
- On PawaPay rejection: emits `paymentStatus: 'rejected'` via WebSocket
- On success: waits for PawaPay webhook (no action needed in the processor itself)

**Config:** retries 3, exponential backoff starting 2s, concurrency 10.

**Frontend change required:** add handling for `paymentStatus: 'rejected'` WebSocket event (map to the existing failed-payment modal).

#### `fan-message-delivery` queue

**Producer:** `PawapayWebhookService` — replaces the fire-and-forget `.catch()` call after confirming payment.

**Consumer:** `MessageDeliveryProcessor`
- Calls `TelegramAdapterService.sendMessage()`
- On final failure after all retries: adds a job to `fan-refund`

**Config:** retries 3, exponential backoff starting 1s, concurrency 3.

#### `fan-youtube-message` queue

**Producer:** `PawapayWebhookService` — replaces fire-and-forget.

**Consumer:** `YouTubeMessageProcessor` — no change to logic, just moved into a processor.

**Config:** retries 2, fixed 5s delay, concurrency 3.

#### `fan-refund` queue

**Producer:** `MessageDeliveryProcessor` on final delivery failure.

**Consumer:** `RefundProcessor` — calls PawaPay refund. No Telegram involved.

**Config:** retries 3, exponential backoff starting 5s, concurrency 3.

### Queue Summary

| Queue | Producer | Consumer | Retries | Backoff | Concurrency |
|-------|----------|----------|---------|---------|-------------|
| `fan-payment` | FanService | PaymentProcessor | 3 | exponential 2s | 10 |
| `fan-message-delivery` | PawapayWebhookService | MessageDeliveryProcessor | 3 | exponential 1s | 3 |
| `fan-youtube-message` | PawapayWebhookService | YouTubeMessageProcessor | 2 | fixed 5s | 3 |
| `fan-refund` | MessageDeliveryProcessor | RefundProcessor | 3 | exponential 5s | 3 |

---

## Implementation Order

### Phase 1 — Telegram Adapter Service

1. Create `sponspay-telegram-service` repo
2. Implement `client.ts`, `service.ts`, `auth.ts`, `routes.ts`, `main.ts`
3. Implement `events.ts` (event handler + webhook delivery with retry)
4. Write unit and integration tests
5. Add Dockerfile and CI workflow
6. Deploy to dev cluster (1 replica, Recreate)
7. Verify: send a test message, check `/health`, confirm invite link generation

### Phase 2 — Decouple Main API from Telegram

1. Add `TelegramAdapterService` with HTTP calls to the adapter
2. Add `POST /internal/telegram/events` endpoint with internal key auth
3. Replace `TelegramCoAdminService.startPollingForNewMember()` with the webhook handler (event-driven promotion)
4. Remove GramJS from `package.json`, remove Telegram env vars from main API manifests
5. Smoke test: full co-admin flow end-to-end in dev

### Phase 3 — BullMQ in Main API

1. Install `@nestjs/bullmq`, `bullmq`, add `BullModule` to `AppModule`
2. Add Bull Board at `/queues`
3. Implement `fan-message-delivery` processor and producer (highest impact — fixes money loss)
4. Implement `fan-refund` processor and producer
5. Implement `fan-youtube-message` processor and producer
6. Implement `fan-payment` processor, update `FanService` to enqueue instead of calling PawaPay directly
7. Update frontend: add `paymentStatus: 'rejected'` WebSocket handler

### Phase 4 — Deploy and Verify

1. Deploy main API changes to dev
2. Run full payment flow: fan pays → message delivered → co-admin promoted
3. Simulate crashes at each stage, confirm jobs resume after restart
4. Verify Bull Board shows correct queue depths and job history
5. Scale main API to 3 replicas in dev, confirm Telegram session stays stable
6. Deploy to prod

---

## Files Changed in Main API

**New files:**
- `src/telegram/telegram-adapter.service.ts`
- `src/telegram/internal-telegram.controller.ts`
- `src/fan/processors/payment.processor.ts`
- `src/fan/processors/message-delivery.processor.ts`
- `src/fan/processors/youtube-message.processor.ts`
- `src/fan/processors/refund.processor.ts`

**Modified files:**
- `src/fan/fan.service.ts` — enqueue deposit instead of calling PawaPay directly
- `src/pawapay/pawapay-webhook.service.ts` — enqueue post-payment jobs instead of fire-and-forget
- `src/telegram/telegram.module.ts` — remove GramJS client, remove session env vars
- `src/telegram/telegram-co-admin.service.ts` — remove polling logic
- `src/app.module.ts` — add BullModule, Bull Board
- `k8s/base/deployment.yaml` — remove Telegram env vars from main API

**Deleted files:**
- `src/telegram/telegram.module.ts` factory provider for `TelegramClient` (or gutted)
- Any remaining GramJS import sites in the main API
