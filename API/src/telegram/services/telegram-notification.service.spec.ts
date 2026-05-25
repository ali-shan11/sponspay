import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { TelegramNotificationService } from './telegram-notification.service';
import { TelegramGateway } from '../telegram.gateway';
import { FanGateway } from '../../fan/fan.gateway';
import { MailService } from '../../mail/mail.service';
import { TelegramConfig } from '../config/telegram.config';
import { TelegramChannel } from '../../creator/entities/telegram-channel.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';

describe('TelegramNotificationService', () => {
  let service: TelegramNotificationService;
  let mockTelegramGateway: jest.Mocked<TelegramGateway>;
  let mockFanGateway: jest.Mocked<FanGateway>;
  let mockMailService: jest.Mocked<MailService>;
  let mockTelegramConfig: jest.Mocked<TelegramConfig>;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockTelegramGateway = {
      notifyCoAdminAdded: jest.fn(),
    } as any;

    mockFanGateway = {
      notifyMessageDelivery: jest.fn(),
    } as any;

    mockMailService = {
      sendEmail: jest.fn(),
    } as any;

    mockTelegramConfig = {
      managementEmail: 'admin@example.com',
      fromEmail: 'noreply@example.com',
      maxRetryAttempts: 3,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramNotificationService,
        { provide: TelegramGateway, useValue: mockTelegramGateway },
        { provide: FanGateway, useValue: mockFanGateway },
        { provide: MailService, useValue: mockMailService },
        { provide: TelegramConfig, useValue: mockTelegramConfig },
      ],
    }).compile();

    service = module.get<TelegramNotificationService>(
      TelegramNotificationService,
    );

    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyCoAdminAdded', () => {
    it('should call TelegramGateway.notifyCoAdminAdded successfully', () => {
      const firebaseUid = 'user123';
      const channelHandle = 'test_channel';

      service.notifyCoAdminAdded(firebaseUid, channelHandle);

      expect(mockTelegramGateway.notifyCoAdminAdded).toHaveBeenCalledWith(
        firebaseUid,
        channelHandle,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `WebSocket notification sent to user ${firebaseUid} for channel ${channelHandle}`,
      );
    });

    it('should log error if WebSocket notification fails but not throw', () => {
      const firebaseUid = 'user123';
      const channelHandle = 'test_channel';
      const error = new Error('WebSocket error');

      mockTelegramGateway.notifyCoAdminAdded.mockImplementation(() => {
        throw error;
      });

      expect(() =>
        service.notifyCoAdminAdded(firebaseUid, channelHandle),
      ).not.toThrow();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to send WebSocket notification:',
        'WebSocket error',
      );
    });
  });

  describe('sendPromotionFailureAlert', () => {
    const mockChannel: TelegramChannel = {
      id: 1,
      channelHandle: 'test_channel',
      channelId: '123456',
      joinedUserId: 'telegram_user_123',
      promotionAttempts: 3,
      creator: {
        firebaseUid: 'firebase_uid_123',
      },
    } as any;

    const userId = 'telegram_user_456';
    const error = 'Promotion failed: insufficient permissions';

    it('should send management alert email successfully', async () => {
      await service.sendPromotionFailureAlert(mockChannel, userId, error);

      expect(mockMailService.sendEmail).toHaveBeenCalledWith({
        to: 'admin@example.com',
        from: 'noreply@example.com',
        subject:
          '⚠️ Telegram Co-Admin Promotion Failed - Manual Intervention Required',
        html: expect.stringContaining('test_channel'),
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Management alert sent'),
      );
    });

    it('should include all channel details in email', async () => {
      await service.sendPromotionFailureAlert(mockChannel, userId, error);

      const emailCall = mockMailService.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('test_channel');
      expect(emailCall.html).toContain('123456');
      expect(emailCall.html).toContain('telegram_user_456');
      expect(emailCall.html).toContain('3 / 3');
      expect(emailCall.html).toContain(
        'Promotion failed: insufficient permissions',
      );
    });

    it('should skip sending email if management email not configured', async () => {
      Object.defineProperty(mockTelegramConfig, 'managementEmail', {
        get: () => undefined,
        configurable: true,
      });

      await service.sendPromotionFailureAlert(mockChannel, userId, error);

      expect(mockMailService.sendEmail).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Management email or from email not configured. Skipping alert email.',
      );
    });

    it('should skip sending email if from email not configured', async () => {
      Object.defineProperty(mockTelegramConfig, 'fromEmail', {
        get: () => undefined,
        configurable: true,
      });

      await service.sendPromotionFailureAlert(mockChannel, userId, error);

      expect(mockMailService.sendEmail).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Management email or from email not configured. Skipping alert email.',
      );
    });

    it('should log error if email sending fails but not throw', async () => {
      const mailError = new Error('SMTP error');
      mockMailService.sendEmail.mockRejectedValue(mailError);

      await expect(
        service.sendPromotionFailureAlert(mockChannel, userId, error),
      ).resolves.not.toThrow();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error sending management alert email:',
        'SMTP error',
      );
    });
  });

  describe('notifyMessageDelivery', () => {
    const fanSessionId = 'session_123';

    it('should notify fan of successful delivery', () => {
      const payload = {
        status: 'delivered' as const,
        messageId: 'msg_456',
      };

      service.notifyMessageDelivery(fanSessionId, payload);

      expect(mockFanGateway.notifyMessageDelivery).toHaveBeenCalledWith(
        fanSessionId,
        payload,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Fan notification sent for session ${fanSessionId}: message delivered`,
      );
    });

    it('should notify fan of failed delivery with refund', () => {
      const payload = {
        status: 'failed' as const,
        messageId: null,
        error: 'Channel unavailable',
        refunded: true,
      };

      service.notifyMessageDelivery(fanSessionId, payload);

      expect(mockFanGateway.notifyMessageDelivery).toHaveBeenCalledWith(
        fanSessionId,
        payload,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Fan notification sent for session ${fanSessionId}: message failed`,
      );
    });

    it('should log error if WebSocket notification fails but not throw', () => {
      const payload = {
        status: 'delivered' as const,
        messageId: 'msg_456',
      };
      const error = new Error('WebSocket error');

      mockFanGateway.notifyMessageDelivery.mockImplementation(() => {
        throw error;
      });

      expect(() =>
        service.notifyMessageDelivery(fanSessionId, payload),
      ).not.toThrow();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to send WebSocket notification to fan:',
        'WebSocket error',
      );
    });
  });

  describe('sendMessageDeliveryFailureAlert', () => {
    const mockTransaction: Transaction = {
      id: 'txn_123',
      depositId: 'deposit_456',
      fanSessionId: 'session_789',
      amount: '10.00',
      currency: { shortCode: 'USD' },
      payerFullName: 'John Doe',
      messageContent: 'Great content!',
      messageDeliveryAttempts: 3,
    } as any;

    const error = 'Message delivery failed: bot removed from channel';

    it('should send management alert email successfully', async () => {
      await service.sendMessageDeliveryFailureAlert(mockTransaction, error);

      expect(mockMailService.sendEmail).toHaveBeenCalledWith({
        to: 'admin@example.com',
        from: 'noreply@example.com',
        subject: '⚠️ Telegram Message Delivery Failed - Transaction txn_123',
        html: expect.stringContaining('txn_123'),
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Message delivery failure alert sent for transaction txn_123',
      );
    });

    it('should include all transaction details in email', async () => {
      await service.sendMessageDeliveryFailureAlert(mockTransaction, error);

      const emailCall = mockMailService.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('txn_123');
      expect(emailCall.html).toContain('deposit_456');
      expect(emailCall.html).toContain('session_789');
      expect(emailCall.html).toContain('10.00 USD');
      expect(emailCall.html).toContain('John Doe');
      expect(emailCall.html).toContain('Great content!');
      expect(emailCall.html).toContain('3 / 3');
      expect(emailCall.html).toContain(
        'Message delivery failed: bot removed from channel',
      );
    });

    it('should skip sending email if management email not configured', async () => {
      Object.defineProperty(mockTelegramConfig, 'managementEmail', {
        get: () => undefined,
        configurable: true,
      });

      await service.sendMessageDeliveryFailureAlert(mockTransaction, error);

      expect(mockMailService.sendEmail).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Management email not configured',
      );
    });

    it('should skip sending email if from email not configured', async () => {
      Object.defineProperty(mockTelegramConfig, 'fromEmail', {
        get: () => undefined,
        configurable: true,
      });

      await service.sendMessageDeliveryFailureAlert(mockTransaction, error);

      expect(mockMailService.sendEmail).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Management email not configured',
      );
    });

    it('should log error if email sending fails but not throw', async () => {
      const mailError = new Error('SMTP error');
      mockMailService.sendEmail.mockRejectedValue(mailError);

      await expect(
        service.sendMessageDeliveryFailureAlert(mockTransaction, error),
      ).resolves.not.toThrow();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to send message delivery failure alert:',
        'SMTP error',
      );
    });
  });
});
