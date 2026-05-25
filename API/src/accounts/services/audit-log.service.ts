import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccountAuditLog,
  AuditEventType,
} from '../entities/account-audit-log.entity';
import { User } from '../../creator/entities/user.entity';

export interface AuditLogContext {
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  firebaseUid?: string;
}

export interface AuditLogDetails {
  action: AuditEventType;
  description: string;
  accountId: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  context?: AuditLogContext;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AccountAuditLog)
    private readonly auditLogRepo: Repository<AccountAuditLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async logAccountEvent(details: AuditLogDetails): Promise<void> {
    try {
      let user: User | undefined;

      // Try to find user by firebaseUid first, then by userId
      if (details.context?.firebaseUid) {
        user =
          (await this.userRepo.findOne({
            where: { firebaseUid: details.context.firebaseUid },
          })) || undefined;
      } else if (details.context?.userId) {
        user =
          (await this.userRepo.findOne({
            where: { id: details.context.userId },
          })) || undefined;
      }

      const auditLog = this.auditLogRepo.create({
        accountId: details.accountId,
        userId: user?.id,
        action: details.action,
        description: details.description,
        details: details.details,
        metadata: details.metadata,
        ipAddress: details.context?.ipAddress,
        userAgent: details.context?.userAgent,
      });

      await this.auditLogRepo.save(auditLog);

      // Also log to console for immediate visibility
      this.logger.log(
        `AUDIT: ${details.action} - ${details.description} (Account: ${details.accountId}, User: ${user?.firebaseUid || 'unknown'})`,
      );
    } catch (error) {
      // Don't let audit logging failures break the main flow
      this.logger.error(
        `Failed to create audit log for ${details.action}: ${
          (error as Error)?.message || error
        }`,
      );
    }
  }

  async logAccountCreated(
    accountId: string,
    phoneNumber: string,
    providerName: string,
    context?: AuditLogContext,
  ): Promise<void> {
    await this.logAccountEvent({
      action: AuditEventType.ACCOUNT_CREATED,
      description: `Account created with phone ${this.maskPhoneNumber(phoneNumber)} for provider ${providerName}`,
      accountId,
      details: {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        providerName,
      },
      context,
    });
  }

  async logAccountUpdated(
    accountId: string,
    changes: Record<string, { from: any; to: any }>,
    context?: AuditLogContext,
  ): Promise<void> {
    const changeDescriptions = Object.entries(changes)
      .map(([field, change]) => `${field}: "${change.from}" → "${change.to}"`)
      .join(', ');

    await this.logAccountEvent({
      action: AuditEventType.ACCOUNT_UPDATED,
      description: `Account updated: ${changeDescriptions}`,
      accountId,
      details: { changes },
      context,
    });
  }

  async logAccountDeleted(
    accountId: string,
    phoneNumber: string,
    context?: AuditLogContext,
  ): Promise<void> {
    await this.logAccountEvent({
      action: AuditEventType.ACCOUNT_DELETED,
      description: `Account soft deleted for phone ${this.maskPhoneNumber(phoneNumber)}`,
      accountId,
      details: {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
      },
      context,
    });
  }

  async logAccountRestored(
    accountId: string,
    phoneNumber: string,
    context?: AuditLogContext,
  ): Promise<void> {
    await this.logAccountEvent({
      action: AuditEventType.ACCOUNT_RESTORED,
      description: `Deleted account restored for phone ${this.maskPhoneNumber(phoneNumber)}`,
      accountId,
      details: {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
      },
      context,
    });
  }

  async logAccountAnonymized(
    accountId: string,
    originalPhoneNumber: string,
    anonymizedPhoneNumber: string,
    context?: AuditLogContext,
  ): Promise<void> {
    await this.logAccountEvent({
      action: AuditEventType.ACCOUNT_ANONYMIZED,
      description: `Account anonymized: phone number changed from ${this.maskPhoneNumber(originalPhoneNumber)} to ${anonymizedPhoneNumber}`,
      accountId,
      details: {
        originalPhoneNumber: this.maskPhoneNumber(originalPhoneNumber),
        anonymizedPhoneNumber,
      },
      context,
    });
  }

  async logAccountTakeover(
    accountId: string,
    phoneNumber: string,
    fromFirebaseUid: string,
    toFirebaseUid: string,
    context?: AuditLogContext,
  ): Promise<void> {
    await this.logAccountEvent({
      action: AuditEventType.ACCOUNT_TAKEOVER,
      description: `Unverified account taken over for phone ${this.maskPhoneNumber(phoneNumber)}`,
      accountId,
      details: {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        fromFirebaseUid,
        toFirebaseUid,
      },
      context,
    });
  }

  async logVerificationSent(
    accountId: string,
    phoneNumber: string,
    verificationId: string,
    context?: AuditLogContext,
  ): Promise<void> {
    await this.logAccountEvent({
      action: AuditEventType.VERIFICATION_SENT,
      description: `Verification SMS sent to ${this.maskPhoneNumber(phoneNumber)}`,
      accountId,
      details: {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        verificationId,
      },
      context,
    });
  }

  async logVerificationAttempted(
    accountId: string,
    phoneNumber: string,
    success: boolean,
    remainingAttempts?: number,
    context?: AuditLogContext,
  ): Promise<void> {
    const action = success
      ? AuditEventType.VERIFICATION_SUCCESS
      : AuditEventType.VERIFICATION_FAILED;

    const description = success
      ? `Account verification successful for ${this.maskPhoneNumber(phoneNumber)}`
      : `Account verification failed for ${this.maskPhoneNumber(phoneNumber)}${
          remainingAttempts !== undefined
            ? ` (${remainingAttempts} attempts remaining)`
            : ''
        }`;

    await this.logAccountEvent({
      action,
      description,
      accountId,
      details: {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        success,
        remainingAttempts,
      },
      context,
    });
  }

  async logVerificationExpired(
    accountId: string,
    phoneNumber: string,
    context?: AuditLogContext,
  ): Promise<void> {
    await this.logAccountEvent({
      action: AuditEventType.VERIFICATION_EXPIRED,
      description: `Verification code expired for ${this.maskPhoneNumber(phoneNumber)}`,
      accountId,
      details: {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
      },
      context,
    });
  }

  async logVerificationResent(
    accountId: string,
    phoneNumber: string,
    verificationId: string,
    context?: AuditLogContext,
  ): Promise<void> {
    await this.logAccountEvent({
      action: AuditEventType.VERIFICATION_RESENT,
      description: `Verification SMS resent to ${this.maskPhoneNumber(phoneNumber)}`,
      accountId,
      details: {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        verificationId,
      },
      context,
    });
  }

  async getAccountAuditLogs(
    accountId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ logs: AccountAuditLog[]; total: number }> {
    const [logs, total] = await this.auditLogRepo.findAndCount({
      where: { accountId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { logs, total };
  }

  async getUserAuditLogs(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ logs: AccountAuditLog[]; total: number }> {
    const [logs, total] = await this.auditLogRepo.findAndCount({
      where: { userId },
      relations: ['account', 'user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { logs, total };
  }

  private maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length < 4) {
      return '***';
    }

    // Show first 3 and last 3 characters, mask the middle
    const start = phoneNumber.substring(0, 3);
    const end = phoneNumber.substring(phoneNumber.length - 3);
    const middle = '*'.repeat(Math.max(0, phoneNumber.length - 6));

    return `${start}${middle}${end}`;
  }
}
