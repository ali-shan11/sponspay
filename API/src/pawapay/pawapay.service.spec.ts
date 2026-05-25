import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import {
  PawapayDepositRequest,
  PawapayPayoutRequest,
  PawapayRefundRequest,
  PawapayDepositCallback,
} from './interfaces/pawapay.interfaces';
import {
  PawapayRequestException,
  PawapayRejectionException,
  PawapayDuplicateException,
  PawapayTransientException,
} from './pawapay.exceptions';
import { PawapayService } from './pawapay.service';
import { ActiveConfigurationResponse } from './interfaces/provider.interface';
import { RedisService } from '../redis/redis.service';

describe('PawapayService', () => {
  let service: PawapayService;
  let httpService: jest.Mocked<HttpService>;
  let redisService: { getPubClient: jest.Mock };

  const baseConfig = {
    PAWAPAY_BASE_URL: 'https://api.sandbox.pawapay.io/v2',
    PAWAPAY_API_TOKEN: 'test-token',
  };

  const createConfigService = (overrides?: Partial<typeof baseConfig>) => {
    const store = { ...baseConfig, ...(overrides ?? {}) };
    return {
      get: jest.fn((key: string) => store[key as keyof typeof store]),
    } as unknown as ConfigService;
  };

  const createHttpService = () =>
    ({
      post: jest.fn(),
      get: jest.fn(),
    }) as unknown as jest.Mocked<HttpService>;

  beforeEach(async () => {
    httpService = createHttpService();
    redisService = {
      getPubClient: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue('OK'),
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PawapayService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: createConfigService() },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<PawapayService>(PawapayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDeposit', () => {
    it('sends deposit request with custom headers', async () => {
      const payload: PawapayDepositRequest = {
        depositId: 'dep-123e4567-e89b-12d3-a456-426614174000',
        payer: {
          type: 'MMO',
          accountDetails: {
            phoneNumber: '233500000000',
            provider: 'MTN_MOMO_GHA',
          },
        },
        amount: '10.50',
        currency: 'GHS',
        clientReferenceId: 'test-ref-1',
      };
      const responseBody = { id: 'dep-1', status: 'pending' };
      httpService.post.mockReturnValueOnce(
        of({ data: responseBody } as AxiosResponse<typeof responseBody>),
      );

      const result = await service.createDeposit(payload, {
        headers: { 'Custom-Header': 'custom-value' },
      });

      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.sandbox.pawapay.io/v2/deposits',
        payload,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Custom-Header': 'custom-value',
          }),
        }),
      );
      expect(result).toEqual(responseBody);
    });

    it('sends deposit request without options', async () => {
      const payload: PawapayDepositRequest = {
        depositId: 'dep-223e4567-e89b-12d3-a456-426614174000',
        payer: {
          type: 'MMO',
          accountDetails: {
            phoneNumber: '254700000000',
            provider: 'SAFARICOM_KEN',
          },
        },
        amount: '100.00',
        currency: 'KES',
        clientReferenceId: 'test-ref-2',
      };

      httpService.post.mockReturnValueOnce(
        of({ data: {} } as AxiosResponse<Record<string, never>>),
      );

      await service.createDeposit(payload);

      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.sandbox.pawapay.io/v2/deposits',
        payload,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('throws provider error details when request fails', async () => {
      const payload: PawapayDepositRequest = {
        depositId: 'dep-323e4567-e89b-12d3-a456-426614174000',
        payer: {
          type: 'MMO',
          accountDetails: {
            phoneNumber: '260960000000',
            provider: 'MTN_MOMO_ZMB',
          },
        },
        amount: '50.00',
        currency: 'ZMW',
        clientReferenceId: 'test-ref-3',
      };

      const axiosError = new AxiosError(
        'Bad Request',
        'ERR_BAD_REQUEST',
        undefined,
        {},
        {
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: {},
          data: { error: 'Invalid MSISDN' },
        } as AxiosResponse,
      );

      httpService.post.mockReturnValueOnce(throwError(() => axiosError));

      let thrown: PawapayRequestException | undefined;
      try {
        await service.createDeposit(payload);
      } catch (error) {
        thrown = error as PawapayRequestException;
      }

      expect(thrown).toBeInstanceOf(PawapayRequestException);
      expect(thrown?.getStatus()).toBe(400);
      expect(thrown?.getResponse()).toMatchObject({
        message: 'PawaPay POST deposits request failed',
      });
    });
  });

  describe('createPayout', () => {
    it('sends payout request to provider', async () => {
      const payload: PawapayPayoutRequest = {
        payoutId: 'pay-123e4567-e89b-12d3-a456-426614174000',
        recipient: {
          type: 'MMO',
          accountDetails: {
            phoneNumber: '256780000000',
            provider: 'MTN_MOMO_UGA',
          },
        },
        amount: '2500.00',
        currency: 'UGX',
        clientReferenceId: 'test-payout-1',
      };

      const responseBody = { id: 'payout-1', status: 'accepted' };
      httpService.post.mockReturnValueOnce(
        of({ data: responseBody } as AxiosResponse<typeof responseBody>),
      );

      const result = await service.createPayout(payload);

      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.sandbox.pawapay.io/v2/payouts',
        payload,
        expect.anything(),
      );
      expect(result).toEqual(responseBody);
    });
  });

  describe('createRefund', () => {
    it('sends refund request to provider', async () => {
      const payload: PawapayRefundRequest = {
        refundId: 'ref-123e4567-e89b-12d3-a456-426614174000',
        depositId: 'dep-123e4567-e89b-12d3-a456-426614174000',
        amount: '25.00',
        currency: 'GHS',
        clientReferenceId: 'test-refund-1',
      };

      httpService.post.mockReturnValueOnce(
        of({ data: { status: 'queued' } } as AxiosResponse<{ status: string }>),
      );

      const result = await service.createRefund(payload);

      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.sandbox.pawapay.io/v2/refunds',
        payload,
        expect.anything(),
      );
      expect(result).toEqual({ status: 'queued' });
    });
  });

  describe('predictProvider', () => {
    it('sends predict-provider request with phone number', async () => {
      const responseBody = {
        country: 'ZMB',
        provider: 'MTN_MOMO_ZMB',
        phoneNumber: '260763456789',
      };

      httpService.post.mockReturnValueOnce(
        of({ data: responseBody } as AxiosResponse<typeof responseBody>),
      );

      const result = await service.predictProvider('+260 763-456789');

      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.sandbox.pawapay.io/v2/predict-provider',
        { phoneNumber: '+260 763-456789' },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        }),
      );
      expect(result).toEqual(responseBody);
    });

    it('throws PawapayRequestException for invalid phone number', async () => {
      const axiosError = new AxiosError(
        'Bad Request',
        'ERR_BAD_REQUEST',
        undefined,
        {},
        {
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: {},
          data: {
            failureReason: {
              failureCode: 'INVALID_INPUT',
              failureMessage: 'Invalid phone number',
            },
          },
        } as AxiosResponse,
      );

      httpService.post.mockReturnValueOnce(throwError(() => axiosError));

      let thrown: PawapayRequestException | undefined;
      try {
        await service.predictProvider('123');
      } catch (error) {
        thrown = error as PawapayRequestException;
      }

      expect(thrown).toBeInstanceOf(PawapayRequestException);
      expect(thrown?.getStatus()).toBe(400);
    });
  });

  describe('listProvidersAvailability', () => {
    it('returns empty array when no providers match', async () => {
      // Mock fetchActiveConfiguration to return no matching countries
      const emptyConfig: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [], // No countries
      };

      jest
        .spyOn(service, 'fetchActiveConfiguration')
        .mockResolvedValueOnce(emptyConfig);

      const result = await service.listProvidersAvailability(' gha ');

      expect(httpService.post).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('maps availability payload to providers', async () => {
      // Create proper hierarchical config instead of flat providers array
      const mockActiveConfig: ActiveConfigurationResponse = {
        companyName: 'Test Merchant Inc',
        countries: [
          {
            country: 'GHA',
            providers: [
              {
                provider: 'MTN_MOMO_GHA',
                currencies: [
                  {
                    currency: 'GHS',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: '1',
                        maxAmount: '10000',
                      },
                    },
                  },
                ],
              },
              {
                provider: 'AIRTEL_GHA',
                currencies: [
                  {
                    currency: 'GHS',
                    operationTypes: {
                      DEPOSIT: {
                        minAmount: '1',
                        maxAmount: '5000',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      // Mock fetchActiveConfiguration to return the hierarchical config
      jest
        .spyOn(service, 'fetchActiveConfiguration')
        .mockResolvedValueOnce(mockActiveConfig);

      const availabilityResponse = {
        providers: {
          MTN_MOMO_GHA: { status: 'AVAILABLE' },
          AIRTEL_GHA: { status: 'UNAVAILABLE' },
        },
      };

      httpService.post.mockReturnValueOnce(
        of({
          data: availabilityResponse,
        } as AxiosResponse<typeof availabilityResponse>),
      );

      const result = await service.listProvidersAvailability('GHA');

      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.sandbox.pawapay.io/v2/toolkit/availability',
        { providers: ['MTN_MOMO_GHA', 'AIRTEL_GHA'] },
        expect.anything(),
      );

      expect(result).toEqual([
        {
          id: 'MTN_MOMO_GHA',
          name: 'MTN MOMO GHA',
          availability: { status: 'AVAILABLE' },
        },
        {
          id: 'AIRTEL_GHA',
          name: 'AIRTEL GHA',
          availability: { status: 'UNAVAILABLE' },
        },
      ]);
    });
  });

  describe('callback handling', () => {
    it('handles callback with valid signature', async () => {
      const payload: PawapayDepositCallback = {
        depositId: 'dep-123',
        status: 'COMPLETED',
        amount: '100.00',
        currency: 'KES',
        country: 'KEN',
        payer: {
          type: 'MMO',
          accountDetails: {
            phoneNumber: '254703456789',
            provider: 'MTN_MOMO_KEN',
          },
        },
        created: '2025-12-24T02:50:17Z',
        customerMessage: 'Test payment',
        providerTransactionId: 'tx-001',
      };
      const headers = {
        'content-type': 'application/json',
        signature: 'sig-pp=:test-signature:',
        'signature-input':
          'sig-pp=("@method" "@authority" "@path");alg="ecdsa-p256-sha256";keyid="test-key";created=1234567890',
        'signature-date': '2024-01-01T00:00:00Z',
        'content-digest': 'sha-512=:test-digest:',
      };
      const rawBody = JSON.stringify(payload);

      // Mock the signature verification to return true
      jest.spyOn(service, 'verifyCallbackSignature').mockResolvedValue(true);

      const result = await service.handleCallback(payload, headers, rawBody);

      expect(result).toEqual(payload);
    });

    it('throws exception when signature verification fails', async () => {
      const payload: PawapayDepositCallback = {
        depositId: 'dep-456',
        status: 'FAILED',
        amount: '50.00',
        currency: 'GHS',
        country: 'GHA',
        payer: {
          type: 'MMO',
          accountDetails: {
            phoneNumber: '233500000000',
            provider: 'MTN_MOMO_GHA',
          },
        },
        created: '2025-12-24T03:00:00Z',
        customerMessage: 'Test payment',
        providerTransactionId: 'tx-002',
        failureReason: { failureCode: 'INSUFFICIENT_FUNDS' },
      };
      const headers = {
        'content-type': 'application/json',
        signature: 'sig-pp=:invalid-signature:',
        'signature-input':
          'sig-pp=("@method" "@authority" "@path");alg="ecdsa-p256-sha256";keyid="test-key";created=1234567890',
        'signature-date': '2024-01-01T00:00:00Z',
        'content-digest': 'sha-512=:test-digest:',
      };
      const rawBody = JSON.stringify(payload);

      // Mock the signature verification to return false
      jest.spyOn(service, 'verifyCallbackSignature').mockResolvedValue(false);

      await expect(
        service.handleCallback(payload, headers, rawBody),
      ).rejects.toThrow();
    });
  });

  describe('RFC-9421 signature verification helpers', () => {
    it('verifies content digest correctly', () => {
      const rawBody = '{"test": "data"}';
      const contentDigest =
        'sha-256=:QLYf4bFa8KTVQCc1smND6M+KBF9NgXEOYQiiHZHq82Y=:';

      const result = service['verifyContentDigest'](contentDigest, rawBody);

      expect(result).toBe(true);
    });

    it('rejects invalid content digest', () => {
      const rawBody = '{"test": "data"}';
      const contentDigest = 'sha-256=:invalid-hash:';

      const result = service['verifyContentDigest'](contentDigest, rawBody);

      expect(result).toBe(false);
    });

    it('parses signature input correctly', () => {
      const signatureInput =
        'sig-pp=("@method" "@authority" "@path" "signature-date" "content-digest" "content-type");alg="ecdsa-p256-sha256";keyid="CUSTOMER_TEST_KEY";created=1714653405;expires=1714653465';

      const result = service['parseSignatureInput'](signatureInput);

      expect(result).toEqual({
        components: [
          '@method',
          '@authority',
          '@path',
          'signature-date',
          'content-digest',
          'content-type',
        ],
        alg: 'ecdsa-p256-sha256',
        keyid: 'CUSTOMER_TEST_KEY',
        created: 1714653405,
        expires: 1714653465,
      });
    });

    it('returns null for invalid signature input', () => {
      const signatureInput = 'invalid-format';

      const result = service['parseSignatureInput'](signatureInput);

      expect(result).toBeNull();
    });
  });

  describe('Enhanced Error Handling', () => {
    describe('createDeposit - rejection handling', () => {
      const validPayload: PawapayDepositRequest = {
        depositId: 'dep-123e4567-e89b-12d3-a456-426614174000',
        payer: {
          type: 'MMO',
          accountDetails: {
            phoneNumber: '233500000000',
            provider: 'MTN_MOMO_GHA',
          },
        },
        amount: '10.50',
        currency: 'GHS',
        clientReferenceId: 'test-ref-error-1',
      };

      it('should throw PawapayRejectionException when response status is REJECTED', async () => {
        const rejectedResponse = {
          status: 'REJECTED',
          rejectionReason: {
            code: 'INSUFFICIENT_FUNDS',
            message: 'Payer has insufficient balance',
          },
        };

        httpService.post.mockReturnValueOnce(
          of({ data: rejectedResponse } as AxiosResponse),
        );

        await expect(service.createDeposit(validPayload)).rejects.toThrow(
          PawapayRejectionException,
        );
      });

      it('should throw PawapayDuplicateException when response status is DUPLICATE_IGNORED', async () => {
        const duplicateResponse = {
          status: 'DUPLICATE_IGNORED',
          depositId: validPayload.depositId,
        };

        httpService.post.mockReturnValueOnce(
          of({ data: duplicateResponse } as AxiosResponse),
        );

        await expect(service.createDeposit(validPayload)).rejects.toThrow(
          PawapayDuplicateException,
        );
      });

      it('should return successfully when response status is ACCEPTED', async () => {
        const acceptedResponse = {
          status: 'ACCEPTED',
          depositId: validPayload.depositId,
        };

        httpService.post.mockReturnValueOnce(
          of({ data: acceptedResponse } as AxiosResponse),
        );

        const result = await service.createDeposit(validPayload);
        expect(result).toEqual(acceptedResponse);
      });
    });

    describe('createDeposit - retry logic', () => {
      const validPayload: PawapayDepositRequest = {
        depositId: 'dep-223e4567-e89b-12d3-a456-426614174000',
        payer: {
          type: 'MMO',
          accountDetails: {
            phoneNumber: '254700000000',
            provider: 'SAFARICOM_KEN',
          },
        },
        amount: '100.00',
        currency: 'KES',
        clientReferenceId: 'test-ref-retry-1',
      };

      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should retry 3 times for network errors and then throw', async () => {
        const networkError = new AxiosError(
          'ECONNREFUSED',
          'ERR_NETWORK',
          undefined,
          {},
        );

        httpService.post.mockReturnValue(throwError(() => networkError));

        // Create promise and advance timers concurrently
        const testPromise = Promise.all([
          expect(service.createDeposit(validPayload)).rejects.toThrow(
            PawapayTransientException,
          ),
          jest.runAllTimersAsync(),
        ]);

        await testPromise;

        // Verify retries happened
        expect(httpService.post).toHaveBeenCalledTimes(3);
      });

      it('should succeed on 2nd attempt after transient failure', async () => {
        const networkError = new AxiosError(
          'Network timeout',
          'ETIMEDOUT',
          undefined,
          {},
        );
        const successResponse = {
          status: 'ACCEPTED',
          depositId: validPayload.depositId,
        };

        httpService.post
          .mockReturnValueOnce(throwError(() => networkError))
          .mockReturnValueOnce(of({ data: successResponse } as AxiosResponse));

        const promise = service.createDeposit(validPayload);

        // Fast-forward through the delay
        await jest.runAllTimersAsync();

        const result = await promise;
        expect(httpService.post).toHaveBeenCalledTimes(2);
        expect(result).toEqual(successResponse);
      });

      it('should NOT retry for rejection errors', async () => {
        const rejectedResponse = {
          status: 'REJECTED',
          rejectionReason: { code: 'INVALID_MSISDN' },
        };

        httpService.post.mockReturnValueOnce(
          of({ data: rejectedResponse } as AxiosResponse),
        );

        await expect(service.createDeposit(validPayload)).rejects.toThrow(
          PawapayRejectionException,
        );
        expect(httpService.post).toHaveBeenCalledTimes(1); // No retry
      });

      it('should NOT retry for duplicate errors', async () => {
        const duplicateResponse = { status: 'DUPLICATE_IGNORED' };

        httpService.post.mockReturnValueOnce(
          of({ data: duplicateResponse } as AxiosResponse),
        );

        await expect(service.createDeposit(validPayload)).rejects.toThrow(
          PawapayDuplicateException,
        );
        expect(httpService.post).toHaveBeenCalledTimes(1); // No retry
      });

      it('should retry for 5xx server errors', async () => {
        const serverError = new AxiosError(
          'Internal Server Error',
          'ERR_BAD_RESPONSE',
          undefined,
          {},
          {
            status: 500,
            statusText: 'Internal Server Error',
            headers: {},
            config: {},
            data: { error: 'Server error' },
          } as AxiosResponse,
        );

        httpService.post.mockReturnValue(throwError(() => serverError));

        // Create promise and advance timers concurrently
        const testPromise = Promise.all([
          expect(service.createDeposit(validPayload)).rejects.toThrow(
            PawapayTransientException,
          ),
          jest.runAllTimersAsync(),
        ]);

        await testPromise;

        // Verify retries happened
        expect(httpService.post).toHaveBeenCalledTimes(3);
      });

      it('should NOT retry for 4xx client errors', async () => {
        const clientError = new AxiosError(
          'Bad Request',
          'ERR_BAD_REQUEST',
          undefined,
          {},
          {
            status: 400,
            statusText: 'Bad Request',
            headers: {},
            config: {},
            data: { error: 'Invalid request' },
          } as AxiosResponse,
        );

        httpService.post.mockReturnValueOnce(throwError(() => clientError));

        await expect(service.createDeposit(validPayload)).rejects.toThrow(
          PawapayRequestException,
        );
        expect(httpService.post).toHaveBeenCalledTimes(1); // No retry
      });
    });

    describe('createPayout - enhanced error handling', () => {
      const validPayload: PawapayPayoutRequest = {
        payoutId: 'pay-123e4567-e89b-12d3-a456-426614174000',
        recipient: {
          type: 'MMO',
          accountDetails: {
            phoneNumber: '256780000000',
            provider: 'MTN_MOMO_UGA',
          },
        },
        amount: '2500.00',
        currency: 'UGX',
        clientReferenceId: 'test-payout-error-1',
      };

      it('should throw PawapayRejectionException for rejected payouts', async () => {
        const rejectedResponse = {
          status: 'REJECTED',
          rejectionReason: { code: 'RECIPIENT_NOT_FOUND' },
        };

        httpService.post.mockReturnValueOnce(
          of({ data: rejectedResponse } as AxiosResponse),
        );

        await expect(service.createPayout(validPayload)).rejects.toThrow(
          PawapayRejectionException,
        );
      });
    });

    describe('createRefund - enhanced error handling', () => {
      const validPayload: PawapayRefundRequest = {
        refundId: 'ref-123e4567-e89b-12d3-a456-426614174000',
        depositId: 'dep-123e4567-e89b-12d3-a456-426614174000',
        amount: '25.00',
        currency: 'GHS',
        clientReferenceId: 'test-refund-error-1',
      };

      it('should throw PawapayRejectionException for rejected refunds', async () => {
        const rejectedResponse = {
          status: 'REJECTED',
          rejectionReason: { code: 'DEPOSIT_NOT_FOUND' },
        };

        httpService.post.mockReturnValueOnce(
          of({ data: rejectedResponse } as AxiosResponse),
        );

        await expect(service.createRefund(validPayload)).rejects.toThrow(
          PawapayRejectionException,
        );
      });
    });
  });

  describe('Public Key Caching', () => {
    it('should cache public key on first fetch', async () => {
      const keyid = 'TEST_KEY';
      const publicKey =
        '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----';

      const mockRedis = redisService.getPubClient();
      (mockRedis.get as jest.Mock).mockResolvedValue(null); // cache miss
      (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

      jest
        .spyOn(service as any, 'fetchPublicKeys')
        .mockResolvedValue([{ id: keyid, key: publicKey }]);

      const result = await service['getPawapayPublicKeyCached'](keyid);

      expect(result).toBe(publicKey);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `pawapay:public-key:${keyid}`,
        3600,
        publicKey,
      );
    });

    it('should return cached key without API call', async () => {
      const keyid = 'TEST_KEY';
      const cached =
        '-----BEGIN PUBLIC KEY-----\ncached\n-----END PUBLIC KEY-----';

      const mockRedis = redisService.getPubClient();
      (mockRedis.get as jest.Mock).mockResolvedValue(cached);

      const apiSpy = jest.spyOn(service as any, 'fetchPublicKeys');

      const result = await service['getPawapayPublicKeyCached'](keyid);

      expect(result).toBe(cached);
      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('should fall back to API if Redis fails', async () => {
      const keyid = 'TEST_KEY';
      const publicKey =
        '-----BEGIN PUBLIC KEY-----\nfallback\n-----END PUBLIC KEY-----';

      const mockRedis = redisService.getPubClient();
      (mockRedis.get as jest.Mock).mockRejectedValue(new Error('Redis down'));

      jest
        .spyOn(service as any, 'fetchPublicKeys')
        .mockResolvedValue([{ id: keyid, key: publicKey }]);

      const result = await service['getPawapayPublicKeyCached'](keyid);

      expect(result).toBe(publicKey);
    });
  });

  describe('Signature Expiry Validation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-05-01T12:00:00Z').getTime());
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should accept valid signature within time window', () => {
      const created = Math.floor(Date.now() / 1000) - 60; // 1 min ago
      const expires = Math.floor(Date.now() / 1000) + 540; // 9 min from now

      expect(service['validateSignatureExpiry'](created, expires)).toBe(true);
    });

    it('should reject expired signature', () => {
      const created = Math.floor(Date.now() / 1000) - 300;
      const expires = Math.floor(Date.now() / 1000) - 60; // Expired

      expect(service['validateSignatureExpiry'](created, expires)).toBe(false);
    });

    it('should reject signature older than 10 minutes', () => {
      const created = Math.floor(Date.now() / 1000) - 700; // 11+ min ago

      expect(service['validateSignatureExpiry'](created)).toBe(false);
    });

    it('should reject signature from future (beyond clock skew)', () => {
      const created = Math.floor(Date.now() / 1000) + 120; // 2 min future

      expect(service['validateSignatureExpiry'](created)).toBe(false);
    });

    it('should allow 60s clock skew', () => {
      const created = Math.floor(Date.now() / 1000) + 30; // 30s future

      expect(service['validateSignatureExpiry'](created)).toBe(true);
    });
  });
});
