import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Centralized configuration for Telegram service operations.
 * Provides typed access to retry delays, timeouts, polling intervals, and email settings.
 * Follows the pattern from accounts/config/accounts.config.ts
 */
@Injectable()
export class TelegramConfig {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Retry delays for co-admin promotion and message delivery (exponential backoff).
   * Default: [1000, 5000, 15000] ms (1s, 5s, 15s)
   */
  get retryDelays(): number[] {
    const delays = this.configService.get<string>('TELEGRAM_RETRY_DELAYS');
    if (delays) {
      return delays.split(',').map((d) => parseInt(d.trim(), 10));
    }
    return [1000, 5000, 15000];
  }

  /**
   * Maximum number of retry attempts for promotion and message delivery.
   * Default: 3
   */
  get maxRetryAttempts(): number {
    return this.configService.get<number>('TELEGRAM_MAX_RETRY_ATTEMPTS', 3);
  }

  /**
   * Polling interval for detecting new channel members (milliseconds).
   * Default: 15000 ms (15 seconds)
   */
  get pollingInterval(): number {
    return this.configService.get<number>('TELEGRAM_POLLING_INTERVAL', 15000);
  }

  /**
   * Maximum duration for polling new members before timeout (milliseconds).
   * Default: 1800000 ms (30 minutes)
   */
  get pollingMaxDuration(): number {
    return this.configService.get<number>(
      'TELEGRAM_POLLING_MAX_DURATION',
      30 * 60 * 1000,
    );
  }

  /**
   * Management email address for receiving failure alerts.
   * Used when co-admin promotion or message delivery fails after all retries.
   */
  get managementEmail(): string | undefined {
    return this.configService.get<string>('MANAGEMENT_EMAIL');
  }

  /**
   * From email address for sending alerts.
   */
  get fromEmail(): string | undefined {
    return this.configService.get<string>('FROM_EMAIL');
  }

  /**
   * Redis cache TTL for reply checking (seconds).
   * Default: 300 seconds (5 minutes)
   */
  get replyCacheTTL(): number {
    return this.configService.get<number>('TELEGRAM_REPLY_CACHE_TTL', 300);
  }

  /**
   * Maximum number of messages to fetch when checking channel history.
   * Default: 500
   */
  get maxHistoryFetchLimit(): number {
    return this.configService.get<number>(
      'TELEGRAM_MAX_HISTORY_FETCH_LIMIT',
      500,
    );
  }
}
