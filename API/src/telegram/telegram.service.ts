import { Injectable, Logger } from '@nestjs/common';
import { TelegramChannelService } from './services/telegram-channel.service';
import { TelegramCoAdminService } from './services/telegram-co-admin.service';
import { TelegramMessageService } from './services/telegram-message.service';

/**
 * Main Telegram service orchestrator.
 * Delegates to specialized services for channel management, co-admin status,
 * message delivery, and refund handling.
 *
 * GramJS operations are now handled by the Telegram adapter microservice.
 * Co-admin promotion is event-driven via InternalTelegramController.
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly channelService: TelegramChannelService,
    private readonly coAdminService: TelegramCoAdminService,
    private readonly messageService: TelegramMessageService,
  ) {}

  async findTakenChannelHandles(handles: string[]): Promise<string[]> {
    return this.channelService.findTakenChannelHandles(handles);
  }

  async getChannelInviteInfo(firebaseUid: string): Promise<{
    channelHandle: string;
    inviteLink: string | null;
    channelId?: string;
    coAdminAdded: boolean;
  }> {
    return this.channelService.getChannelInviteInfo(firebaseUid);
  }

  async getFanInviteLink(channelHandle: string): Promise<string | null> {
    return this.channelService.getFanInviteLink(channelHandle);
  }

  async getCoAdminStatus(firebaseUid: string): Promise<{
    coAdminAdded: boolean;
    channelHandle: string;
    channelId: string;
    lastChecked: string;
  }> {
    return this.coAdminService.getCoAdminStatus(firebaseUid);
  }

  async createPrivateChannel(
    channelHandle: string,
  ): Promise<{ success: boolean; channelId?: string; inviteLink?: string }> {
    return this.channelService.createPrivateChannel(channelHandle);
  }

  async verifyChannelAccess(channelHandle: string): Promise<boolean> {
    return this.channelService.verifyChannelAccess(channelHandle);
  }

  async fetchChannelMessages(channelHandle: string, limit: number = 5) {
    return this.messageService.fetchChannelMessages(channelHandle, limit);
  }

  async replyToMessage(
    channelHandle: string,
    text: string,
    messageId: string,
  ): Promise<{ messageId: string; success: boolean }> {
    return this.messageService.replyToMessage(channelHandle, text, messageId);
  }

  async checkMessagesForAdminReplies(
    channelHandle: string,
    messageIds: string[],
  ): Promise<Map<string, boolean>> {
    return this.messageService.checkMessagesForAdminReplies(
      channelHandle,
      messageIds,
    );
  }
}
