export interface Provider {
  name: string;
  country: string;
  countryCode: string;
  currency: string;
  supportsDecimals: boolean;
  minDepositLimit: number;
  maxDepositLimit: number;
}

export interface ActiveConfigurationOperation {
  minAmount: string; // v2 uses minAmount instead of minTransactionLimit
  maxAmount: string; // v2 uses maxAmount instead of maxTransactionLimit
  authType?: string; // v2 field (e.g., "PROVIDER_AUTH")
  pinPrompt?: string; // v2 field (e.g., "AUTOMATIC")
  pinPromptRevivable?: boolean; // v2 field
  decimalsInAmount?: string; // v2 field (e.g., "NONE", or number as string)
  status?: string; // v2 field for operational status (e.g., "OPERATIONAL", "CLOSED")
  callbackUrl?: string; // v2 field
}

export interface ActiveConfigurationCurrency {
  currency: string; // Currency code (e.g., "XOF", "UGX")
  displayName?: string; // v2 field
  operationTypes: {
    // v2: operationTypes is an object/map, not an array
    DEPOSIT?: ActiveConfigurationOperation;
    PAYOUT?: ActiveConfigurationOperation;
    PUSH_DEPOSIT?: ActiveConfigurationOperation;
    REFUND?: ActiveConfigurationOperation;
    REMITTANCE?: ActiveConfigurationOperation;
    NAME_LOOKUP?: ActiveConfigurationOperation;
    USSD_DEPOSIT?: ActiveConfigurationOperation;
  };
}

export interface ActiveConfigurationProvider {
  provider: string; // v2 field name for provider/correspondent identifier
  displayName?: string; // v2 field
  logo?: string; // v2 field (URL)
  nameDisplayedToCustomer?: string; // v2 field
  currencies: ActiveConfigurationCurrency[]; // v2: currencies is an array
}

export interface ActiveConfigurationCountry {
  country: string; // ISO 3166-1 alpha-3 code (e.g., "UGA", "KEN")
  displayName?: { en?: string; fr?: string }; // v2 field
  prefix?: string; // v2 field (phone prefix)
  flag?: string; // v2 field (URL)
  providers: ActiveConfigurationProvider[]; // v2 uses 'providers' array
}

export interface ActiveConfigurationResponse {
  companyName: string; // v2 changed from merchantName
  signatureConfiguration?: object; // v2 field for signature settings
  countries: ActiveConfigurationCountry[];
}
