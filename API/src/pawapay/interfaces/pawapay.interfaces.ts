/**
 * Account details for mobile money transactions (v2 API)
 * @see https://docs.pawapay.io/v2/api-reference
 */
export interface PawapayAccountDetails {
  /** Phone number in international format without + (e.g., 260971234567) */
  phoneNumber: string;
  /** Payment provider code (e.g., MTN_MOMO_ZMB) */
  provider: string;
}

/**
 * Payer details for deposit transactions (v2 API)
 */
export interface PawapayPayer {
  /** Mobile Money Operator type */
  type: 'MMO';
  /** Account details for the payer */
  accountDetails: PawapayAccountDetails;
}

/**
 * Recipient details for payout transactions (v2 API)
 */
export interface PawapayRecipient {
  /** Mobile Money Operator type */
  type: 'MMO';
  /** Account details for the recipient */
  accountDetails: PawapayAccountDetails;
}

/**
 * PawaPay metadata is a flexible key-value structure
 * Use Record<string, any> to allow any custom keys
 * @example { "orderId": "ORD-123", "isPII": false }
 * @example { "transactionId": "uuid-here", "isPII": false }
 */
export type PawapayMetadata = Record<string, unknown>;

/**
 * PawaPay v2 Deposit Request
 * @see https://docs.pawapay.io/v2/api-reference/deposits/initiate-deposit
 */
export interface PawapayDepositRequest {
  /** UUID v4 that uniquely identifies the deposit */
  depositId: string;
  /** Payer mobile money account details */
  payer: PawapayPayer;
  /** Amount to collect as decimal string (0-2 decimals) */
  amount: string;
  /** ISO 4217 currency code (e.g., ZMW, KES, GHS) */
  currency: string;
  /** Optional pre-authorization code if required by provider */
  preAuthorisationCode?: string;
  /** Optional client reference ID for reconciliation (maps to transaction.id) */
  clientReferenceId?: string;
  /** Optional message shown to customer (4-22 alphanumeric chars + spaces) */
  customerMessage?: string;
  /** Optional metadata array (max 10 items) */
  metadata?: PawapayMetadata[];
}

/**
 * PawaPay v2 Payout Request
 * @see https://docs.pawapay.io/v2/api-reference/payouts/initiate-payout
 */
export interface PawapayPayoutRequest {
  /** UUID v4 that uniquely identifies the payout */
  payoutId: string;
  /** Recipient mobile money account details */
  recipient: PawapayRecipient;
  /** Amount to disburse as decimal string (0-2 decimals) */
  amount: string;
  /** ISO 4217 currency code */
  currency: string;
  /** Optional client reference ID for reconciliation (maps to payout.id) */
  clientReferenceId?: string;
  /** Optional message shown to customer (4-22 alphanumeric chars + spaces) */
  customerMessage?: string;
  /** Optional metadata array (max 10 items) */
  metadata?: PawapayMetadata[];
}

/**
 * PawaPay v2 Refund Request
 * @see https://docs.pawapay.io/v2/api-reference/refunds/initiate-refund
 */
export interface PawapayRefundRequest {
  /** UUID v4 that uniquely identifies the refund */
  refundId: string;
  /** The depositId of the deposit to be refunded */
  depositId: string;
  /** Refund amount as decimal string (0-2 decimals, REQUIRED in v2) */
  amount: string;
  /** ISO 4217 currency code (REQUIRED in v2) */
  currency: string;
  /** Optional client reference ID for reconciliation (maps to transaction.id) */
  clientReferenceId?: string;
  /** Optional metadata array */
  metadata?: PawapayMetadata[];
}

export interface PawapayApiResponse<T = Record<string, unknown>> {
  /** Provider level status for the request (e.g. `pending`, `accepted`). */
  status?: string;
  /** Canonical response payload returned by the provider. */
  data: T;
  [key: string]: unknown;
}

// Deposit callback (v2 API structure)
// @see https://docs.pawapay.io/v2/api-reference/deposits/deposit-callback
export interface PawapayDepositCallback {
  depositId: string;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  amount: string; // Decimal string (unified amount field in v2)
  currency: string; // ISO 4217
  country: string; // ISO 3166-1 alpha-3
  payer: {
    type: 'MMO'; // Mobile Money Operator
    accountDetails: {
      phoneNumber: string;
      provider: string; // e.g., "MTN_MOMO_ZMB"
    };
  };
  created: string; // RFC3339 timestamp
  customerMessage?: string; // 4-22 chars
  providerTransactionId?: string; // Provider's transaction ID
  failureReason?: {
    failureCode: string;
    failureMessage?: string;
  };
  metadata?: Record<string, unknown>;
}

// Payout callback (from official PawaPay v2 API docs)
export interface PawapayPayoutCallback {
  payoutId: string;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  amount: string; // Single amount field (not split like deposits)
  currency: string; // ISO 4217
  country: string; // ISO 3166-1 alpha-3
  recipient: {
    type: 'MMO'; // Mobile Money Operator
    accountDetails: {
      phoneNumber: string;
      provider: string; // e.g., "MTN_MOMO_ZMB"
    };
  };
  created: string; // RFC3339 timestamp
  customerMessage?: string; // 4-22 chars
  providerTransactionId?: string; // Provider's transaction ID
  failureReason?: {
    failureCode:
      | 'PAWAPAY_WALLET_OUT_OF_FUNDS'
      | 'RECIPIENT_NOT_FOUND'
      | 'WALLET_LIMIT_REACHED'
      | 'MANUALLY_CANCELLED'
      | 'UNSPECIFIED_FAILURE'
      | 'UNKNOWN_ERROR';
    failureMessage?: string;
  };
  metadata?: Record<string, unknown>;
}

// Refund callback (from official PawaPay v2 API docs)
// Note: Refund callbacks do NOT include depositId - you must track refundId when initiating
export interface PawapayRefundCallback {
  refundId: string;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  amount: string; // Refund amount
  currency: string; // ISO 4217
  country: string; // ISO 3166-1 alpha-3
  recipient: {
    type: string; // e.g., "MMO"
    accountDetails: {
      phoneNumber: string;
      provider: string; // e.g., "MTN_MOMO_ZMB"
    };
  };
  created: string; // RFC3339 timestamp
  customerMessage?: string; // 4-22 chars
  providerTransactionId?: string; // Provider's transaction ID (flat field like payout)
  failureReason?: {
    failureCode: string;
    failureMessage?: string;
  };
  metadata?: Record<string, unknown>;
}

// Discriminated union of all callback types
export type PawapayCallback =
  | PawapayDepositCallback
  | PawapayPayoutCallback
  | PawapayRefundCallback;

// Type guards for runtime discrimination
export function isDepositCallback(
  callback: PawapayCallback,
): callback is PawapayDepositCallback {
  return 'depositId' in callback && !('refundId' in callback);
}

export function isPayoutCallback(
  callback: PawapayCallback,
): callback is PawapayPayoutCallback {
  return 'payoutId' in callback;
}

export function isRefundCallback(
  callback: PawapayCallback,
): callback is PawapayRefundCallback {
  return 'refundId' in callback;
}

export interface PawapayRequestOptions {
  /** Custom headers to merge with the defaults. */
  headers?: Record<string, string>;
}
