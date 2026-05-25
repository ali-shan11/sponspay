# Firebase Integration

This document describes how SponsPay backend integrates with Firebase for authentication using the Firebase Admin SDK, and how NestJS strategies/guards are wired to validate incoming requests.

For frontend-specific guidance on authenticating and calling the backend with Firebase, see:
- docs/integrations/firebase-auth-backend.md

## Why Firebase?

- Authentication: Secure auth with multiple identity providers
- Scalability: Google-managed infrastructure
- Security: Signed ID tokens with server-side verification
- Ecosystem: Mature SDKs for web and mobile

## Overview of the flow

1) The client authenticates with Firebase and obtains a short-lived Firebase ID token (JWT).
2) The client calls SponsPay API endpoints and sends the ID token in the Authorization header:
   Authorization: Bearer <ID_TOKEN>
3) The backend verifies the ID token using Firebase Admin SDK and derives the user identity (uid).
4) The backend stores SponsPay-specific state linked to the Firebase UID (not PII).

The backend never trusts client-supplied UIDs from the request body or URL parameters. Identity is derived exclusively from the verified token.

## Firebase Admin Service

The Admin service initializes Firebase Admin SDK and exposes a verifyIdToken() method. Token revocation checks can be enabled via environment variable.

```typescript
// src/firebase/firebase-admin.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private firebaseApp: admin.app.App;
  private readonly logger = new Logger(FirebaseAdminService.name);
  private checkRevoked = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const serviceAccount = this.configService.get('FIREBASE_SERVICE_ACCOUNT');
    this.firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
    const check = this.configService.get('FIREBASE_CHECK_REVOKED');
    this.checkRevoked = String(check).toLowerCase() === 'true';
  }

  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken | false> {
    try {
      return await admin.auth().verifyIdToken(token, this.checkRevoked);
    } catch (error) {
      this.logger.warn('Firebase verifyIdToken failed', error as any);
      return false;
    }
  }

  async addCustomClaim(uid: string, key: string, value: string) {
    await this.firebaseApp.auth().setCustomUserClaims(uid, { [key]: value });
  }
}
```

Key features:
- Initializes Admin SDK on module startup
- Verifies ID tokens (with optional revocation check)
- Supports custom claims for role-based access

## Passport strategy and guard

We use `passport-firebase-jwt` to extract the token from the Authorization header and delegate verification to `FirebaseAdminService`.

```typescript
// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-firebase-jwt';
import { FirebaseAdminService } from 'src/firebase/firebase-admin.service';

@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy, 'firebase-jwt') {
  constructor(private firebaseAdminService: FirebaseAdminService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  validate(token: string) {
    return this.firebaseAdminService.verifyIdToken(token);
  }
}
```

```typescript
// src/auth/firebase-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Authenticates requests using Authorization: Bearer <idToken>
@Injectable()
export class FirebaseAuthGuard extends AuthGuard('firebase-jwt') {}
```

How it works:
1. Client sends Authorization: Bearer <ID_TOKEN>
2. Strategy extracts token from header
3. `FirebaseAdminService.verifyIdToken()` validates the token and returns `DecodedIdToken` or false
4. If valid, Passport attaches the decoded token to `req.user`
5. If invalid, the request is rejected with 401

## Using Firebase authentication in controllers

Controllers that require user identity should be protected with `FirebaseAuthGuard`. Do not accept a `firebaseUid` in the body or URL; derive identity from `req.user`.

```typescript
// Example controller usage
@UseGuards(FirebaseAuthGuard)
@Post('creator-onboard')
@ApiSecurity('firebase-jwt')
async onboardCreator(@Body() dto: CreateCreatorDto, @Req() req: Request) {
  const uid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
  if (!uid) {
    throw new UnauthorizedException('Missing Firebase user identity');
  }
  const status = await this.userService.getCreatorOnboardingStatus(uid);
  if (status.isCreator) {
    return {
      success: true,
      message: 'User already onboarded as a creator',
      ...status,
    };
  }
  const result = await this.userService.onboardCreator(uid, dto);
  return { ...result, ...status, isCreator: true };
}
```

## Decoded token shape

Firebase `DecodedIdToken` includes fields like:

```typescript
interface DecodedIdToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
  auth_time: number;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  firebase: {
    identities: Record<string, any>;
    sign_in_provider: string;
  };
  // Firebase often includes both uid and user_id; either may be present.
  user_id?: string;
  custom_claims?: Record<string, any>;
}
```

Note: In SponsPay we typically use `uid` (falling back to `user_id` if needed).

## Custom claims and roles

Use custom claims to encode high-level roles (e.g., Admin, Creator). For example:

```typescript
await firebaseAdminService.addCustomClaim(uid, 'role', 'Creator');
```

Authorization can then be enforced by reading `req.user` (decoded token) and/or via server-side role data persisted in the SponsPay database.

## Configuration

Environment variables (example):
```env
# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
FIREBASE_CHECK_REVOKED=false
```

Important:
- Store the service account JSON as a single-line string (escape properly).
- Use different service accounts per environment.
- Set `FIREBASE_CHECK_REVOKED=true` to enforce token revocation at verification time (adds extra latency).

App validation (excerpt from `AppModule`):
```ts
FIREBASE_SERVICE_ACCOUNT: Joi.string().required(),
FIREBASE_CHECK_REVOKED: Joi.boolean().default(false),
```

## Error handling best practices

- Expired token: return 401; frontend should refresh token and retry.
- Revoked token (if enabled): return 401; user must reauthenticate.
- Audience/issuer mismatch: ensure the frontend uses the correct Firebase project.

Logging example:
```ts
try {
  const decoded = await admin.auth().verifyIdToken(token, checkRevoked);
  return decoded;
} catch (error) {
  this.logger.warn('Firebase verifyIdToken failed', error as any);
  return false;
}
```

## Testing notes

- Unit tests should mock `firebase-admin` methods (e.g., `verifyIdToken`, `setCustomUserClaims`).
- Controller tests should simulate `req.user` being populated when `FirebaseAuthGuard` succeeds.
- E2E tests can inject valid/invalid tokens via the Authorization header.

## Security checklist

- Do not accept `firebaseUid` from the client; derive from verified token.
- Protect user-facing endpoints with `FirebaseAuthGuard`.
- Use HTTPS everywhere.
- Consider enabling revocation checks for sensitive flows via `FIREBASE_CHECK_REVOKED=true`.
- For web apps wanting cookie-based sessions, consider Firebase session cookies + CSRF (optional, future extension).

## Frontend integration guide

See docs/integrations/firebase-auth-backend.md for a step-by-step guide tailored to frontend developers (obtaining ID tokens, calling SponsPay endpoints, and handling token refresh/errors).
