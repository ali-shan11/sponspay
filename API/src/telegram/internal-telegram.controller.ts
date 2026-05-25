import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TelegramChannel } from '../creator/entities/telegram-channel.entity';
import { TelegramAdapterService } from './telegram-adapter.service';
import { TelegramNotificationService } from './services/telegram-notification.service';
import { TelegramConfig } from './config/telegram.config';
import { InternalApiKeyGuard } from '../auth/internal-api-key.guard';

interface TelegramEventPayload {
  type: 'participant_joined';
  channelId: string;
  userId: string;
  date: number;
}

/**
 * Receives webhook events from the Telegram adapter service.
 * Replaces the polling-based co-admin promotion in TelegramCoAdminService.
 */
@Controller('internal/telegram')
@UseGuards(InternalApiKeyGuard)
export class InternalTelegramController {
  private readonly logger = new Logger(InternalTelegramController.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly adapterService: TelegramAdapterService,
    private readonly notificationService: TelegramNotificationService,
    private readonly telegramConfig: TelegramConfig,
  ) {}

  @Post('events')
  @HttpCode(200)
  async handleEvent(@Body() payload: TelegramEventPayload) {
    if (payload.type !== 'participant_joined') {
      this.logger.warn(`Unknown event type: ${payload.type}`);
      return { ok: true };
    }

    this.logger.log(
      `Received participant_joined event: channel=${payload.channelId}, user=${payload.userId}`,
    );

    // Find the channel by Telegram channel ID
    const channel = await this.dataSource
      .getRepository(TelegramChannel)
      .findOne({
        where: { channelId: payload.channelId },
        relations: [
          'youtubeChannel',
          'youtubeChannel.userChannels',
          'youtubeChannel.userChannels.user',
        ],
      });

    if (!channel) {
      this.logger.warn(
        `No channel found for Telegram channel ID ${payload.channelId}`,
      );
      return { ok: false, reason: 'channel_not_found' };
    }

    if (channel.coAdminAdded) {
      this.logger.log(
        `Co-admin already added for channel ${channel.channelHandle}. Skipping.`,
      );
      return { ok: true, reason: 'already_promoted' };
    }

    // Promote the user via the adapter service with retry logic
    await this.promoteWithRetry(channel, payload.userId);

    return { ok: true };
  }

  private async promoteWithRetry(
    channel: TelegramChannel,
    userId: string,
  ): Promise<void> {
    const maxAttempts = this.telegramConfig.maxRetryAttempts;
    const delays = this.telegramConfig.retryDelays;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.log(
          `Promotion attempt ${attempt}/${maxAttempts} for user ${userId} on channel ${channel.channelHandle}`,
        );

        await this.adapterService.promote(
          channel.channelId!,
          channel.channelHandle,
          userId,
        );

        // Update DB
        await this.dataSource.getRepository(TelegramChannel).update(
          { id: channel.id },
          {
            joinedUserId: userId,
            coAdminAdded: true,
          },
        );

        this.logger.log(
          `Successfully promoted user ${userId} to co-admin of channel ${channel.channelHandle}`,
        );

        // Notify the channel owner via WebSocket
        const ownerFirebaseUid = channel.youtubeChannel?.userChannels?.find(
          (uc) => uc.role === 'owner',
        )?.user?.firebaseUid;

        if (ownerFirebaseUid) {
          this.notificationService.notifyCoAdminAdded(
            ownerFirebaseUid,
            channel.channelHandle,
          );
        }

        return;
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        this.logger.error(
          `Promotion attempt ${attempt}/${maxAttempts} failed: ${errorMessage}`,
        );

        await this.dataSource.getRepository(TelegramChannel).update(
          { id: channel.id },
          {
            promotionAttempts: attempt,
            lastPromotionError: errorMessage,
          },
        );

        if (attempt === maxAttempts) {
          this.notificationService
            .sendPromotionFailureAlert(channel, userId, errorMessage)
            .catch((e) =>
              this.logger.error('Failed to send alert:', e?.message),
            );
          return;
        }

        await new Promise((r) => setTimeout(r, delays[attempt - 1]));
      }
    }
  }
}
