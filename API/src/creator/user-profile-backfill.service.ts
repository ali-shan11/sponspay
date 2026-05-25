import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { User } from './entities/user.entity';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';

@Injectable()
export class UserProfileBackfillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UserProfileBackfillService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {}

  async onApplicationBootstrap() {
    try {
      const userRepo = this.dataSource.getRepository(User);

      const usersToBackfill = await userRepo.find({
        where: [{ displayName: IsNull() }, { email: IsNull() }],
      });

      if (usersToBackfill.length === 0) {
        this.logger.log('All users already have displayName and email.');
        return;
      }

      this.logger.log(
        `Found ${usersToBackfill.length} users to backfill displayName/email from Firebase.`,
      );

      let updated = 0;
      for (const user of usersToBackfill) {
        try {
          const firebaseUser = await this.firebaseAdminService.getUser(
            user.firebaseUid,
          );
          if (!firebaseUser) {
            this.logger.warn(
              `Could not fetch Firebase user for UID: ${user.firebaseUid}, skipping.`,
            );
            continue;
          }

          let changed = false;
          if (!user.displayName && firebaseUser.displayName) {
            user.displayName = firebaseUser.displayName;
            changed = true;
          }
          if (!user.email && firebaseUser.email) {
            user.email = firebaseUser.email;
            changed = true;
          }

          if (changed) {
            await userRepo.save(user);
            updated++;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to backfill user ${user.firebaseUid}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      this.logger.log(`Backfilled displayName/email for ${updated} users.`);
    } catch (error) {
      this.logger.error('User profile backfill failed', error as Error);
    }
  }
}
