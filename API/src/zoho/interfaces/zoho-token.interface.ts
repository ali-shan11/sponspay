export interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  api_domain?: string;
  error?: string;
  error_description?: string;
}

export interface ZohoTokenStatus {
  hasToken: boolean;
  expiresAt: number;
  timeUntilExpiry: number;
}
