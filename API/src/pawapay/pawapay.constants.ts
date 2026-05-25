export const PAWAPAY_SIGNATURE_HEADER = 'signature';
export const PAWAPAY_SIGNATURE_INPUT_HEADER = 'signature-input';
export const PAWAPAY_SIGNATURE_DATE_HEADER = 'signature-date';
export const PAWAPAY_CONTENT_DIGEST_HEADER = 'content-digest';
export const PAWAPAY_USER_AGENT = 'SponsPay/1.0 (+https://sponspay.com)';

// Only ecdsa-p256-sha256 is used in production (verified via test analysis)
// If PawaPay uses other algorithms, verification will fail with clear error message
export const PAWAPAY_SUPPORTED_ALGORITHMS = ['ecdsa-p256-sha256'] as const;

export type PawapaySignatureAlgorithm =
  (typeof PAWAPAY_SUPPORTED_ALGORITHMS)[number];

// PawaPay response status values
export const PAWAPAY_STATUS_ACCEPTED = 'ACCEPTED' as const;
export const PAWAPAY_STATUS_REJECTED = 'REJECTED' as const;
export const PAWAPAY_STATUS_DUPLICATE_IGNORED = 'DUPLICATE_IGNORED' as const;

export type PawapayResponseStatus =
  | typeof PAWAPAY_STATUS_ACCEPTED
  | typeof PAWAPAY_STATUS_REJECTED
  | typeof PAWAPAY_STATUS_DUPLICATE_IGNORED;

// PawaPay callback status values (received in webhooks)
export const PAWAPAY_CALLBACK_STATUS_COMPLETED = 'COMPLETED' as const;
export const PAWAPAY_CALLBACK_STATUS_PROCESSING = 'PROCESSING' as const;
export const PAWAPAY_CALLBACK_STATUS_FAILED = 'FAILED' as const;

export type PawapayCallbackStatus =
  | typeof PAWAPAY_CALLBACK_STATUS_COMPLETED
  | typeof PAWAPAY_CALLBACK_STATUS_PROCESSING
  | typeof PAWAPAY_CALLBACK_STATUS_FAILED;

// Map PawaPay callback statuses to internal transaction status codes
export const PAWAPAY_STATUS_MAP: Record<PawapayCallbackStatus, string> = {
  COMPLETED: 'succeeded',
  PROCESSING: 'processing',
  FAILED: 'failed',
} as const;
