import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TransactionStatus } from '../entities/transaction-status.entity';

type StatusSeed = { code: string; name: string };

const DEFAULT_STATUSES: StatusSeed[] = [
  { code: 'pending', name: 'Pending' },
  { code: 'processing', name: 'Processing' },
  { code: 'succeeded', name: 'Succeeded' },
  { code: 'failed', name: 'Failed' },
  { code: 'rejected', name: 'Rejected' },
  { code: 'canceled', name: 'Canceled' },
  { code: 'refunded', name: 'Refunded' },
];

@Injectable()
export class TransactionStatusSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(TransactionStatusSeeder.name);

  constructor(
    @InjectRepository(TransactionStatus)
    private readonly statusRepo: Repository<TransactionStatus>,
  ) {}

  async onApplicationBootstrap() {
    try {
      const desiredCodes = DEFAULT_STATUSES.map((s) => s.code);

      const existing = await this.statusRepo.find({
        where: { code: In(desiredCodes) },
        select: ['code'],
      });

      const existingCodes = new Set(existing.map((e) => e.code));
      const missing = DEFAULT_STATUSES.filter(
        (s) => !existingCodes.has(s.code),
      );

      if (missing.length === 0) {
        this.logger.log('Transaction statuses already seeded.');
        return;
      }

      await this.statusRepo.save(missing.map((m) => this.statusRepo.create(m)));

      this.logger.log(
        `Seeded ${missing.length} transaction statuses: ${missing
          .map((m) => m.code)
          .join(', ')}`,
      );
    } catch (error) {
      this.logger.error('Transaction status seeding failed', error as any);
    }
  }
}
