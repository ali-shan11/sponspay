import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Terms } from './entities/terms.entity';

@Injectable()
export class TermsService {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    return this.dataSource.getRepository(Terms);
  }

  async getLatest(): Promise<Terms | null> {
    const [latest] = await this.repository.find({
      order: { version: 'desc' },
      take: 1,
    });
    return latest || null;
  }

  async create(html: string): Promise<Terms> {
    const latest = await this.getLatest();
    const version = latest ? latest.version + 1 : 1;
    const terms = this.repository.create({ html, version });
    return this.repository.save(terms);
  }
}
