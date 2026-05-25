import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FanGateway } from './fan.gateway';
import { Transaction } from '../transaction/entities/transaction.entity';
import { Server, Socket } from 'socket.io';

describe('FanGateway', () => {
  let gateway: FanGateway;
  let mockServer: jest.Mocked<Server>;
  let mockSocket: jest.Mocked<Socket>;
  let mockTransactionRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    // Mock Socket.IO Server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    // Mock Socket client
    mockSocket = {
      id: 'test-socket-id',
      join: jest.fn(),
      emit: jest.fn(),
    } as any;

    // Mock Transaction repository
    mockTransactionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    // Spy on Logger methods
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FanGateway,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepo,
        },
      ],
    }).compile();

    gateway = module.get<FanGateway>(FanGateway);
    gateway.server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should log client connection', () => {
      gateway.handleConnection(mockSocket);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Fan client connected'),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('test-socket-id'),
      );
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnection', () => {
      gateway.handleDisconnect(mockSocket);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Fan client disconnected'),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('test-socket-id'),
      );
    });
  });

  describe('notifyPaymentStatus', () => {
    it('should emit payment status to the correct room', () => {
      const fanSessionId = 'session-abc-123';
      const payload = {
        status: 'succeeded',
        depositId: 'deposit-123',
        transactionId: 'tx-456',
      };

      gateway.notifyPaymentStatus(fanSessionId, payload);

      // Verify correct room targeting
      expect(mockServer.to).toHaveBeenCalledWith('fan:session-abc-123');

      // Verify event emission with payload + timestamp
      expect(mockServer.emit).toHaveBeenCalledWith(
        'paymentStatus',
        expect.objectContaining({
          status: 'succeeded',
          depositId: 'deposit-123',
          transactionId: 'tx-456',
          timestamp: expect.any(String),
        }),
      );

      // Verify timestamp is ISO format
      const emittedPayload = mockServer.emit.mock.calls[0][1];
      expect(new Date(emittedPayload.timestamp).toISOString()).toBe(
        emittedPayload.timestamp,
      );
    });

    it('should include reason in payload when provided', () => {
      const fanSessionId = 'session-xyz';
      const payload = {
        status: 'failed',
        depositId: 'deposit-456',
        transactionId: 'tx-789',
        reason: 'INSUFFICIENT_FUNDS',
      };

      gateway.notifyPaymentStatus(fanSessionId, payload);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'paymentStatus',
        expect.objectContaining({
          status: 'failed',
          reason: 'INSUFFICIENT_FUNDS',
        }),
      );
    });

    it('should log the emission', () => {
      const fanSessionId = 'session-test';
      const payload = {
        status: 'pending',
        depositId: 'deposit-789',
        transactionId: 'tx-111',
      };

      gateway.notifyPaymentStatus(fanSessionId, payload);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Emitting paymentStatus'),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('fan:session-test'),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('pending'),
      );
    });
  });

  describe('notifyMessageDelivery', () => {
    it('should emit message delivery success to the correct room', () => {
      const fanSessionId = 'session-message-123';
      const payload = {
        status: 'delivered' as const,
        messageId: 'msg-999',
      };

      gateway.notifyMessageDelivery(fanSessionId, payload);

      // Verify correct room targeting
      expect(mockServer.to).toHaveBeenCalledWith('fan:session-message-123');

      // Verify event emission
      expect(mockServer.emit).toHaveBeenCalledWith(
        'messageDelivery',
        expect.objectContaining({
          status: 'delivered',
          messageId: 'msg-999',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should emit message delivery failure with error and refund info', () => {
      const fanSessionId = 'session-fail';
      const payload = {
        status: 'failed' as const,
        messageId: null,
        error: 'Unable to resolve channel',
        refunded: true,
      };

      gateway.notifyMessageDelivery(fanSessionId, payload);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'messageDelivery',
        expect.objectContaining({
          status: 'failed',
          messageId: null,
          error: 'Unable to resolve channel',
          refunded: true,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should log the emission', () => {
      const fanSessionId = 'session-log-test';
      const payload = {
        status: 'delivered' as const,
        messageId: 'msg-555',
      };

      gateway.notifyMessageDelivery(fanSessionId, payload);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Emitting messageDelivery'),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('fan:session-log-test'),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('delivered'),
      );
    });
  });

  describe('joinFanRoom', () => {
    it('should add client to room and send confirmation', () => {
      const fanSessionId = 'session-join-123';

      gateway.joinFanRoom(mockSocket, fanSessionId);

      // Verify client joined the room
      expect(mockSocket.join).toHaveBeenCalledWith('fan:session-join-123');

      // Verify confirmation was sent to client
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'roomJoined',
        expect.objectContaining({
          fanSessionId: 'session-join-123',
          timestamp: expect.any(String),
        }),
      );

      // Verify logging
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('joined room fan:session-join-123'),
      );
    });

    it('should strip "fan:" prefix if client accidentally includes it', () => {
      const fanSessionIdWithPrefix = 'fan:session-prefix-test';

      gateway.joinFanRoom(mockSocket, fanSessionIdWithPrefix);

      // Should join with single "fan:" prefix, not doubled
      expect(mockSocket.join).toHaveBeenCalledWith('fan:session-prefix-test');

      // Confirmation should have clean session ID
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'roomJoined',
        expect.objectContaining({
          fanSessionId: 'session-prefix-test',
        }),
      );
    });

    it('should handle multiple "fan:" prefixes', () => {
      const fanSessionIdMultiPrefix = 'fan:fan:session-double';

      gateway.joinFanRoom(mockSocket, fanSessionIdMultiPrefix);

      // Should still work correctly by stripping prefix
      expect(mockSocket.join).toHaveBeenCalledWith('fan:fan:session-double');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'roomJoined',
        expect.objectContaining({
          fanSessionId: 'fan:session-double',
        }),
      );
    });

    it('should include timestamp in room joined confirmation', () => {
      const fanSessionId = 'session-timestamp-test';

      gateway.joinFanRoom(mockSocket, fanSessionId);

      const confirmation = mockSocket.emit.mock.calls[0][1];
      expect(confirmation.timestamp).toBeDefined();

      // Verify it's a valid ISO timestamp
      expect(new Date(confirmation.timestamp).toISOString()).toBe(
        confirmation.timestamp,
      );
    });
  });
});
