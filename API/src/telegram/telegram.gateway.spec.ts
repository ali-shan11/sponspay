import { Test, TestingModule } from '@nestjs/testing';
import { TelegramGateway } from './telegram.gateway';
import { Server, Socket } from 'socket.io';

describe('TelegramGateway', () => {
  let gateway: TelegramGateway;
  let mockServer: Partial<Server>;
  let mockSocket: Partial<Socket>;

  beforeEach(async () => {
    // Mock Socket.IO server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Mock Socket.IO client
    mockSocket = {
      id: 'test-socket-id',
      join: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramGateway],
    }).compile();

    gateway = module.get<TelegramGateway>(TelegramGateway);
    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should log when a client connects', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      gateway.handleConnection(mockSocket as Socket);
      expect(logSpy).toHaveBeenCalledWith('Client connected: test-socket-id');
    });
  });

  describe('handleDisconnect', () => {
    it('should log when a client disconnects', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      gateway.handleDisconnect(mockSocket as Socket);
      expect(logSpy).toHaveBeenCalledWith(
        'Client disconnected: test-socket-id',
      );
    });
  });

  describe('notifyCoAdminAdded', () => {
    it('should emit coAdminAdded event to correct room', () => {
      const firebaseUid = 'test-firebase-uid-123';
      const channelHandle = 'testchannel';

      gateway.notifyCoAdminAdded(firebaseUid, channelHandle);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${firebaseUid}`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'coAdminAdded',
        expect.objectContaining({
          channelHandle,
          status: 'success',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should include timestamp in ISO format', () => {
      const firebaseUid = 'test-firebase-uid-123';
      const channelHandle = 'testchannel';

      gateway.notifyCoAdminAdded(firebaseUid, channelHandle);

      const emitCall = (mockServer.emit as jest.Mock).mock.calls[0];
      const payload = emitCall[1];

      expect(payload.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });

  describe('joinUserRoom', () => {
    it('should join room with correct format when UID is provided without prefix', () => {
      const firebaseUid = 'test-firebase-uid-123';
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.joinUserRoom(mockSocket as Socket, firebaseUid);

      expect(mockSocket.join).toHaveBeenCalledWith(`user:${firebaseUid}`);
      expect(logSpy).toHaveBeenCalledWith(
        `Client ${mockSocket.id} joined room user:${firebaseUid}`,
      );
    });

    it('should strip "user:" prefix if client accidentally includes it', () => {
      const firebaseUid = 'user:test-firebase-uid-123';
      const expectedRoom = 'user:test-firebase-uid-123';
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.joinUserRoom(mockSocket as Socket, firebaseUid);

      // Should join the correct room (not user:user:test-firebase-uid-123)
      expect(mockSocket.join).toHaveBeenCalledWith(expectedRoom);
      expect(logSpy).toHaveBeenCalledWith(
        `Client ${mockSocket.id} joined room ${expectedRoom}`,
      );
    });

    it('should handle multiple "user:" prefixes correctly', () => {
      const firebaseUid = 'user:user:test-firebase-uid-123';
      const expectedRoom = 'user:user:test-firebase-uid-123';

      gateway.joinUserRoom(mockSocket as Socket, firebaseUid);

      // Should only strip the first "user:" prefix
      expect(mockSocket.join).toHaveBeenCalledWith(expectedRoom);
    });

    it('should handle UID that contains "user:" in the middle', () => {
      const firebaseUid = 'test-user:firebase-uid';
      const expectedRoom = 'user:test-user:firebase-uid';

      gateway.joinUserRoom(mockSocket as Socket, firebaseUid);

      // Should not strip "user:" when it's not at the beginning
      expect(mockSocket.join).toHaveBeenCalledWith(expectedRoom);
    });
  });
});
