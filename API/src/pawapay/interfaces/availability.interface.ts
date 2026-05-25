export type OperationTypeString =
  | 'DEPOSIT'
  | 'PAYOUT'
  | 'REFUND'
  | 'REMITTANCE';

export type AvailabilityStatus = 'OPERATIONAL' | 'DELAYED' | 'CLOSED';

/**
 * Provider availability - actual v2 API format
 * Note: Docs show array format, but actual API returns simple key-value pairs
 * e.g., { DEPOSIT: "OPERATIONAL", PAYOUT: "OPERATIONAL" }
 */
export interface ProviderAvailability {
  provider: string;
  operationTypes: {
    DEPOSIT?: AvailabilityStatus;
    PAYOUT?: AvailabilityStatus;
    REFUND?: AvailabilityStatus;
    REMITTANCE?: AvailabilityStatus;
  };
}

/**
 * Country availability response - actual v2 API format
 */
export interface CountryAvailability {
  country: string;
  providers: ProviderAvailability[];
}
