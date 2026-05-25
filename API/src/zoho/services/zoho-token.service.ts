import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ZohoApiService } from './zoho-api.service';
import {
  ZohoTokenResponse,
  ZohoTokenStatus,
} from '../interfaces/zoho-token.interface';

@Injectable()
export class ZohoTokenService implements OnModuleInit {
  private readonly logger = new Logger(ZohoTokenService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly zohoApiService: ZohoApiService) {}

  async onModuleInit() {
    try {
      // Only initialize if we have a refresh token
      if (this.zohoApiService.isConfigured()) {
        await this.refreshAccessToken();
        this.logger.log('Zoho token service initialized successfully');
      } else {
        this.logger.warn(
          'Zoho token service not initialized - ZOHO_REFRESH_TOKEN not found. Run setup scripts to configure.',
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialize Zoho token service', error);
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(): Promise<void> {
    try {
      const config = this.zohoApiService.getZohoConfig();

      if (!config.refreshToken) {
        throw new Error(
          'Refresh token not configured. Please run the setup scripts to obtain a refresh token.',
        );
      }

      const response = await fetch(
        `${this.zohoApiService.getAccountsUrl()}/oauth/v2/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: config.refreshToken,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Token refresh HTTP error: ${response.status} - ${errorText}`,
        );
      }

      const tokenData: ZohoTokenResponse = await response.json();

      // Check if the response contains an error
      if (tokenData.error) {
        throw new Error(
          `Token refresh failed: ${tokenData.error} - ${tokenData.error_description || 'No description provided'}`,
        );
      }

      // Validate that we have the required fields
      if (!tokenData.access_token || !tokenData.expires_in) {
        throw new Error(
          `Invalid token response: missing access_token or expires_in`,
        );
      }

      this.accessToken = tokenData.access_token;
      this.tokenExpiresAt = Date.now() + tokenData.expires_in * 1000 - 60000; // Refresh 1 minute early

      this.logger.log('Access token refreshed successfully');
    } catch (error) {
      this.logger.error('Failed to refresh access token', error);
      throw error;
    }
  }

  /**
   * Ensure we have a valid access token
   */
  async ensureValidToken(): Promise<string> {
    // Check if we need to refresh the token
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken();
    }

    if (!this.accessToken) {
      throw new Error('Failed to obtain valid access token');
    }

    return this.accessToken;
  }

  /**
   * Get current token status for debugging
   */
  getTokenStatus(): ZohoTokenStatus {
    return {
      hasToken: !!this.accessToken,
      expiresAt: this.tokenExpiresAt,
      timeUntilExpiry: this.tokenExpiresAt - Date.now(),
    };
  }

  /**
   * Force refresh the access token (useful for testing)
   */
  async forceTokenRefresh(): Promise<void> {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    await this.refreshAccessToken();
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.zohoApiService.isConfigured();
  }
}
