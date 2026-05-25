import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { TelegramChannel } from '../../creator/entities/telegram-channel.entity';
import { UserChannel } from '../../creator/entities/user-channel.entity';
import { TelegramAdapterService } from '../telegram-adapter.service';
import { TelegramNotificationService } from './telegram-notification.service';

/**
 * Handles Telegram channel lifecycle management.
 * All GramJS operations are delegated to the Telegram adapter microservice via HTTP.
 */
@Injectable()
export class TelegramChannelService {
  private readonly logger = new Logger(TelegramChannelService.name);

  constructor(
    private readonly adapter: TelegramAdapterService,
    private readonly dataSource: DataSource,
    private readonly notificationService: TelegramNotificationService,
  ) {}

  async findTakenChannelHandles(handles: string[]): Promise<string[]> {
    const records = await this.dataSource.getRepository(TelegramChannel).find({
      where: { channelHandle: In(handles) },
      select: ['channelHandle'],
    });
    return records.map((r) => r.channelHandle);
  }

  async getChannelInviteInfo(firebaseUid: string): Promise<{
    channelHandle: string;
    inviteLink: string | null;
    channelId?: string;
    coAdminAdded: boolean;
  }> {
    const userChannel = await this.dataSource
      .getRepository(UserChannel)
      .findOne({
        where: { user: { firebaseUid } },
        relations: ['youtubeChannel'],
        order: { createdAt: 'DESC' },
      });

    if (!userChannel?.youtubeChannel) {
      throw new NotFoundException(
        'No channel found for this user. Please complete the creator onboarding process first.',
      );
    }

    const channel = await this.dataSource
      .getRepository(TelegramChannel)
      .findOne({
        where: { youtubeChannelId: userChannel.youtubeChannel.id },
      });

    if (!channel) {
      throw new NotFoundException(
        'No Telegram channel found for this user. Please complete the creator onboarding process first.',
      );
    }

    // Recovery: if not yet promoted, check if user is already in the channel
    if (!channel.coAdminAdded && channel.channelId) {
      try {
        const { participants } = await this.adapter.getParticipants(
          channel.channelHandle,
          'recent',
          50,
          channel.channelId,
        );

        // Exclude the channel creator (our service account) and bots
        const joinedUser = participants?.find(
          (p: any) =>
            p.className !== 'ChannelParticipantCreator' && !p.bot && !p.self,
        );

        if (joinedUser) {
          const userId = String(joinedUser.userId);
          this.logger.log(
            `Recovery: user ${userId} already in channel ${channel.channelHandle} - promoting`,
          );

          await this.adapter.promote(
            channel.channelId,
            channel.channelHandle,
            userId,
          );
          await this.dataSource
            .getRepository(TelegramChannel)
            .update(
              { id: channel.id },
              { joinedUserId: userId, coAdminAdded: true },
            );
          channel.coAdminAdded = true;

          this.notificationService.notifyCoAdminAdded(
            firebaseUid,
            channel.channelHandle,
          );

          this.logger.log(
            `Recovery: promoted user ${userId} on channel ${channel.channelHandle}`,
          );
        }
      } catch (error: any) {
        this.logger.warn(
          `Recovery check failed for ${channel.channelHandle}: ${error?.message}`,
        );
      }
    }

    let inviteLink = channel.inviteLink;
    let needsNewLink = false;

    // Check if the existing invite link is expired or used
    if (inviteLink && channel.channelId && !channel.coAdminAdded) {
      const isValid = await this.checkInviteLinkValidity(
        inviteLink,
        channel.channelHandle,
      );
      if (!isValid) {
        this.logger.log(
          `Invite link for channel ${channel.channelHandle} is expired or used. Will generate a new one.`,
        );
        needsNewLink = true;
        inviteLink = undefined;
      }
    }

    // If no invite link exists or it's expired, attempt to generate one
    if ((!inviteLink || needsNewLink) && channel.channelId) {
      try {
        this.logger.log(
          `No invite link found for channel ${channel.channelHandle}. Attempting to generate one...`,
        );

        // If we're regenerating, revoke ALL exported invites first
        if (needsNewLink) {
          try {
            const exportedInvites = await this.adapter.getExportedInvites(
              channel.channelHandle,
              channel.channelId,
            );

            if (exportedInvites.invites.length > 0) {
              this.logger.log(
                `Found ${exportedInvites.invites.length} existing invite(s). Revoking all...`,
              );

              for (const invite of exportedInvites.invites) {
                try {
                  await this.adapter.revokeInviteLink(
                    channel.channelHandle,
                    invite.link,
                    channel.channelId,
                  );
                  this.logger.log(`Revoked invite: ${invite.link}`);
                } catch (deleteError: any) {
                  this.logger.warn(
                    `Could not revoke invite ${invite.link}: ${deleteError?.message || deleteError}`,
                  );
                }
              }
            }
          } catch (revokeError: any) {
            this.logger.warn(
              `Error while revoking old invites: ${revokeError?.message || revokeError}`,
            );
          }
        }

        // Generate invite link via adapter
        const inviteResult = await this.adapter.generateInviteLink(
          channel.channelHandle,
          needsNewLink ? 3 : 1,
          needsNewLink ? 'Creator Invite (Retry)' : 'Creator Invite',
          channel.channelId,
        );

        inviteLink = inviteResult.inviteLink;

        await this.dataSource.getRepository(TelegramChannel).update(
          { id: channel.id },
          {
            inviteLink,
            promotionAttempts: 0,
            lastPromotionError: undefined,
          },
        );

        this.logger.log(
          `Generated and stored invite link for channel ${channel.channelHandle}: ${inviteLink}`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to generate invite link for channel ${channel.channelHandle}:`,
          error?.message || error,
        );
      }
    }

    return {
      channelHandle: channel.channelHandle,
      inviteLink: inviteLink || null,
      channelId: channel.channelId,
      coAdminAdded: channel.coAdminAdded,
    };
  }

  async getFanInviteLink(channelHandle: string): Promise<string | null> {
    try {
      const channel = await this.dataSource
        .getRepository(TelegramChannel)
        .findOne({
          where: { channelHandle: channelHandle.toLowerCase() },
        });

      if (!channel || !channel.channelId) {
        this.logger.warn(
          `Channel ${channelHandle} not found or not configured for fan invite link`,
        );
        return null;
      }

      let inviteLink = channel.fanInviteLink;

      // Check if existing fan invite link is valid
      if (inviteLink) {
        const isValid = await this.checkInviteLinkValidity(
          inviteLink,
          channel.channelHandle,
        );
        if (isValid) {
          return inviteLink;
        }
        this.logger.log(
          `Fan invite link for channel ${channel.channelHandle} is expired. Generating new one.`,
        );

        // Revoke old link
        try {
          await this.adapter.revokeInviteLink(
            channel.channelHandle,
            inviteLink,
            channel.channelId,
          );
        } catch (revokeError: any) {
          this.logger.warn(
            `Could not revoke old fan invite link: ${revokeError?.message || revokeError}`,
          );
        }
      }

      // Generate unlimited-use invite link
      const inviteResult = await this.adapter.generateInviteLink(
        channel.channelHandle,
        0, // unlimited
        'Fan Invite',
        channel.channelId,
      );

      inviteLink = inviteResult.inviteLink;

      await this.dataSource
        .getRepository(TelegramChannel)
        .update({ id: channel.id }, { fanInviteLink: inviteLink });

      this.logger.log(
        `Generated fan invite link for channel ${channel.channelHandle}: ${inviteLink}`,
      );

      return inviteLink;
    } catch (error: any) {
      this.logger.error(
        `Failed to get/generate fan invite link for channel ${channelHandle}:`,
        error?.message || error,
      );
      return null;
    }
  }

  async createPrivateChannel(
    channelHandle: string,
  ): Promise<{ success: boolean; channelId?: string; inviteLink?: string }> {
    try {
      const result = await this.adapter.createChannel(channelHandle);

      this.logger.log(
        `Successfully created private channel: ${channelHandle} with ID: ${result.channelId}`,
      );

      return {
        success: true,
        channelId: result.channelId,
        inviteLink: result.inviteLink,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to create private channel ${channelHandle}:`,
        error?.message || error,
      );
      return { success: false };
    }
  }

  async verifyChannelAccess(channelHandle: string): Promise<boolean> {
    try {
      const channel = await this.dataSource
        .getRepository(TelegramChannel)
        .findOne({
          where: { channelHandle: channelHandle.toLowerCase() },
        });

      if (!channel) {
        this.logger.warn(`Channel not found in database: ${channelHandle}`);
        return false;
      }

      const result = await this.adapter.getChannelAccess(
        channel.channelHandle,
        channel.channelId,
      );

      if (!result.accessible) {
        this.logger.warn(
          `Channel ${channelHandle} has only ${result.adminCount} admin(s)`,
        );
        return false;
      }

      this.logger.log(
        `Verified channel access for ${channelHandle}: ${result.adminCount} admins present`,
      );
      return true;
    } catch (error: any) {
      this.logger.error(
        `Error verifying channel access for ${channelHandle}: ${error?.message || error}`,
      );
      return false;
    }
  }

  private async checkInviteLinkValidity(
    inviteLink: string,
    channelHandle: string,
  ): Promise<boolean> {
    try {
      const hashMatch =
        inviteLink.match(/\/\+([A-Za-z0-9_-]+)/) ||
        inviteLink.match(/\/joinchat\/([A-Za-z0-9_-]+)/);

      if (!hashMatch || !hashMatch[1]) {
        this.logger.warn(
          `Could not extract hash from invite link: ${inviteLink}`,
        );
        return false;
      }

      const result = await this.adapter.checkInviteLink(hashMatch[1]);

      this.logger.log(
        `Invite link check result for ${channelHandle}: ${result.className}`,
      );

      // ChatInviteAlready means the bot account is already a member of the
      // channel — the link is still valid for other users.
      return result.valid || result.className === 'ChatInviteAlready';
    } catch (error: any) {
      this.logger.error(
        `Error checking invite link validity for channel ${channelHandle}:`,
        error?.message || error,
      );
      return false;
    }
  }
}
