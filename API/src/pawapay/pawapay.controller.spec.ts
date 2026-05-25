import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PawapayService } from './pawapay.service';
import { PawapayWebhookService } from './pawapay-webhook.service';
import { PawapayDepositCallback } from './interfaces/pawapay.interfaces';
import { PawapayController } from './pawapay.controller';
import { ApiKeyGuard } from '../auth/api-key.guard';

// Custom interface for requests with raw body
interface RawBodyRequest extends Request {
  rawBody?: string | Buffer;
}

describe('PawapayController', () => {
  let controller: PawapayController;
  let service: jest.Mocked<PawapayService>;

  beforeEach(async () => {
    service = {
      handleCallback: jest.fn().mockResolvedValue({ success: true }),
      listProvidersAvailability: jest.fn().mockResolvedValue([]),
      predictProvider: jest.fn().mockResolvedValue({
        country: 'ZMB',
        provider: 'MTN_MOMO_ZMB',
        phoneNumber: '260763456789',
      }),
    } as unknown as jest.Mocked<PawapayService>;

    const webhookService = {
      processCallback: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PawapayWebhookService>;

    const configService = {
      get: jest.fn().mockReturnValue('development'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PawapayController],
      providers: [
        { provide: PawapayService, useValue: service },
        { provide: PawapayWebhookService, useValue: webhookService },
        { provide: ConfigService, useValue: configService },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PawapayController>(PawapayController);
  });

  it('passes callback payload and headers to service', async () => {
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

    const req = {
      body: payload,
      rawBody: Buffer.from(JSON.stringify(payload)),
    } as unknown as RawBodyRequest;

    const headers = {
      signature: 'sig-pp=:signature-value:',
      'signature-input':
        'sig-pp=("@method" "@authority" "@path");alg="ecdsa-p256-sha256";keyid="test-key";created=1234567890',
      'signature-date': '2024-01-01T00:00:00Z',
      'content-digest': 'sha-512=:test-digest:',
      'content-type': 'application/json',
    };

    const result = await controller.handleCallback(req, headers);

    expect(service.handleCallback).toHaveBeenCalledWith(
      payload,
      {
        signature: 'sig-pp=:signature-value:',
        'signature-input':
          'sig-pp=("@method" "@authority" "@path");alg="ecdsa-p256-sha256";keyid="test-key";created=1234567890',
        'signature-date': '2024-01-01T00:00:00Z',
        'content-digest': 'sha-512=:test-digest:',
        'content-type': 'application/json',
      },
      JSON.stringify(payload),
    );
    expect(result).toEqual({ success: true });
  });

  it('falls back to JSON string when raw body missing', async () => {
    const payload: PawapayDepositCallback = {
      depositId: 'dep-456',
      status: 'PROCESSING',
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
    };

    const req = {
      body: payload,
    } as unknown as RawBodyRequest;

    const headers = {
      Signature: 'sig-pp=:signature-value:',
      'Content-Type': 'application/json',
    };

    await controller.handleCallback(req, headers);

    expect(service.handleCallback).toHaveBeenCalledWith(
      payload,
      {
        signature: 'sig-pp=:signature-value:',
        'content-type': 'application/json',
      },
      JSON.stringify(payload),
    );
  });

  it('delegates predict-provider to service', async () => {
    const prediction = {
      country: 'KEN',
      provider: 'SAFARICOM_KEN',
      phoneNumber: '254712345678',
    };

    service.predictProvider.mockResolvedValueOnce(prediction);

    const result = await controller.predictProvider({
      phoneNumber: '254712345678',
    });

    expect(service.predictProvider).toHaveBeenCalledWith('254712345678');
    expect(result).toEqual(prediction);
  });

  it('delegates provider availability listing to service', async () => {
    const availability = [
      {
        id: 'provider-1',
        name: 'MTN MOMO GHA',
        availability: { status: 'AVAILABLE' },
      },
    ];

    service.listProvidersAvailability.mockResolvedValueOnce(availability);

    const result = await controller.listProviders({
      countryCode: 'GHA',
    });

    expect(service.listProvidersAvailability).toHaveBeenCalledWith('GHA');
    expect(result).toEqual(availability);
  });
});
