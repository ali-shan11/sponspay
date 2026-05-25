import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PawapayWebhookService } from './pawapay-webhook.service';
import { FanGateway } from '../fan/fan.gateway';
import { Transaction } from '../transaction/entities/transaction.entity';
import { TransactionStatus } from '../transaction/entities/transaction-status.entity';
import { PawapayDepositCallback } from './interfaces/pawapay.interfaces';
import {
  FAN_MESSAGE_DELIVERY_QUEUE,
  FAN_YOUTUBE_MESSAGE_QUEUE,
} from '../queue/queue.constants';

describe('PawapayWebhookService', () => {
  let service: PawapayWebhookService;
  let dataSource: jest.Mocked<DataSource>;
  let fanGateway: jest.Mocked<FanGateway>;
  let messageDeliveryQueue: jest.Mocked<Queue>;
  let youtubeMessageQueue: jest.Mocked<Queue>;
  let mockManager: any;

  const mockTransaction: Transaction = {
    id: 'tx-123',
    depositId: 'deposit-abc',
    fanSessionId: 'fan-session-xyz',
    amount: '50.00',
    messageContent: 'Test message',
    beneficiary: {
      id: 'creator-1',
      telegramChannels: [{ channelHandle: 'testchannel' }],
      feePercentage: '15.00',
    } as any,
    status: { id: 'status-1', code: 'pending' } as any,
    currency: { shortCode: 'ZMW' } as any,
  } as any;

  const mockSucceededStatus: TransactionStatus = {
    id: 'status-succeeded',
    code: 'succeeded',
    name: 'Succeeded',
  } as any;

  const mockFailedStatus: TransactionStatus = {
    id: 'status-failed',
    code: 'failed',
    name: 'Failed',
  } as any;

  // Helper to create a proper deposit callback with v2 structure
  const createDepositCallback = (
    overrides?: Partial<PawapayDepositCallback>,
  ): PawapayDepositCallback => ({
    depositId: 'deposit-abc',
    status: 'COMPLETED',
    amount: '50.00',
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
    providerTransactionId: '0123cde2-cb6d-4ce1-a56b-02feb6579e5f',
    ...overrides,
  });

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
    };

    mockManager = {
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn((entity, data) => data),
      save: jest.fn((entity, data) => Promise.resolve(data)),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(mockManager)),
      getRepository: jest.fn(),
    } as any;

    fanGateway = {
      notifyPaymentStatus: jest.fn(),
    } as any;

    messageDeliveryQueue = {
      add: jest.fn().mockResolvedValue({}),
    } as any;

    youtubeMessageQueue = {
      add: jest.fn().mockResolvedValue({}),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PawapayWebhookService,
        { provide: DataSource, useValue: dataSource },
        { provide: FanGateway, useValue: fanGateway },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test') },
        },
        {
          provide: getQueueToken(FAN_MESSAGE_DELIVERY_QUEUE),
          useValue: messageDeliveryQueue,
        },
        {
          provide: getQueueToken(FAN_YOUTUBE_MESSAGE_QUEUE),
          useValue: youtubeMessageQueue,
        },
      ],
    }).compile();

    service = module.get<PawapayWebhookService>(PawapayWebhookService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processCallback', () => {
    it('should process successful deposit and enqueue message delivery', async () => {
      // Arrange
      const callback = createDepositCallback({ status: 'COMPLETED' });

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValueOnce(mockTransaction) // First call with lock
          .mockResolvedValueOnce(mockTransaction), // Second call with relations
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockSucceededStatus),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        create: jest.fn((entity, data) => data),
        save: jest.fn((entity, data) => Promise.resolve(data)),
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        }),
      };

      dataSource.transaction = jest
        .fn()
        .mockImplementation((cb) => cb(mockManager)) as any;

      // Act
      await service.processCallback(callback);

      // Assert
      expect(mockManager.findOne).toHaveBeenCalledWith(TransactionStatus, {
        where: { code: 'succeeded' },
      });

      expect(mockManager.update).toHaveBeenCalledWith(
        Transaction,
        'tx-123',
        expect.objectContaining({
          status: mockSucceededStatus,
          pawapayCorrespondent: 'MTN_MOMO_KEN',
          pawapayFinancialTxId: '0123cde2-cb6d-4ce1-a56b-02feb6579e5f',
        }),
      );

      expect(messageDeliveryQueue.add).toHaveBeenCalledWith(
        'deliver',
        { transactionId: 'tx-123' },
        { jobId: 'msg-tx-123' },
      );

      expect(fanGateway.notifyPaymentStatus).toHaveBeenCalledWith(
        'fan-session-xyz',
        expect.objectContaining({
          status: 'succeeded',
          depositId: 'deposit-abc',
          transactionId: 'tx-123',
        }),
      );
    });

    it('should process failed deposit and notify fan', async () => {
      // Arrange
      const callback = createDepositCallback({
        status: 'FAILED',
        failureReason: {
          failureCode: 'INSUFFICIENT_FUNDS',
          failureMessage: 'Customer has insufficient balance',
        },
      });

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValueOnce(mockTransaction)
          .mockResolvedValueOnce(mockTransaction),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockFailedStatus),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        create: jest.fn((entity, data) => data),
        save: jest.fn((entity, data) => Promise.resolve(data)),
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        }),
      };

      dataSource.transaction = jest
        .fn()
        .mockImplementation((cb) => cb(mockManager)) as any;

      // Act
      await service.processCallback(callback);

      // Assert
      expect(mockManager.update).toHaveBeenCalledWith(
        Transaction,
        'tx-123',
        expect.objectContaining({ status: mockFailedStatus }),
      );

      expect(messageDeliveryQueue.add).not.toHaveBeenCalled();

      // Should be called twice for failed payments (initial notification + failure notification)
      expect(fanGateway.notifyPaymentStatus).toHaveBeenCalledTimes(2);

      // Both calls should include the failure reason (formatted as "CODE: message")
      expect(fanGateway.notifyPaymentStatus).toHaveBeenNthCalledWith(
        1,
        'fan-session-xyz',
        expect.objectContaining({
          status: 'failed',
          depositId: 'deposit-abc',
          transactionId: 'tx-123',
          reason: 'INSUFFICIENT_FUNDS: Customer has insufficient balance',
        }),
      );

      expect(fanGateway.notifyPaymentStatus).toHaveBeenNthCalledWith(
        2,
        'fan-session-xyz',
        expect.objectContaining({
          status: 'failed',
          depositId: 'deposit-abc',
          transactionId: 'tx-123',
          reason: 'INSUFFICIENT_FUNDS: Customer has insufficient balance',
        }),
      );
    });

    it('should skip processing if transaction already succeeded (idempotency)', async () => {
      // Arrange
      const callback = createDepositCallback({ status: 'COMPLETED' });

      const alreadySucceededTx = {
        ...mockTransaction,
        status: { id: 'status-succeeded', code: 'succeeded' },
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValueOnce(alreadySucceededTx)
          .mockResolvedValueOnce(alreadySucceededTx),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      };

      const mockManager = {
        findOne: jest.fn(),
        update: jest.fn(),
        create: jest.fn((entity, data) => data),
        save: jest.fn((entity, data) => Promise.resolve(data)),
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        }),
      };

      dataSource.transaction = jest
        .fn()
        .mockImplementation((cb) => cb(mockManager)) as any;

      // Act
      await service.processCallback(callback);

      // Assert
      expect(mockManager.update).not.toHaveBeenCalled();
      expect(messageDeliveryQueue.add).not.toHaveBeenCalled();

      // Verify the idempotency log message was called
      const logCalls = (Logger.prototype.log as jest.Mock).mock.calls;
      const hasIdempotencyLog = logCalls.some(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('Transaction') &&
          call[0].includes('already processed'),
      );
      expect(hasIdempotencyLog).toBe(true);
    });

    it('should skip processing if transaction already failed (idempotency)', async () => {
      // Arrange
      const callback = createDepositCallback({ status: 'COMPLETED' });

      const alreadyFailedTx = {
        ...mockTransaction,
        status: { id: 'status-failed', code: 'failed' },
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValueOnce(alreadyFailedTx)
          .mockResolvedValueOnce(alreadyFailedTx),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      };

      const mockManager = {
        findOne: jest.fn(),
        update: jest.fn(),
        create: jest.fn((entity, data) => data),
        save: jest.fn((entity, data) => Promise.resolve(data)),
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        }),
      };

      dataSource.transaction = jest
        .fn()
        .mockImplementation((cb) => cb(mockManager)) as any;

      // Act
      await service.processCallback(callback);

      // Assert
      expect(mockManager.update).not.toHaveBeenCalled();
      expect(messageDeliveryQueue.add).not.toHaveBeenCalled();
    });

    it('should handle transaction not found gracefully', async () => {
      // Arrange
      const callback = createDepositCallback({
        depositId: 'nonexistent-deposit',
      });

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      };

      const mockManager = {
        findOne: jest.fn(),
        update: jest.fn(),
        create: jest.fn((entity, data) => data),
        save: jest.fn((entity, data) => Promise.resolve(data)),
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        }),
      };

      dataSource.transaction = jest
        .fn()
        .mockImplementation((cb) => cb(mockManager)) as any;

      // Act
      await service.processCallback(callback);

      // Assert
      expect(mockManager.update).not.toHaveBeenCalled();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('No transaction found'),
      );
    });

    it('should map PawaPay "PROCESSING" status to transaction "processing"', async () => {
      // Arrange
      const callback = createDepositCallback({ status: 'PROCESSING' });

      const mockProcessingStatus = {
        id: 'status-processing',
        code: 'processing',
      } as any;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValueOnce(mockTransaction)
          .mockResolvedValueOnce(mockTransaction),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockProcessingStatus),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        create: jest.fn((entity, data) => data),
        save: jest.fn((entity, data) => Promise.resolve(data)),
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        }),
      };

      dataSource.transaction = jest
        .fn()
        .mockImplementation((cb) => cb(mockManager)) as any;

      // Act
      await service.processCallback(callback);

      // Assert
      expect(mockManager.findOne).toHaveBeenCalledWith(TransactionStatus, {
        where: { code: 'processing' },
      });

      expect(mockManager.update).toHaveBeenCalledWith(
        Transaction,
        'tx-123',
        expect.objectContaining({ status: mockProcessingStatus }),
      );

      expect(messageDeliveryQueue.add).not.toHaveBeenCalled();
    });

    it('should enqueue YouTube message when youtubeVideoId is present', async () => {
      // Arrange
      const callback = createDepositCallback({ status: 'COMPLETED' });

      const txWithYoutube = {
        ...mockTransaction,
        youtubeVideoId: 'yt-video-123',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValueOnce(txWithYoutube)
          .mockResolvedValueOnce(txWithYoutube),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockSucceededStatus),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        create: jest.fn((entity, data) => data),
        save: jest.fn((entity, data) => Promise.resolve(data)),
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        }),
      };

      dataSource.transaction = jest
        .fn()
        .mockImplementation((cb) => cb(mockManager)) as any;

      // Act
      await service.processCallback(callback);

      // Assert
      expect(messageDeliveryQueue.add).toHaveBeenCalledWith(
        'deliver',
        { transactionId: 'tx-123' },
        { jobId: 'msg-tx-123' },
      );
      expect(youtubeMessageQueue.add).toHaveBeenCalledWith(
        'send',
        { transactionId: 'tx-123' },
        { jobId: 'yt-tx-123' },
      );
    });

    it('should handle null fanSessionId without crashing', async () => {
      // Arrange
      const callback = createDepositCallback({ status: 'COMPLETED' });

      const txWithoutSession = {
        ...mockTransaction,
        fanSessionId: null,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValueOnce(txWithoutSession)
          .mockResolvedValueOnce(txWithoutSession),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockSucceededStatus),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        create: jest.fn((entity, data) => data),
        save: jest.fn((entity, data) => Promise.resolve(data)),
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        }),
      };

      dataSource.transaction = jest
        .fn()
        .mockImplementation((cb) => cb(mockManager)) as any;

      // Act
      await service.processCallback(callback);

      // Assert - should not call notifyPaymentStatus (returns early)
      expect(fanGateway.notifyPaymentStatus).not.toHaveBeenCalled();

      // But should still update transaction and enqueue message delivery
      expect(mockManager.update).toHaveBeenCalledWith(
        Transaction,
        'tx-123',
        expect.objectContaining({ status: mockSucceededStatus }),
      );
      expect(messageDeliveryQueue.add).toHaveBeenCalled();

      // Should log warning about missing fanSessionId
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'No fanSessionId provided for notification',
      );
    });
  });
});
