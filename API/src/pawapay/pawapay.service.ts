import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { lastValueFrom } from 'rxjs';
import { createHash, createVerify } from 'crypto';
import { AxiosError, AxiosResponse, isAxiosError } from 'axios';
import { normalizeCountryCode } from './utils/pawapay.utils';
import {
  PAWAPAY_SIGNATURE_HEADER,
  PAWAPAY_SIGNATURE_INPUT_HEADER,
  PAWAPAY_SIGNATURE_DATE_HEADER,
  PAWAPAY_CONTENT_DIGEST_HEADER,
  PAWAPAY_USER_AGENT,
  PAWAPAY_SUPPORTED_ALGORITHMS,
  PawapaySignatureAlgorithm,
  PAWAPAY_STATUS_ACCEPTED,
  PAWAPAY_STATUS_REJECTED,
  PAWAPAY_STATUS_DUPLICATE_IGNORED,
} from './pawapay.constants';
import {
  PawapayApiResponse,
  PawapayCallback,
  PawapayDepositRequest,
  PawapayPayoutRequest,
  PawapayRefundRequest,
  PawapayRequestOptions,
  isDepositCallback,
  isPayoutCallback,
  isRefundCallback,
} from './interfaces/pawapay.interfaces';
import {
  mapAxiosErrorToPawapayException,
  PawapaySignatureException,
  PawapayRejectionException,
  PawapayDuplicateException,
  PawapayTransientException,
  PawapayValidationException,
  PawapayRequestException,
} from './pawapay.exceptions';
import { ActiveConfigurationResponse } from './interfaces/provider.interface';
import { CountryAvailability } from './interfaces/availability.interface';

@Injectable()
export class PawapayService implements OnModuleInit {
  private readonly logger = new Logger(PawapayService.name);
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly callbackAuthority: string;
  private readonly skipSignatureVerification: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.baseUrl = this.normalizeBaseUrl(
      this.configService.get<string>('PAWAPAY_BASE_URL') ?? '',
    );
    this.apiToken = this.configService.get<string>('PAWAPAY_API_TOKEN') ?? '';
    this.callbackAuthority =
      this.configService.get<string>('PAWAPAY_CALLBACK_AUTHORITY') ??
      'localhost';
    this.skipSignatureVerification =
      this.configService.get<string>('PAWAPAY_SKIP_SIGNATURE_VERIFICATION') ===
      'true';

    // Warn if verification disabled
    if (this.skipSignatureVerification) {
      const nodeEnv = this.configService.get<string>('NODE_ENV');
      if (nodeEnv === 'production') {
        this.logger.error(
          '🚨 CRITICAL: PawaPay signature verification DISABLED in PRODUCTION! ' +
            'Set PAWAPAY_SKIP_SIGNATURE_VERIFICATION=false immediately.',
        );
      } else {
        this.logger.warn(
          '⚠️  PawaPay signature verification disabled (dev mode). ' +
            'Callbacks NOT validated for authenticity.',
        );
      }
    }

    if (!this.baseUrl || !this.apiToken) {
      this.logger.warn(
        'PawaPay credentials are not fully configured. Calls will fail until configuration is provided.',
      );
    }
  }

  /**
   * Pre-warm the public key cache on service initialization
   */
  async onModuleInit() {
    this.prewarmPublicKeyCache().catch((error) => {
      this.logger.warn('Failed to pre-warm public key cache', error as Error);
    });
  }

  /**
   * Fetch all public keys from PawaPay API
   * Returns array of {id, key} objects from v2 API
   */
  private async fetchPublicKeys(): Promise<Array<{ id: string; key: string }>> {
    const publicKeysUrl = `${this.baseUrl}/public-key/http`;

    const response = await lastValueFrom(
      this.httpService.get(publicKeysUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': PAWAPAY_USER_AGENT,
        },
      }),
    );

    const publicKeys = response.data;

    // PawaPay v2 API returns array format: [{id: string, key: string}]
    if (Array.isArray(publicKeys)) {
      return publicKeys.filter((entry) => entry.id && entry.key);
    }

    // Fallback: handle legacy object format {keyid: publicKey} if it exists
    if (publicKeys && typeof publicKeys === 'object') {
      return Object.entries(publicKeys).map(([id, key]) => ({
        id,
        key: key as string,
      }));
    }

    return [];
  }

  private async prewarmPublicKeyCache(): Promise<void> {
    try {
      this.logger.log('Pre-warming PawaPay public key cache...');

      const publicKeys = await this.fetchPublicKeys();
      const cacheTtl = 3600;

      for (const keyEntry of publicKeys) {
        await this.redisService
          .getPubClient()
          .setex(`pawapay:public-key:${keyEntry.id}`, cacheTtl, keyEntry.key);
      }

      this.logger.log(`Pre-warmed ${publicKeys.length} public keys in Redis`);
    } catch (error) {
      this.logger.error('Error pre-warming public key cache', error as Error);
      throw error;
    }
  }

  /**
   * Fetch active configuration from PawaPay API
   * Returns list of available payment providers
   */
  async fetchActiveConfiguration(): Promise<ActiveConfigurationResponse> {
    return this.get<ActiveConfigurationResponse>('active-conf');
  }

  /**
   * Fetch availability status for all providers
   * @param country - Optional ISO 3166-1 alpha-3 country code filter (e.g., 'ZMB')
   * @param operationType - Optional operation type filter
   * @returns Operational status for each provider's deposit/payout/refund/remittance operations
   */
  async fetchAvailability(
    country?: string,
    operationType?: 'DEPOSIT' | 'PAYOUT' | 'REFUND' | 'REMITTANCE',
  ): Promise<CountryAvailability[]> {
    const params = new URLSearchParams();
    if (country) params.append('country', country);
    if (operationType) params.append('operationType', operationType);

    const path = params.toString()
      ? `availability?${params.toString()}`
      : 'availability';

    return this.get<CountryAvailability[]>(path);
  }

  /**
   * Predict the mobile money provider for a phone number.
   * @param phoneNumber - Phone number with country code (PawaPay sanitizes +, whitespace, non-numeric)
   * @returns Predicted country (ISO 3166-1 alpha-3), provider, and formatted phone number
   */
  async predictProvider(
    phoneNumber: string,
  ): Promise<{ country: string; provider: string; phoneNumber: string }> {
    return this.post<{
      country: string;
      provider: string;
      phoneNumber: string;
    }>('predict-provider', { phoneNumber });
  }

  // Direct API methods (using PawaPay API format)
  async createDeposit<T = PawapayApiResponse>(
    payload: PawapayDepositRequest,
    options?: PawapayRequestOptions,
  ): Promise<T> {
    // Log request details (before retry loop)
    this.logger.log(
      `Creating deposit: depositId=${payload.depositId}, amount=${payload.amount} ${payload.currency}, provider=${payload.payer.accountDetails.provider}, phone=${payload.payer.accountDetails.phoneNumber}, clientReferenceId=${payload.clientReferenceId ?? 'none'}`,
    );
    this.logger.debug(`Deposit request payload: ${JSON.stringify(payload)}`);

    // Execute with retry logic
    const response = await this.executeWithRetry(async () => {
      // Make API call
      const rawResponse = await this.post<T>('deposits', payload, options);

      // Validate response (check for REJECTED/DUPLICATE_IGNORED)
      return this.validatePawapayResponse(
        rawResponse,
        'deposit',
        payload.depositId,
      );
    }, `createDeposit(${payload.depositId})`);

    // Log success
    this.logger.log(
      `Deposit created successfully: depositId=${payload.depositId}`,
    );

    return response;
  }

  async createPayout<T = PawapayApiResponse>(
    payload: PawapayPayoutRequest,
    options?: PawapayRequestOptions,
  ): Promise<T> {
    // Log request details (before retry loop)
    this.logger.log(
      `Creating payout: payoutId=${payload.payoutId}, amount=${payload.amount} ${payload.currency}, provider=${payload.recipient.accountDetails.provider}, phone=${payload.recipient.accountDetails.phoneNumber}, clientReferenceId=${payload.clientReferenceId ?? 'none'}`,
    );
    this.logger.debug(`Payout request payload: ${JSON.stringify(payload)}`);

    // Execute with retry logic
    const response = await this.executeWithRetry(async () => {
      // Make API call
      const rawResponse = await this.post<T>('payouts', payload, options);

      // Validate response (check for REJECTED/DUPLICATE_IGNORED)
      return this.validatePawapayResponse(
        rawResponse,
        'payout',
        payload.payoutId,
      );
    }, `createPayout(${payload.payoutId})`);

    // Log success
    this.logger.log(
      `Payout created successfully: payoutId=${payload.payoutId}`,
    );

    return response;
  }

  async createRefund<T = PawapayApiResponse>(
    payload: PawapayRefundRequest,
    options?: PawapayRequestOptions,
  ): Promise<T> {
    // Log request details (before retry loop)
    this.logger.log(
      `Creating refund: refundId=${payload.refundId}, depositId=${payload.depositId}, amount=${payload.amount} ${payload.currency}, clientReferenceId=${payload.clientReferenceId ?? 'none'}`,
    );
    this.logger.debug(`Refund request payload: ${JSON.stringify(payload)}`);

    // Execute with retry logic
    const response = await this.executeWithRetry(async () => {
      // Make API call
      const rawResponse = await this.post<T>('refunds', payload, options);

      // Validate response (check for REJECTED/DUPLICATE_IGNORED)
      return this.validatePawapayResponse(
        rawResponse,
        'refund',
        payload.refundId,
      );
    }, `createRefund(${payload.refundId})`);

    // Log success
    this.logger.log(
      `Refund created successfully: refundId=${payload.refundId}`,
    );

    return response;
  }

  async listProvidersAvailability(countryCode: string): Promise<
    Array<{
      id: string;
      name: string;
      availability: Record<string, unknown> | null;
    }>
  > {
    // Fetch active configuration from PawaPay API
    const config = await this.fetchActiveConfiguration();

    const normalizedCode = normalizeCountryCode(countryCode);

    // Find the matching country and extract providers
    const matchingCountry = config.countries.find(
      (c) => c.country === normalizedCode,
    );

    if (!matchingCountry || !matchingCountry.providers) {
      return [];
    }

    const providers = matchingCountry.providers;
    const providerNames = providers.map((p) => p.provider);
    const availabilityPayload: unknown = await this.post(
      'toolkit/availability',
      {
        providers: providerNames,
      },
    );

    const availabilityMap = this.extractAvailabilityMap(availabilityPayload);

    return providers.map((provider) => ({
      id: provider.provider,
      name: provider.provider.replace(/_/g, ' '),
      availability: availabilityMap.get(provider.provider) ?? null,
    }));
  }

  async handleCallback<T = PawapayCallback>(
    payload: PawapayCallback,
    headers: Record<string, string>,
    rawBody: string,
  ): Promise<T> {
    await this.assertValidSignature(headers, rawBody);

    // Extract the correct ID using type guards
    let referenceId: string;
    if (isDepositCallback(payload)) {
      referenceId = payload.depositId;
    } else if (isPayoutCallback(payload)) {
      referenceId = payload.payoutId;
    } else if (isRefundCallback(payload)) {
      referenceId = payload.refundId;
    } else {
      referenceId = 'unknown';
    }

    this.logger.debug(
      `Received PawaPay callback for ${referenceId} with status ${payload.status}`,
    );
    return payload as unknown as T;
  }

  /**
   * Verifies PawaPay callback signature using RFC-9421 HTTP Message Signatures
   */
  async verifyCallbackSignature(
    headers: Record<string, string>,
    method: string,
    path: string,
    rawBody: string,
  ): Promise<boolean> {
    try {
      // Extract required headers (case-insensitive)
      const signature = this.getHeaderValue(headers, PAWAPAY_SIGNATURE_HEADER);
      const signatureInput = this.getHeaderValue(
        headers,
        PAWAPAY_SIGNATURE_INPUT_HEADER,
      );
      const signatureDate = this.getHeaderValue(
        headers,
        PAWAPAY_SIGNATURE_DATE_HEADER,
      );
      const contentDigest = this.getHeaderValue(
        headers,
        PAWAPAY_CONTENT_DIGEST_HEADER,
      );
      const contentType = this.getHeaderValue(headers, 'content-type');

      if (
        !signature ||
        !signatureInput ||
        !signatureDate ||
        !contentDigest ||
        !contentType
      ) {
        this.logger.warn(
          'Missing required signature headers for PawaPay callback verification',
        );
        return false;
      }

      // Verify content digest first
      if (!this.verifyContentDigest(contentDigest, rawBody)) {
        this.logger.warn('Content digest verification failed');
        return false;
      }

      // Parse signature input to extract parameters
      const signatureParams = this.parseSignatureInput(signatureInput);
      if (!signatureParams) {
        this.logger.warn('Failed to parse signature input');
        return false;
      }

      // Validate signature expiry to prevent replay attacks
      if (
        !this.validateSignatureExpiry(
          signatureParams.created,
          signatureParams.expires,
        )
      ) {
        this.logger.warn('Signature expiry validation failed');
        return false;
      }

      // Create signature base according to RFC-9421
      const signatureBase = this.createSignatureBase(
        signatureParams,
        method,
        path,
        {
          'signature-date': signatureDate,
          'content-digest': contentDigest,
          'content-type': contentType,
        },
      );

      this.logger.debug(
        `Signature base created (${signatureBase.length} bytes):\n${signatureBase}`,
      );

      // Get PawaPay's public key from cache (or API if cache miss)
      const publicKey = await this.getPawapayPublicKeyCached(
        signatureParams.keyid,
      );
      if (!publicKey) {
        this.logger.warn(
          `Failed to retrieve public key for keyid: ${signatureParams.keyid}`,
        );
        return false;
      }

      this.logger.debug(
        `Using public key for ${signatureParams.keyid}: ${publicKey.substring(0, 50)}...`,
      );

      // Verify the signature
      const isValid = this.verifySignatureWithPublicKey(
        signatureBase,
        signature,
        publicKey,
        signatureParams.alg,
      );

      this.logger.debug(
        `Signature verification result: ${isValid ? 'VALID ✓' : 'INVALID ✗'}`,
      );

      return isValid;
    } catch (error) {
      this.logger.error(
        'Error verifying PawaPay callback signature',
        error as Error,
      );
      return false;
    }
  }

  private async assertValidSignature(
    headers: Record<string, string>,
    rawBody: string,
  ): Promise<void> {
    // Allow skipping signature verification in development (e.g., when using ngrok)
    if (this.skipSignatureVerification) {
      this.logger.warn(
        'SECURITY WARNING: PawaPay signature verification is disabled. ' +
          'This should NEVER be used in production!',
      );
      return;
    }

    // Perform full RFC-9421 signature verification
    const isValid = await this.verifyCallbackSignature(
      headers,
      'POST',
      '/pawapay/callback',
      rawBody,
    );
    if (!isValid) {
      this.logger.error('PawaPay callback signature verification failed');
      throw new PawapaySignatureException();
    }

    this.logger.debug('PawaPay callback signature verification successful');
  }

  private async get<T>(
    path: string,
    options?: PawapayRequestOptions,
  ): Promise<T> {
    const url = this.buildUrl(path);
    const headers = this.buildHeaders(options?.headers);

    try {
      const response = await lastValueFrom(
        this.httpService.get<T>(url, {
          headers,
        }),
      );
      return this.unwrapResponse(response);
    } catch (error) {
      throw mapAxiosErrorToPawapayException(`GET ${path}`, error);
    }
  }

  private async post<T>(
    path: string,
    payload: unknown,
    options?: PawapayRequestOptions,
  ): Promise<T> {
    const url = this.buildUrl(path);
    const headers = this.buildHeaders(options?.headers);

    try {
      const response = await lastValueFrom(
        this.httpService.post<T>(url, payload, {
          headers,
          timeout: 30000, // 30s timeout
        }),
      );
      return this.unwrapResponse(response);
    } catch (error) {
      // Enhanced error mapping to distinguish retryable from non-retryable errors
      if (isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Network errors (no response) - retryable
        if (!axiosError.response) {
          throw new PawapayTransientException(
            axiosError.message ?? 'Network error',
            axiosError,
          );
        }

        // 5xx server errors - retryable
        const status = axiosError.response.status;
        if (status >= 500) {
          throw new PawapayTransientException(
            `Server error: ${status}`,
            axiosError,
          );
        }

        // 4xx client errors - not retryable
        const details = axiosError.response.data ?? axiosError.message;
        throw new PawapayRequestException(
          `POST ${path}`,
          status,
          details,
          error,
        );
      }

      // Non-Axios errors
      throw mapAxiosErrorToPawapayException(`POST ${path}`, error);
    }
  }

  private unwrapResponse<T>(response: AxiosResponse<T>): T {
    if (response?.data) {
      return response.data;
    }
    return response as unknown as T;
  }

  /**
   * Validates PawaPay API response and throws appropriate exceptions
   * PawaPay returns HTTP 200 even for rejections, so we must parse the response body
   */
  private validatePawapayResponse<T>(
    response: T,
    operation: 'deposit' | 'payout' | 'refund',
    reference: string,
  ): T {
    // Response might be: { status: "ACCEPTED", ... } or { status: "REJECTED", rejectionReason: {...} }
    const responseBody = response as any;

    if (!responseBody || typeof responseBody !== 'object') {
      return response; // Pass through if not an object
    }

    const status = responseBody.status as string | undefined;

    if (status === PAWAPAY_STATUS_REJECTED) {
      this.logger.warn(
        `PawaPay ${operation} rejected for reference ${reference}: ${JSON.stringify(responseBody.failureReason)}`,
      );
      throw new PawapayRejectionException(
        operation,
        responseBody.failureReason ?? 'No reason provided',
        reference,
      );
    }

    if (status === PAWAPAY_STATUS_DUPLICATE_IGNORED) {
      this.logger.warn(
        `PawaPay ${operation} ignored as duplicate for reference ${reference}`,
      );
      throw new PawapayDuplicateException(operation, reference);
    }

    // ACCEPTED or no status field (older API versions) - pass through
    if (status === PAWAPAY_STATUS_ACCEPTED || !status) {
      this.logger.debug(
        `PawaPay ${operation} accepted for reference ${reference}`,
      );
    }

    return response;
  }

  /**
   * Executes an async operation with retry logic for transient failures
   * Retries up to 3 times with exponential backoff: 1s, 5s, 15s
   * Only retries network errors, not business rejections
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    const maxAttempts = 3;
    const delays = [1000, 5000, 15000]; // 1s, 5s, 15s (matches Telegram pattern)

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(`${context}: attempt ${attempt}/${maxAttempts}`);
        return await operation();
      } catch (error) {
        // Don't retry business errors (validation, rejection, duplicate)
        if (
          error instanceof PawapayValidationException ||
          error instanceof PawapayRejectionException ||
          error instanceof PawapayDuplicateException
        ) {
          throw error; // Business errors are not retryable
        }

        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          this.logger.error(
            `${context}: all ${maxAttempts} attempts failed`,
            error instanceof Error ? error.stack : String(error),
          );
          throw error;
        }

        // Retry transient errors (network issues, timeouts, 5xx)
        const isRetryable =
          error instanceof PawapayTransientException ||
          (error instanceof PawapayRequestException &&
            error.getStatus() >= 500);

        if (!isRetryable) {
          throw error; // 4xx errors are not retryable
        }

        const delay = delays[attempt - 1];
        this.logger.warn(
          `${context}: attempt ${attempt} failed, retrying in ${delay}ms...`,
          error instanceof Error ? error.message : String(error),
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error(`${context}: max attempts reached (should not happen)`);
  }

  private extractAvailabilityMap(
    payload: unknown,
  ): Map<string, Record<string, unknown> | null> {
    const map = new Map<string, Record<string, unknown> | null>();

    const register = (key: unknown, value: unknown) => {
      if (typeof key === 'string') {
        const availability =
          value === null
            ? null
            : typeof value === 'object'
              ? (value as Record<string, unknown>)
              : { value };
        map.set(key, availability);
      }
    };

    const handleEntry = (entry: unknown) => {
      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        const providerKey =
          record.provider ?? record.name ?? record.code ?? record.id;
        const availability =
          (record.availability as Record<string, unknown>) ?? record;
        register(providerKey, availability);
      }
    };

    if (!payload) {
      return map;
    }

    if (Array.isArray(payload)) {
      payload.forEach(handleEntry);
      return map;
    }

    if (typeof payload === 'object') {
      const body = payload as Record<string, unknown>;
      const candidates = [body.providers, body.availability, body.data];

      for (const candidate of candidates) {
        if (!candidate) {
          continue;
        }

        if (Array.isArray(candidate)) {
          candidate.forEach(handleEntry);
          return map;
        }

        if (candidate && typeof candidate === 'object') {
          for (const [key, value] of Object.entries(
            candidate as Record<string, unknown>,
          )) {
            register(key, value);
          }
          return map;
        }
      }
    }

    return map;
  }

  private buildHeaders(
    additional?: Record<string, string>,
  ): Record<string, string> {
    const baseHeaders: Record<string, string> = {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': PAWAPAY_USER_AGENT,
    };

    return {
      ...baseHeaders,
      ...(additional ?? {}),
    };
  }

  private buildUrl(path: string): string {
    const sanitizedPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.baseUrl}/${sanitizedPath}`;
  }

  private normalizeBaseUrl(url: string): string {
    if (!url) {
      return '';
    }
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  /**
   * Get header value in a case-insensitive manner
   */
  private getHeaderValue(
    headers: Record<string, string>,
    headerName: string,
  ): string | undefined {
    const lowerHeaderName = headerName.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === lowerHeaderName) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Verify content digest according to RFC-9421
   */
  private verifyContentDigest(contentDigest: string, rawBody: string): boolean {
    try {
      // Parse content digest header: "sha-512=:base64hash:"
      const match = contentDigest.match(/^(sha-256|sha-512)=:([^:]+):$/);
      if (!match) {
        this.logger.warn('Invalid content digest format');
        return false;
      }

      const [, algorithm, expectedHash] = match;
      const hashAlgorithm = algorithm === 'sha-256' ? 'sha256' : 'sha512';

      const computedHash = createHash(hashAlgorithm)
        .update(rawBody, 'utf8')
        .digest('base64');

      const matches = computedHash === expectedHash;
      this.logger.debug(
        `Content digest ${matches ? 'MATCH' : 'MISMATCH'}: ` +
          `algorithm=${algorithm}, bodyLength=${rawBody.length}, ` +
          `expected=${expectedHash.substring(0, 20)}..., ` +
          `computed=${computedHash.substring(0, 20)}...`,
      );

      return matches;
    } catch (error) {
      this.logger.warn('Error verifying content digest', error as Error);
      return false;
    }
  }

  /**
   * Parse signature input header to extract signature parameters
   */
  private parseSignatureInput(signatureInput: string): {
    components: string[];
    alg: PawapaySignatureAlgorithm;
    keyid: string;
    created: number;
    expires?: number;
  } | null {
    try {
      // Example: sig-pp=("@method" "@authority" "@path" "signature-date" "content-digest" "content-type");alg="ecdsa-p256-sha256";keyid="CUSTOMER_TEST_KEY";created=1714653405;expires=1714653465
      const match = signatureInput.match(/^([^=]+)=\(([^)]+)\);(.+)$/);
      if (!match) {
        return null;
      }

      const [, , componentsStr, paramsStr] = match;

      // Parse components
      const components = componentsStr
        .split(/\s+/)
        .map((comp) => comp.replace(/"/g, ''));

      // Parse parameters
      const params: Record<string, string> = {};
      const paramMatches = paramsStr.matchAll(/(\w+)="?([^";]+)"?/g);
      for (const paramMatch of paramMatches) {
        params[paramMatch[1]] = paramMatch[2];
      }

      const alg = params.alg as PawapaySignatureAlgorithm;
      if (!PAWAPAY_SUPPORTED_ALGORITHMS.includes(alg)) {
        this.logger.warn(`Unsupported signature algorithm: ${alg}`);
        return null;
      }

      return {
        components,
        alg,
        keyid: params.keyid,
        created: parseInt(params.created, 10),
        expires: params.expires ? parseInt(params.expires, 10) : undefined,
      };
    } catch (error) {
      this.logger.warn('Error parsing signature input', error as Error);
      return null;
    }
  }

  /**
   * Validate signature expiry to prevent replay attacks
   *
   * @param created - Unix timestamp when signature was created
   * @param expires - Optional Unix timestamp when signature expires
   * @returns true if valid, false otherwise
   */
  private validateSignatureExpiry(created: number, expires?: number): boolean {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const maxAgeSeconds = 600; // 10 minutes
    const clockSkewSeconds = 60; // Allow 60s clock skew

    // Check explicit expiry
    if (expires !== undefined && nowSeconds > expires) {
      this.logger.warn(
        `Signature expired: expires=${expires}, now=${nowSeconds} (${nowSeconds - expires}s ago)`,
      );
      return false;
    }

    // Check if too old (>10 minutes)
    const age = nowSeconds - created;
    if (age > maxAgeSeconds) {
      this.logger.warn(`Signature too old: age=${age}s, max=${maxAgeSeconds}s`);
      return false;
    }

    // Check if from future (beyond clock skew)
    if (created > nowSeconds + clockSkewSeconds) {
      this.logger.warn(
        `Signature from future: created=${created}, now=${nowSeconds}`,
      );
      return false;
    }

    this.logger.debug(
      `Signature timing valid: age=${age}s, expires=${expires ? 'in ' + (expires - nowSeconds) + 's' : 'N/A'}`,
    );
    return true;
  }

  /**
   * Create signature base according to RFC-9421
   */
  private createSignatureBase(
    signatureParams: {
      components: string[];
      alg: PawapaySignatureAlgorithm;
      keyid: string;
      created: number;
      expires?: number;
    },
    method: string,
    path: string,
    headers: Record<string, string>,
  ): string {
    const lines: string[] = [];

    for (const component of signatureParams.components) {
      if (component === '@method') {
        lines.push(`"@method": ${method.toUpperCase()}`);
      } else if (component === '@authority') {
        // For callbacks, this is the host receiving the callback
        lines.push(`"@authority": ${this.callbackAuthority}`);
      } else if (component === '@path') {
        lines.push(`"@path": ${path}`);
      } else if (headers[component]) {
        lines.push(`"${component}": ${headers[component]}`);
      }
    }

    // Add signature params line
    const paramParts = [
      `("${signatureParams.components.join('" "')}")`,
      `alg="${signatureParams.alg}"`,
      `keyid="${signatureParams.keyid}"`,
      `created=${signatureParams.created}`,
    ];

    if (signatureParams.expires) {
      paramParts.push(`expires=${signatureParams.expires}`);
    }

    lines.push(`"@signature-params": ${paramParts.join(';')}`);

    return lines.join('\n');
  }

  /**
   * Get PawaPay's public key with Redis caching
   * Cache TTL: 1 hour (matches ProviderCacheService pattern)
   * Falls back to direct API fetch if Redis unavailable
   */
  private async getPawapayPublicKeyCached(
    keyid: string,
  ): Promise<string | null> {
    const cacheKey = `pawapay:public-key:${keyid}`;
    const cacheTtl = 3600; // 1 hour

    try {
      // Try Redis cache first
      const cached = await this.redisService.getPubClient().get(cacheKey);
      if (cached) {
        this.logger.debug(`Retrieved public key for ${keyid} from Redis cache`);
        return cached;
      }

      // Cache miss - fetch all keys from API and find the requested one
      this.logger.log(`Cache miss for ${keyid}, fetching from PawaPay API`);
      const publicKeys = await this.fetchPublicKeys();
      const keyEntry = publicKeys.find((entry) => entry.id === keyid);

      if (keyEntry) {
        // Cache the found key
        await this.redisService
          .getPubClient()
          .setex(cacheKey, cacheTtl, keyEntry.key);
        this.logger.log(`Cached public key ${keyid} with ${cacheTtl}s TTL`);
        return keyEntry.key;
      }

      this.logger.warn(`Public key not found for keyid: ${keyid}`);
      return null;
    } catch (redisError) {
      // Graceful degradation to direct API fetch
      this.logger.warn(
        `Redis error for ${keyid}, falling back to API fetch`,
        redisError as Error,
      );

      try {
        const publicKeys = await this.fetchPublicKeys();
        const keyEntry = publicKeys.find((entry) => entry.id === keyid);
        return keyEntry?.key ?? null;
      } catch (apiError) {
        this.logger.error('Error fetching public keys', apiError as Error);
        return null;
      }
    }
  }

  /**
   * Verify signature using public key cryptography
   */
  private verifySignatureWithPublicKey(
    signatureBase: string,
    signature: string,
    publicKey: string,
    algorithm: PawapaySignatureAlgorithm,
  ): boolean {
    try {
      // Extract signature value (remove sig-pp=: prefix and : suffix)
      const signatureMatch = signature.match(/^[^=]+=:([^:]+):$/);
      if (!signatureMatch) {
        this.logger.warn(`Invalid signature format: ${signature}`);
        return false;
      }

      const signatureBytes = Buffer.from(signatureMatch[1], 'base64');
      this.logger.debug(
        `Signature parsed: ${signatureBytes.length} bytes from base64`,
      );

      // Only ecdsa-p256-sha256 supported based on production usage
      if (algorithm !== 'ecdsa-p256-sha256') {
        this.logger.error(
          `🚨 UNSUPPORTED SIGNATURE ALGORITHM: ${algorithm}. ` +
            `Only ecdsa-p256-sha256 is supported. ` +
            `If PawaPay uses this in production, contact support immediately.`,
        );
        return false;
      }

      const cryptoAlgorithm = 'sha256'; // For ecdsa-p256-sha256

      const verifier = createVerify(cryptoAlgorithm);
      verifier.update(signatureBase, 'utf8');

      const isValid = verifier.verify(publicKey, signatureBytes);

      if (!isValid) {
        this.logger.warn(
          `ECDSA verification failed. ` +
            `Algorithm: ${cryptoAlgorithm}, ` +
            `Signature bytes: ${signatureBytes.length}, ` +
            `Base length: ${signatureBase.length}`,
        );
      }

      return isValid;
    } catch (error) {
      this.logger.error(
        'Error verifying signature with public key',
        error as Error,
      );
      return false;
    }
  }
}
