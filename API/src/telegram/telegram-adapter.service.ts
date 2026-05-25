import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * HTTP client for the Telegram adapter microservice.
 * Replaces direct GramJS TelegramClient calls with HTTP requests
 * to the standalone telegram-service.
 */
@Injectable()
export class TelegramAdapterService {
  private readonly logger = new Logger(TelegramAdapterService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'TELEGRAM_SERVICE_URL',
      'http://telegram-service',
    );
    this.apiKey = this.configService.get<string>('INTERNAL_API_KEY')!;
  }

  // ---------------------------------------------------------------------------
  // Channel operations
  // ---------------------------------------------------------------------------

  async createChannel(
    handle: string,
  ): Promise<{ channelId: string; inviteLink?: string }> {
    return this.post('/channels', { handle });
  }

  async getChannelAccess(
    channelHandle: string,
    channelId?: string,
  ): Promise<{ accessible: boolean; adminCount: number }> {
    const params = new URLSearchParams();
    if (channelId) params.set('channelId', channelId);
    return this.get(
      `/channels/${encodeURIComponent(channelHandle)}/access?${params}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Message operations
  // ---------------------------------------------------------------------------

  async sendMessage(
    channelHandle: string,
    text: string,
    channelId?: string,
  ): Promise<{ messageId: string; success: boolean }> {
    return this.post('/messages', { channelHandle, text, channelId });
  }

  async replyToMessage(
    channelHandle: string,
    text: string,
    replyToMsgId: string,
    channelId?: string,
  ): Promise<{ messageId: string; success: boolean }> {
    return this.post('/messages/reply', {
      channelHandle,
      text,
      replyToMsgId,
      channelId,
    });
  }

  async fetchMessages(
    channelHandle: string,
    limit: number = 15,
    channelId?: string,
  ): Promise<{ messages: any[]; users: any[] }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (channelId) params.set('channelId', channelId);
    return this.get(
      `/channels/${encodeURIComponent(channelHandle)}/messages?${params}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Promotion
  // ---------------------------------------------------------------------------

  async promote(
    channelId: string,
    channelHandle: string,
    userId: string,
  ): Promise<void> {
    await this.post('/promotions', { channelId, channelHandle, userId });
  }

  // ---------------------------------------------------------------------------
  // Invite link operations
  // ---------------------------------------------------------------------------

  async generateInviteLink(
    channelHandle: string,
    usageLimit: number = 1,
    title: string = 'Invite',
    channelId?: string,
  ): Promise<{ inviteLink: string }> {
    const params = new URLSearchParams({
      channelHandle,
      usageLimit: String(usageLimit),
      title,
    });
    if (channelId) params.set('channelId', channelId);
    return this.get(`/invite-links?${params}`);
  }

  async revokeInviteLink(
    channelHandle: string,
    inviteLink: string,
    channelId?: string,
  ): Promise<void> {
    await this.del('/invite-links', { channelHandle, inviteLink, channelId });
  }

  async checkInviteLink(
    hash: string,
  ): Promise<{ valid: boolean; className: string }> {
    return this.post('/invite-links/check', { hash });
  }

  async getExportedInvites(
    channelHandle: string,
    channelId?: string,
  ): Promise<{ invites: Array<{ link: string }> }> {
    const params = new URLSearchParams({ channelHandle });
    if (channelId) params.set('channelId', channelId);
    return this.get(`/invite-links/exported?${params}`);
  }

  // ---------------------------------------------------------------------------
  // Participants
  // ---------------------------------------------------------------------------

  async getParticipants(
    channelHandle: string,
    filter: 'admins' | 'recent' = 'recent',
    limit: number = 10,
    channelId?: string,
  ): Promise<{ participants: any[]; users: any[] }> {
    const params = new URLSearchParams({
      filter,
      limit: String(limit),
    });
    if (channelId) params.set('channelId', channelId);
    return this.get(
      `/channels/${encodeURIComponent(channelHandle)}/participants?${params}`,
    );
  }

  // ---------------------------------------------------------------------------
  // HTTP helpers
  // ---------------------------------------------------------------------------

  private async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`GET ${path} failed (${response.status}): ${body}`);
      throw new Error(`Telegram adapter error: ${body}`);
    }

    return response.json() as Promise<T>;
  }

  private async post<T>(path: string, body: Record<string, any>): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`POST ${path} failed (${response.status}): ${text}`);
      throw new Error(`Telegram adapter error: ${text}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  private async del<T>(path: string, body: Record<string, any>): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`DELETE ${path} failed (${response.status}): ${text}`);
      throw new Error(`Telegram adapter error: ${text}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }
}
