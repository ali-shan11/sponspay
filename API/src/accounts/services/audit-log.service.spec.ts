import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import {
  AccountAuditLog,
  AuditEventType,
} from '../entities/account-audit-log.entity';
import { User } from '../../creator/entities/user.entity';
import { Logger } from '@nestjs/common';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let auditLogRepo: jest.Mocked<Repository<AccountAuditLog>>;
  let userRepo: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: 'user-123',
    firebaseUid: 'firebase-uid-123',
  } as User;

  const mockAuditLog: AccountAuditLog = {
    id: 'audit-123',
    accountId: 'account-123',
    userId: 'user-123',
    action: AuditEventType.ACCOUNT_CREATED,
    description:
      'Account created with phone +12***567 for provider MTN Mobile Money',
    details: { phoneNumber: '+12***567', providerName: 'MTN Mobile Money' },
    metadata: undefined,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
    user: mockUser,
    account: {} as any,
  } as AccountAuditLog;

  beforeEach(async () => {
    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const mockAuditLogRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
    };

    const mockUserRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AccountAuditLog),
          useValue: mockAuditLogRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    auditLogRepo = module.get(getRepositoryToken(AccountAuditLog));
    userRepo = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logAccountEvent', () => {
    it('should create and save audit log with user context', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      auditLogRepo.create.mockReturnValue(mockAuditLog);
      auditLogRepo.save.mockResolvedValue(mockAuditLog);

      await service.logAccountEvent({
        action: AuditEventType.ACCOUNT_CREATED,
        description: 'Test account creation',
        accountId: 'account-123',
        context: {
          firebaseUid: 'firebase-uid-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      });

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { firebaseUid: 'firebase-uid-123' },
      });
      expect(auditLogRepo.create).toHaveBeenCalledWith({
        accountId: 'account-123',
        userId: 'user-123',
        action: AuditEventType.ACCOUNT_CREATED,
        description: 'Test account creation',
        details: undefined,
        metadata: undefined,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
      expect(auditLogRepo.save).toHaveBeenCalledWith(mockAuditLog);
    });

    it('should handle missing user gracefully', async () => {
      userRepo.findOne.mockResolvedValue(null);
      auditLogRepo.create.mockReturnValue(mockAuditLog);
      auditLogRepo.save.mockResolvedValue(mockAuditLog);

      await service.logAccountEvent({
        action: AuditEventType.ACCOUNT_CREATED,
        description: 'Test account creation',
        accountId: 'account-123',
        context: {
          firebaseUid: 'nonexistent-uid',
        },
      });

      expect(auditLogRepo.create).toHaveBeenCalledWith({
        accountId: 'account-123',
        userId: undefined,
        action: AuditEventType.ACCOUNT_CREATED,
        description: 'Test account creation',
        details: undefined,
        metadata: undefined,
        ipAddress: undefined,
        userAgent: undefined,
      });
    });

    it('should not throw error if audit logging fails', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      auditLogRepo.create.mockReturnValue(mockAuditLog);
      auditLogRepo.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.logAccountEvent({
          action: AuditEventType.ACCOUNT_CREATED,
          description: 'Test account creation',
          accountId: 'account-123',
        }),
      ).resolves.not.toThrow();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create audit log'),
      );
    });
  });

  describe('logAccountCreated', () => {
    it('should log account creation with masked phone number', async () => {
      const logEventSpy = jest
        .spyOn(service, 'logAccountEvent')
        .mockResolvedValue();

      await service.logAccountCreated(
        'account-123',
        '+1234567890',
        'MTN Mobile Money',
        { firebaseUid: 'firebase-uid-123' },
      );

      expect(logEventSpy).toHaveBeenCalledWith({
        action: AuditEventType.ACCOUNT_CREATED,
        description:
          'Account created with phone +12*****890 for provider MTN Mobile Money',
        accountId: 'account-123',
        details: {
          phoneNumber: '+12*****890',
          providerName: 'MTN Mobile Money',
        },
        context: { firebaseUid: 'firebase-uid-123' },
      });
    });
  });

  describe('logAccountUpdated', () => {
    it('should log account updates with change tracking', async () => {
      const logEventSpy = jest
        .spyOn(service, 'logAccountEvent')
        .mockResolvedValue();
      const changes = {
        fullName: { from: 'John Doe', to: 'Jane Smith' },
        nickname: { from: 'Old Nick', to: 'New Nick' },
      };

      await service.logAccountUpdated('account-123', changes);

      expect(logEventSpy).toHaveBeenCalledWith({
        action: AuditEventType.ACCOUNT_UPDATED,
        description:
          'Account updated: fullName: "John Doe" → "Jane Smith", nickname: "Old Nick" → "New Nick"',
        accountId: 'account-123',
        details: { changes },
        context: undefined,
      });
    });
  });

  describe('logVerificationAttempted', () => {
    it('should log successful verification', async () => {
      const logEventSpy = jest
        .spyOn(service, 'logAccountEvent')
        .mockResolvedValue();

      await service.logVerificationAttempted(
        'account-123',
        '+1234567890',
        true,
        undefined,
        { firebaseUid: 'firebase-uid-123' },
      );

      expect(logEventSpy).toHaveBeenCalledWith({
        action: AuditEventType.VERIFICATION_SUCCESS,
        description: 'Account verification successful for +12*****890',
        accountId: 'account-123',
        details: {
          phoneNumber: '+12*****890',
          success: true,
          remainingAttempts: undefined,
        },
        context: { firebaseUid: 'firebase-uid-123' },
      });
    });

    it('should log failed verification with remaining attempts', async () => {
      const logEventSpy = jest
        .spyOn(service, 'logAccountEvent')
        .mockResolvedValue();

      await service.logVerificationAttempted(
        'account-123',
        '+1234567890',
        false,
        2,
        { firebaseUid: 'firebase-uid-123' },
      );

      expect(logEventSpy).toHaveBeenCalledWith({
        action: AuditEventType.VERIFICATION_FAILED,
        description:
          'Account verification failed for +12*****890 (2 attempts remaining)',
        accountId: 'account-123',
        details: {
          phoneNumber: '+12*****890',
          success: false,
          remainingAttempts: 2,
        },
        context: { firebaseUid: 'firebase-uid-123' },
      });
    });
  });

  describe('getAccountAuditLogs', () => {
    it('should retrieve audit logs for an account', async () => {
      const mockLogs = [mockAuditLog];
      auditLogRepo.findAndCount.mockResolvedValue([mockLogs, 1]);

      const result = await service.getAccountAuditLogs('account-123', 50, 0);

      expect(auditLogRepo.findAndCount).toHaveBeenCalledWith({
        where: { accountId: 'account-123' },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual({ logs: mockLogs, total: 1 });
    });
  });

  describe('maskPhoneNumber', () => {
    it('should mask phone numbers correctly', () => {
      // Access private method for testing
      const maskPhoneNumber = (service as any).maskPhoneNumber.bind(service);

      expect(maskPhoneNumber('+1234567890')).toBe('+12*****890');
      expect(maskPhoneNumber('+123456')).toBe('+12*456');
      expect(maskPhoneNumber('+123')).toBe('+12123');
      expect(maskPhoneNumber('')).toBe('***');
    });
  });
});
