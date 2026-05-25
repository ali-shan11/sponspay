import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { UserRole } from './enums/user.enum';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { YouTubeChannel } from './entities/youtube-channel.entity';
import { ChannelSnapshot } from './entities/channel-snapshot.entity';
import { TelegramChannel } from './entities/telegram-channel.entity';
import { UserChannel, UserChannelRole } from './entities/user-channel.entity';
import { YouTubeOAuthToken } from '../youtube-message/entities/youtube-oauth-token.entity';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { CancelOnboardingDto } from './dto/cancel-onboarding.dto';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { CreatorOnboardingResponseDto } from './dto/creator-onboarding-response.dto';
import { ZohoService } from '../zoho/zoho.service';
import { TelegramService } from '../telegram/telegram.service';
import { Terms } from '../terms/entities/terms.entity';
import { YouTubeOAuthService } from '../youtube-oauth/youtube-oauth.service';

@Injectable()
export class CreatorService {
  private readonly logger = new Logger(CreatorService.name);

  constructor(
    private firebaseAdminService: FirebaseAdminService,
    private readonly dataSource: DataSource,
    private readonly zohoService: ZohoService,
    private readonly telegramService: TelegramService,
    private readonly youtubeOAuthService: YouTubeOAuthService,
  ) {}

  async assignCreatorRole(uid: string) {
    await this.firebaseAdminService.addCustomClaim(
      uid,
      'role',
      UserRole.Creator,
    );
  }

  async getCreatorOnboardingStatus(uid: string) {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { firebaseUid: uid },
      relations: ['acceptedTerms'],
    });

    if (!user) {
      return {
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: false,
        youtubeConnected: false,
      };
    }

    // Admins skip onboarding entirely — they have access to all channels
    if (user.role === UserRole.Admin) {
      return {
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true,
        youtubeConnected: true,
      };
    }

    // Managers (manually added to a channel) also skip onboarding
    const managerChannel = await this.dataSource
      .getRepository(UserChannel)
      .findOne({
        where: { userId: user.id, role: UserChannelRole.Manager },
      });

    if (managerChannel) {
      return {
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true,
        youtubeConnected: true,
      };
    }

    // Check if user has YouTube OAuth token
    const youtubeToken = await this.dataSource
      .getRepository(YouTubeOAuthToken)
      .findOne({
        where: { userId: user.id },
      });

    // Check if user has a channel via UserChannel junction
    const userChannel = await this.dataSource
      .getRepository(UserChannel)
      .findOne({
        where: { userId: user.id },
        relations: ['youtubeChannel'],
      });

    // Check co-admin status via TelegramChannel linked to the YouTube channel
    let isCoAdmin = false;
    if (userChannel?.youtubeChannel) {
      const telegramChannel = await this.dataSource
        .getRepository(TelegramChannel)
        .findOne({
          where: { youtubeChannelId: userChannel.youtubeChannel.id },
        });
      isCoAdmin = !!telegramChannel?.coAdminAdded;
    }

    const isCreator = user.role === UserRole.Creator;
    const hasAcceptedTerms = !!user.acceptedTerms;
    // YouTube is "connected" only if we have BOTH token (for API calls) AND channel (for data)
    const youtubeConnected = !!youtubeToken && !!userChannel?.youtubeChannel;

    return { isCreator, isCoAdmin, hasAcceptedTerms, youtubeConnected };
  }

  async createSignInContact(signInData: CreateProspectDto): Promise<{
    success: boolean;
    message: string;
    userId?: string;
    isCreator?: boolean;
    isCoAdmin?: boolean;
    hasAcceptedTerms?: boolean;
    youtubeConnected?: boolean;
  }> {
    try {
      // Create or update Zoho contact
      await this.zohoService.createContactFromSignIn(signInData);

      // Get Firebase UID - use provided firebaseUid if available, otherwise lookup by googleUserId
      const firebaseUid =
        signInData.firebaseUid ||
        (signInData.googleUserId
          ? await this.firebaseAdminService.getFirebaseUidByGoogleId(
              signInData.googleUserId,
            )
          : null);

      // Create or find User if Firebase UID is provided
      let user: User | null = null;
      if (firebaseUid) {
        const userRepo = this.dataSource.getRepository(User);
        const displayName = signInData.displayName || null;
        const email = signInData.email || null;

        user = await userRepo.findOne({
          where: { firebaseUid },
        });

        if (!user) {
          // Create new user with Fan role
          user = userRepo.create({
            firebaseUid,
            role: UserRole.Fan,
            displayName,
            email,
          });
          user = await userRepo.save(user);
          this.logger.log(
            `Created User with Fan role for Firebase UID: ${firebaseUid}`,
          );
        } else if (user.displayName !== displayName || user.email !== email) {
          // Update displayName and email on every sign-in
          user.displayName = displayName;
          user.email = email;
          await userRepo.save(user);
          this.logger.log(
            `Updated displayName/email for Firebase UID: ${firebaseUid}`,
          );
        }
      }

      // Get onboarding status if user exists
      let onboardingStatus:
        | {
            isCreator: boolean;
            isCoAdmin: boolean;
            hasAcceptedTerms: boolean;
            youtubeConnected: boolean;
          }
        | undefined;

      if (firebaseUid) {
        onboardingStatus = await this.getCreatorOnboardingStatus(firebaseUid);
      }

      return {
        success: true,
        message: 'Contact created or updated successfully in ZohoCRM',
        userId: user?.id,
        ...(onboardingStatus || {}),
      };
    } catch (error) {
      this.logger.error(
        'Failed to create or update contact from sign-in',
        error,
      );
      return {
        success: false,
        message: 'Failed to create or update contact in ZohoCRM',
      };
    }
  }

  async cancelOnboarding(
    firebaseUid: string,
    dto: CancelOnboardingDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Look up User to verify they exist
      const user = await this.dataSource.getRepository(User).findOne({
        where: { firebaseUid },
      });

      if (!user) {
        throw new BadRequestException(
          'User not found. Please ensure you are signed in.',
        );
      }

      // Get email from Firebase Admin SDK
      const admin = await import('firebase-admin');
      const userRecord = await admin.auth().getUser(firebaseUid);
      const email = userRecord.email;

      if (!email) {
        throw new BadRequestException(
          'User email not found in Firebase account.',
        );
      }

      await this.zohoService.markContactOnboardingCancelled(
        email,
        dto.reason,
        dto.wantsUpdates ?? false,
      );
      return {
        success: true,
        message: 'Contact updated successfully in ZohoCRM',
      };
    } catch (error) {
      this.logger.error(
        'Failed to update contact for onboarding cancellation',
        error,
      );

      // Re-throw BadRequestException for proper error handling
      if (error instanceof BadRequestException) {
        throw error;
      }

      return {
        success: false,
        message: 'Failed to update contact in ZohoCRM',
      };
    }
  }

  async acceptTerms(
    uid: string,
    version: number,
  ): Promise<{
    success: boolean;
    message?: string;
    acceptedVersion?: number;
    acceptedAt?: string;
  }> {
    const userRepo = this.dataSource.getRepository(User);
    const termsRepo = this.dataSource.getRepository(Terms);

    const terms = await termsRepo.findOne({ where: { version } });
    if (!terms) {
      throw new Error(`Terms version ${version} not found`);
    }

    const user = await userRepo.findOne({ where: { firebaseUid: uid } });
    if (!user) {
      throw new Error(
        `User not found. User must be onboarded as a creator before accepting terms.`,
      );
    }

    const acceptanceTimestamp = new Date();
    user.acceptedTerms = terms;
    user.acceptedTermsAt = acceptanceTimestamp;
    await userRepo.save(user);

    this.logger.log(
      `Creator ${uid} accepted terms version ${version} at ${acceptanceTimestamp.toISOString()}`,
    );

    return {
      success: true,
      message: 'Terms and conditions accepted successfully',
      acceptedVersion: version,
      acceptedAt: acceptanceTimestamp.toISOString(),
    };
  }

  async onboardCreator(
    uid: string,
    createCreatorDto: CreateCreatorDto,
  ): Promise<CreatorOnboardingResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find User (must exist from sign-in)
      let user = await queryRunner.manager
        .getRepository(User)
        .findOne({ where: { firebaseUid: uid } });

      if (!user) {
        throw new BadRequestException(
          'User not found. Please sign in before onboarding.',
        );
      }

      // Check if already onboarded
      if (user.role === UserRole.Creator) {
        throw new ConflictException('User is already onboarded as a creator');
      }

      // Upgrade role to Creator (preserve Admin role if already Admin)
      const previousRole = user.role;
      const roleToSet =
        user.role === UserRole.Admin ? UserRole.Admin : UserRole.Creator;

      await queryRunner.manager
        .getRepository(User)
        .update({ firebaseUid: uid }, { role: roleToSet });
      user = { ...user, role: roleToSet };
      this.logger.log(
        `Upgraded User role from ${previousRole} to ${roleToSet} for ${uid}`,
      );

      // Fetch YouTube channel data from API
      const channelData =
        await this.youtubeOAuthService.getChannelDataForEstimator(user.id);

      if (!channelData.connected) {
        throw new BadRequestException(
          'YouTube not connected. Please connect YouTube before onboarding.',
        );
      }

      if (!channelData.channels || channelData.channels.length === 0) {
        throw new BadRequestException(
          'No YouTube channels found. Please ensure YouTube connection is valid.',
        );
      }

      // Find the specific channel user selected
      const selectedChannel = channelData.channels.find(
        (ch) => ch.id === createCreatorDto.youtubeChannelId,
      );

      if (!selectedChannel) {
        throw new BadRequestException(
          `YouTube channel ${createCreatorDto.youtubeChannelId} not found in connected account.`,
        );
      }

      const youtubeChannelName = selectedChannel.title;
      const totalSubscribers = parseInt(selectedChannel.subscriberCount, 10);

      // Fetch country analysis from YouTube Analytics
      let countryAnalysis = {};
      try {
        const analyticsReport =
          await this.youtubeOAuthService.getAnalyticsReport(
            user.id,
            createCreatorDto.youtubeChannelId,
            12, // 12 months
          );
        countryAnalysis =
          this.transformAnalyticsToCountryAnalysis(analyticsReport);
      } catch (error) {
        this.logger.warn(
          `Failed to fetch analytics for channel ${createCreatorDto.youtubeChannelId}: ${error.message}. Proceeding with empty country analysis.`,
        );
        // Continue with empty countryAnalysis - don't fail onboarding if analytics unavailable
      }

      // Check if YouTube channel already exists (created during sign-in)
      let savedChannel = await queryRunner.manager
        .getRepository(YouTubeChannel)
        .findOne({
          where: { channelId: createCreatorDto.youtubeChannelId },
        });

      const channelAlreadyExisted = !!savedChannel;

      if (savedChannel) {
        // Update existing channel name
        await queryRunner.manager
          .getRepository(YouTubeChannel)
          .update({ id: savedChannel.id }, { channelName: youtubeChannelName });
        savedChannel = {
          ...savedChannel,
          channelName: youtubeChannelName,
        };
        this.logger.log(
          `Linked existing YouTubeChannel ${createCreatorDto.youtubeChannelId} to user ${user.id}`,
        );
      } else {
        // Create new YouTube channel record
        const youtubeChannel = queryRunner.manager
          .getRepository(YouTubeChannel)
          .create({
            channelId: createCreatorDto.youtubeChannelId,
            channelName: youtubeChannelName,
          });
        savedChannel = await queryRunner.manager
          .getRepository(YouTubeChannel)
          .save(youtubeChannel);
        this.logger.log(
          `Created new YouTubeChannel ${createCreatorDto.youtubeChannelId} for user ${user.id}`,
        );
      }

      // Check if channel is already owned by another user
      const existingOwner = await queryRunner.manager
        .getRepository(UserChannel)
        .findOne({
          where: {
            youtubeChannelId: savedChannel.id,
            role: UserChannelRole.Owner,
          },
        });

      if (existingOwner && existingOwner.userId !== user.id) {
        const ownerUser = await queryRunner.manager
          .getRepository(User)
          .findOne({ where: { id: existingOwner.userId } });

        // Only allow takeover if the previous owner never completed onboarding (still a Fan)
        const isStale = ownerUser && ownerUser.role === UserRole.Fan;

        if (!isStale) {
          throw new ConflictException(
            'This YouTube channel has already been onboarded by another user.',
          );
        }

        // Previous owner never progressed past OAuth — remove their stale claim
        await queryRunner.manager
          .getRepository(UserChannel)
          .delete({ id: existingOwner.id });
        this.logger.log(
          `Removed stale ownership claim from user ${existingOwner.userId} for channel ${savedChannel.id}`,
        );
      }

      // Only create snapshot if channel didn't exist (avoid duplication from sign-in)
      if (!channelAlreadyExisted) {
        const channelSnapshot = queryRunner.manager
          .getRepository(ChannelSnapshot)
          .create({
            channelId: savedChannel.id,
            totalSubscribers: totalSubscribers,
            countryAnalysis: countryAnalysis,
            youtubePayingUsersPercentage:
              createCreatorDto.youtubePayingUsersPercentage,
            sponspayPayingUsersPercentage:
              createCreatorDto.sponspayPayingUsersPercentage,
          });
        await queryRunner.manager
          .getRepository(ChannelSnapshot)
          .save(channelSnapshot);
        this.logger.log(
          `Created initial snapshot for new channel ${createCreatorDto.youtubeChannelId}`,
        );
      } else {
        this.logger.log(
          `Skipped snapshot creation for ${createCreatorDto.youtubeChannelId} - already exists from sign-in`,
        );
      }

      // Create private Telegram channel
      const telegramResult = await this.telegramService.createPrivateChannel(
        createCreatorDto.telegramHandle,
      );

      if (!telegramResult.success) {
        throw new Error(
          `Failed to create Telegram channel for ${createCreatorDto.telegramHandle}`,
        );
      }

      // Save Telegram channel information (linked to YouTubeChannel)
      const telegramChannel = queryRunner.manager
        .getRepository(TelegramChannel)
        .create({
          channelHandle: createCreatorDto.telegramHandle,
          channelId: telegramResult.channelId,
          inviteLink: telegramResult.inviteLink,
          youtubeChannelId: savedChannel.id,
        });
      await queryRunner.manager
        .getRepository(TelegramChannel)
        .save(telegramChannel);

      // Upsert UserChannel junction record (may already exist from YouTube OAuth callback)
      await queryRunner.manager.getRepository(UserChannel).upsert(
        {
          userId: user.id,
          youtubeChannelId: savedChannel.id,
          role: UserChannelRole.Owner,
        },
        ['userId', 'youtubeChannelId'],
      );
      this.logger.log(
        `Upserted UserChannel (owner) for user ${user.id} and channel ${savedChannel.id}`,
      );

      // Assign creator role in Firebase (only if user is not Admin)
      if (user.role !== UserRole.Admin) {
        await this.assignCreatorRole(uid);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Successfully onboarded creator: ${uid}`);

      return {
        success: true,
        message: 'Creator onboarded successfully',
        data: {
          userId: user.id,
          youtubeChannelId: savedChannel.id,
          telegramChannelHandle: createCreatorDto.telegramHandle,
          role: user.role,
        },
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: !!user.acceptedTerms,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to onboard creator:', error);

      // Re-throw HTTP exceptions as-is for proper error handling
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new Error('Failed to onboard creator. Please try again.', {
        cause: error,
      });
    } finally {
      await queryRunner.release();
    }
  }

  async getUserChannels(firebaseUid: string, isAdmin: boolean = false) {
    if (isAdmin) {
      return this.getAllChannels();
    }

    const userChannels = await this.dataSource.getRepository(UserChannel).find({
      where: { user: { firebaseUid } },
      relations: ['youtubeChannel'],
      order: { createdAt: 'ASC' },
    });

    // Load telegram channels for each youtube channel
    const result = [];
    for (const uc of userChannels) {
      const telegramChannel = await this.dataSource
        .getRepository(TelegramChannel)
        .findOne({
          where: { youtubeChannelId: uc.youtubeChannel.id },
        });

      result.push({
        id: uc.youtubeChannel.id,
        youtubeChannelId: uc.youtubeChannel.channelId,
        channelName: uc.youtubeChannel.channelName,
        telegramHandle: telegramChannel?.channelHandle ?? null,
        role: uc.role,
        createdAt: uc.createdAt,
      });
    }

    return result;
  }

  private async getAllChannels() {
    const channels = await this.dataSource
      .getRepository(YouTubeChannel)
      .find({ order: { createdAt: 'ASC' } });

    const result = [];
    for (const channel of channels) {
      const telegramChannel = await this.dataSource
        .getRepository(TelegramChannel)
        .findOne({ where: { youtubeChannelId: channel.id } });

      result.push({
        id: channel.id,
        youtubeChannelId: channel.channelId,
        channelName: channel.channelName,
        telegramHandle: telegramChannel?.channelHandle ?? null,
        role: 'admin',
        createdAt: channel.createdAt,
      });
    }

    return result;
  }

  /**
   * Transform YouTube Analytics API response to countryAnalysis format
   * @param analyticsReport YouTube Analytics API response
   * @returns Country analysis object with views and subscribers per country
   */
  private transformAnalyticsToCountryAnalysis(analyticsReport: any): object {
    if (!analyticsReport?.rows || analyticsReport.rows.length === 0) {
      return {};
    }

    const countryAnalysis: Record<
      string,
      { views: number; subscribers: number }
    > = {};

    // YouTube Analytics format: rows = [['US', 10000, 500], ['GB', 5000, 250], ...]
    // columnHeaders = [{ name: 'country' }, { name: 'views' }, { name: 'subscribersGained' }]

    for (const row of analyticsReport.rows) {
      const [country, views, subscribersGained] = row;
      countryAnalysis[country] = {
        views: views || 0,
        subscribers: subscribersGained || 0,
      };
    }

    return countryAnalysis;
  }
}
