import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TelegramChannel } from '../../creator/entities/telegram-channel.entity';
import { UserChannel } from '../../creator/entities/user-channel.entity';
import { TelegramAdapterService } from '../telegram-adapter.service';
import { TelegramNotificationService } from './telegram-notification.service';

/**
 * Handles co-admin status queries with automatic recovery.
 * If the telegram-service missed the join event, this service
 * detects the user in the channel participants and triggers promotion.
 */
@Injectable()
export class TelegramCoAdminService {
  private readonly logger = new Logger(TelegramCoAdminService.name);
  private readonly RECOVERY_COOLDOWN_MS = 15_000;
  private lastRecoveryAttempt = new Map<string, number>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly adapterService: TelegramAdapterService,
    private readonly notificationService: TelegramNotificationService,
  ) {}

  async getCoAdminStatus(firebaseUid: string): Promise<{
    coAdminAdded: boolean;
    channelHandle: string;
    channelId: string;
    lastChecked: string;
  }> {
    const userChannel = await this.dataSource
      .getRepository(UserChannel)
      .findOne({
        where: { user: { firebaseUid } },
        relations: ['youtubeChannel'],
        order: { createdAt: 'DESC' },
      });

    if (!userChannel?.youtubeChannel) {
      throw new NotFoundException('No channel found for this user');
    }

    const channel = await this.dataSource
      .getRepository(TelegramChannel)
      .findOne({
        where: { youtubeChannelId: userChannel.youtubeChannel.id },
      });

    if (!channel) {
      throw new NotFoundException('No Telegram channel found for this user');
    }

    // If not yet promoted, attempt recovery
    if (!channel.coAdminAdded && channel.channelId) {
      await this.attemptRecovery(channel, firebaseUid);
    }

    return {
      coAdminAdded: channel.coAdminAdded,
      channelHandle: channel.channelHandle,
      channelId: channel.channelId || '',
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Checks if a user is already in the channel but wasn't promoted
   * (e.g., telegram-service missed the join event).
   * Throttled to avoid excessive adapter API calls.
   */
  private async attemptRecovery(
    channel: TelegramChannel,
    firebaseUid: string,
  ): Promise<void> {
    const now = Date.now();
    const lastAttempt =
      this.lastRecoveryAttempt.get(channel.channelHandle) ?? 0;

    if (now - lastAttempt < this.RECOVERY_COOLDOWN_MS) {
      return;
    }
    this.lastRecoveryAttempt.set(channel.channelHandle, now);

    try {
      const { participants } = await this.adapterService.getParticipants(
        channel.channelHandle,
        'recent',
        50,
        channel.channelId!,
      );

      if (!participants || participants.length === 0) {
        return;
      }

      // Exclude the channel creator (our service account) and bots
      const joinedUser = participants.find(
        (p: any) =>
          p.className !== 'ChannelParticipantCreator' && !p.bot && !p.self,
      );

      if (!joinedUser) {
        return;
      }

      const userId = String(joinedUser.userId);
      this.logger.log(
        `Recovery: detected user ${userId} in channel ${channel.channelHandle} - triggering promotion`,
      );

      await this.adapterService.promote(
        channel.channelId!,
        channel.channelHandle,
        userId,
      );

      await this.dataSource.getRepository(TelegramChannel).update(
        { id: channel.id },
        {
          joinedUserId: userId,
          coAdminAdded: true,
        },
      );

      // Reload so the return value reflects the update
      channel.coAdminAdded = true;
      channel.joinedUserId = userId;

      this.notificationService.notifyCoAdminAdded(
        firebaseUid,
        channel.channelHandle,
      );

      this.logger.log(
        `Recovery: successfully promoted user ${userId} on channel ${channel.channelHandle}`,
      );

      this.lastRecoveryAttempt.delete(channel.channelHandle);
    } catch (error: any) {
      this.logger.warn(
        `Recovery attempt failed for channel ${channel.channelHandle}: ${error?.message}`,
      );
    }
  }
}
