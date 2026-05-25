import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Authenticates requests using Firebase ID tokens provided as
 * Authorization: Bearer <idToken>.
 *
 * This guard does NOT perform role checks. Pair with RolesGuard if needed.
 */
@Injectable()
export class FirebaseAuthGuard extends AuthGuard('firebase-jwt') {}
