import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZohoConfig } from '../interfaces/zoho-config.interface';
import { ZohoModulesResponse } from '../interfaces/zoho-response.interface';

@Injectable()
export class ZohoApiService {
  private readonly logger = new Logger(ZohoApiService.name);
  private readonly baseUrl: string;
  private readonly accountsUrl: string;

  constructor(private readonly configService: ConfigService) {
    const environment = this.configService.get<string>(
      'ZOHO_ENVIRONMENT',
      'production',
    );

    // Set accounts URL based on domain (defaulting to US)
    this.accountsUrl = 'https://accounts.zoho.com';

    // Set API base URL based on environment
    if (environment === 'sandbox') {
      this.baseUrl = 'https://sandbox.zohoapis.com/crm/v2';
    } else {
      this.baseUrl = 'https://www.zohoapis.com/crm/v2';
    }
  }

  /**
   * Get Zoho configuration from environment variables
   */
  getZohoConfig(): ZohoConfig {
    const clientId = this.configService.get<string>('ZOHO_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ZOHO_CLIENT_SECRET');
    const refreshToken = this.configService.get<string>('ZOHO_REFRESH_TOKEN');

    if (!clientId || !clientSecret) {
      throw new Error(
        'Zoho client credentials not configured. Please set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET environment variables.',
      );
    }

    return {
      clientId,
      clientSecret,
      redirectUri: this.configService.get<string>('ZOHO_REDIRECT_URI', ''),
      refreshToken: refreshToken || '',
      environment: this.configService.get<'production' | 'sandbox'>(
        'ZOHO_ENVIRONMENT',
        'production',
      ),
    };
  }

  /**
   * Check if Zoho service is properly configured
   */
  isConfigured(): boolean {
    const refreshToken = this.configService.get<string>('ZOHO_REFRESH_TOKEN');
    return !!refreshToken;
  }

  /**
   * Get base API URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get accounts URL for OAuth operations
   */
  getAccountsUrl(): string {
    return this.accountsUrl;
  }

  /**
   * Make authenticated API request
   */
  async makeApiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    accessToken: string,
    body?: any,
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    // Handle empty responses (like 204 No Content)
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      return null as T;
    }

    try {
      return JSON.parse(responseText) as T;
    } catch (parseError) {
      this.logger.error(
        `Failed to parse API response: ${responseText}`,
        parseError,
      );
      throw new Error(`Invalid JSON response from Zoho API: ${responseText}`, {
        cause: parseError,
      });
    }
  }

  /**
   * Test connection to Zoho API
   */
  async testConnection(accessToken: string): Promise<boolean> {
    try {
      await this.makeApiRequest<ZohoModulesResponse>(
        '/settings/modules',
        'GET',
        accessToken,
      );
      return true;
    } catch (error) {
      this.logger.error('Zoho connection test failed', error);
      return false;
    }
  }
}
