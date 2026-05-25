export interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
  environment: 'production' | 'sandbox';
}

export interface ZohoTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface ZohoApiResponse<T = any> {
  data: T[];
  info: {
    count: number;
    more_records: boolean;
  };
}
