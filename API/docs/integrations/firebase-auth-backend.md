# Firebase Authentication with SponsPay Backend

Audience: Frontend developers integrating the WebApp or mobile clients with the SponsPay API.

Goal: Authenticate users with Firebase and call SponsPay endpoints securely. The backend verifies Firebase ID tokens and derives the user identity server-side. The client must never send the Firebase UID directly.

## Overview

- Client signs in with Firebase (Google, email/password, etc.)
- Client obtains a Firebase ID token (short-lived JWT) from Firebase SDK
- Client calls SponsPay API with Authorization: Bearer <ID_TOKEN>
- Backend verifies the token with Firebase Admin SDK and derives `uid`
- Backend performs domain logic using `uid` as the user identifier

Security rules:
- Do not send `firebaseUid` in request bodies or params
- Always send the Firebase ID token in the Authorization header
- The backend derives identity (uid) exclusively from the verified token

## Required endpoints (current)

- POST /creator/onboard
  - Body: creator onboarding fields (no `firebaseUid`)
  - Auth: Firebase Bearer token required
  - Response includes status flags: isCreator, isCoAdmin, hasAcceptedTerms
  - Idempotent: Returns status if already onboarded

Note: Older forms that included `firebaseUid` are deprecated. If present, the backend ignores or rejects mismatched UIDs.

## Setup (Web)

Install Firebase in your frontend:

```bash
npm i firebase
```

Initialize and sign in:

```ts
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, getIdToken, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  // etc
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Example login
export async function login(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  // Optionally get a token immediately
  const idToken = await getIdToken(user);
  return { user, idToken };
}

// Keep token fresh (optional helper)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // You can fetch a fresh token when needed:
    const idToken = await getIdToken(user, /* forceRefresh */ false);
    // Store in memory (preferred), not localStorage if possible
    window.__SP_ID_TOKEN__ = idToken;
  } else {
    window.__SP_ID_TOKEN__ = undefined;
  }
});
```

## Making authenticated API calls

Always include the Firebase ID token in the Authorization header:

```ts
async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const auth = (await import('firebase/auth')).getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  // Get a fresh token if needed
  const idToken = await getIdToken(user, /* forceRefresh */ false);

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${idToken}`);
  headers.set('Content-Type', 'application/json');

  return fetch(input, { ...init, headers });
}
```

Example: Creator Onboarding

```ts
const payload = {
  youtubeChannelId: 'UC123...',
  youtubeChannelName: 'My Channel',
  telegramHandle: 'my_private_channel_handle',
  totalSubscribers: 12345,
  countryAnalysis: { US: 50, DE: 10 },
  youtubePayingUsersPercentage: 3.1,
  sponspayPayingUsersPercentage: 1.2,
};

const res = await authFetch('/creator/onboard', {
  method: 'POST',
  body: JSON.stringify(payload),
});
const data = await res.json();
/*
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
*/
```

Example: Check Creator Status (via onboard endpoint)

```ts
// The /creator/onboard endpoint is idempotent and returns current status if already onboarded
const res = await authFetch('/creator/onboard', {
  method: 'POST',
  body: JSON.stringify(payload),
});
const response = await res.json();
/*
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
// If isCreator is true and data is undefined, user was already onboarded
*/
```

cURL examples (replace $ID_TOKEN):

```bash
curl -X POST https://api.yourdomain.com/creator/onboard \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "youtubeChannelId":"UC123...",
    "youtubeChannelName":"My Channel",
    "telegramHandle":"my_private_channel_handle",
    "totalSubscribers":12345,
    "countryAnalysis":{"US":50,"DE":10},
    "youtubePayingUsersPercentage":3.1,
    "sponspayPayingUsersPercentage":1.2
  }'

```

## Token refresh and error handling

- If a request returns 401 Unauthorized:
  1) Force refresh the token and retry once:
     ```ts
     const auth = getAuth();
     const user = auth.currentUser;
     if (user) {
       const freshToken = await getIdToken(user, true); // force refresh
       // retry request with fresh token
     }
     ```
  2) If it still fails, redirect the user to login as the session may be invalid/revoked.

- The backend can be configured to check revoked tokens (see FIREBASE_CHECK_REVOKED). When enabled, tokens revoked by Firebase will fail verification immediately.

## Optional: Session cookie approach (web)

For web-only apps, you may optionally exchange the ID token for a Firebase session cookie and store it in an httpOnly, Secure cookie. This improves protection against XSS but requires:
- A dedicated login endpoint to mint a session cookie from an ID token
- CSRF protection for state-changing requests
- Secure, SameSite cookie settings

SponsPay currently uses the simpler Bearer token approach for clients. Session cookies can be added later if required.

## Roles and authorization

- Roles are stored as Firebase custom claims and/or in the SponsPay database.
- Common roles: Admin, Creator, Fan
- The backend uses your verified `uid` to look up server-side role state and enforce authorization.

## Troubleshooting

- 401 Unauthorized
  - Missing/expired/invalid ID token
  - Using token from the wrong Firebase project (audience mismatch)
  - Local clock skew (sync system time)
- 403 Forbidden
  - User authenticated but lacks required role for the operation
- Getting UID on the client
  - Do NOT send UID to API. The backend derives `uid` from the token.
- CORS
  - Ensure the frontend origin is allowed by the API gateway/ingress CORS policy

## Security checklist

- Do not include `firebaseUid` in any request body or URL
- Always send `Authorization: Bearer <ID_TOKEN>`
- Use HTTPS exclusively
- Prefer in-memory token storage over localStorage
- Consider session cookies + CSRF for web if you need cookie-based auth

## Backend notes (for reference)

- Guard: `FirebaseAuthGuard` verifies Firebase tokens and attaches `req.user`
- Service: verifies tokens through `FirebaseAdminService.verifyIdToken`
- Environment: set `FIREBASE_CHECK_REVOKED=false` (default) or `true` for stricter checks
- Endpoints:
  - POST `/creator/onboard` (Bearer token, no `firebaseUid`, idempotent)
