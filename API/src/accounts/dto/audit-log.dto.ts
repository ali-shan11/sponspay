import { ApiProperty } from '@nestjs/swagger';
import { AuditEventType } from '../entities/account-audit-log.entity';

export class AuditLogDto {
  @ApiProperty({
    description: 'Unique identifier for the audit log entry',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Account ID associated with this audit event',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  accountId: string;

  @ApiProperty({
    description: 'User ID who performed the action (if available)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  userId?: string;

  @ApiProperty({
    description: 'Type of audit event',
    enum: AuditEventType,
    example: AuditEventType.ACCOUNT_CREATED,
  })
  action: AuditEventType;

  @ApiProperty({
    description: 'Human-readable description of the event',
    example:
      'Account created with phone +12***567 for provider MTN Mobile Money',
  })
  description: string;

  @ApiProperty({
    description: 'Additional structured details about the event',
    type: 'object',
    additionalProperties: true,
    nullable: true,
    example: {
      phoneNumber: '+12***567',
      providerName: 'MTN Mobile Money',
    },
  })
  details?: Record<string, any>;

  @ApiProperty({
    description: 'Additional metadata about the event',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'IP address from which the action was performed',
    example: '192.168.1.1',
    nullable: true,
  })
  ipAddress?: string;

  @ApiProperty({
    description: 'User agent of the client that performed the action',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    nullable: true,
  })
  userAgent?: string;

  @ApiProperty({
    description: 'Timestamp when the event occurred',
    example: '2023-12-01T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User information (if available)',
    type: 'object',
    additionalProperties: true,
    nullable: true,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      firebaseUid: 'firebase-uid-123',
    },
  })
  user?: {
    id: string;
    firebaseUid: string;
  };
}

export class AuditLogListDto {
  @ApiProperty({
    description: 'List of audit log entries',
    type: [AuditLogDto],
  })
  logs: AuditLogDto[];

  @ApiProperty({
    description: 'Total number of audit log entries',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number (1-based)',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 50,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;
}
