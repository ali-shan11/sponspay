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

  async verifyIdToken(
    token: string,
  ): Promise<admin.auth.DecodedIdToken | false> {
    try {
      return await admin.auth().verifyIdToken(token, this.checkRevoked);
    } catch (error) {
      this.logger.warn('Firebase verifyIdToken failed', error as any);
      return false;
    }
  }

  async addCustomClaim(uid: string, key: string, value: string) {
    await this.firebaseApp.auth().setCustomUserClaims(uid, {
      [key]: value,
    });
  }

  async getUser(uid: string): Promise<admin.auth.UserRecord | null> {
    try {
      return await this.firebaseApp.auth().getUser(uid);
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Firebase user for UID: ${uid}. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async getFirebaseUidByGoogleId(googleUserId: string): Promise<string | null> {
    try {
      const userRecord = await this.firebaseApp
        .auth()
        .getUserByProviderUid('google.com', googleUserId);
      return userRecord.uid;
    } catch (error) {
      this.logger.warn(
        `User not found for Google ID: ${googleUserId}. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
