import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ApiKey as ApiKeyEntity } from './entities/api-key.entity';

@Injectable()
export class ApiKeyService {
  constructor(private dataSource: DataSource) {}

  async isApiKeyValid(apiKey: string) {
    const apiKeyResult = await this.dataSource
      .createQueryBuilder(ApiKeyEntity, 'apiKey')
      .where('apiKey.apiKey = :apiKey', { apiKey })
      .andWhere('apiKey.banned = false')
      .getOne();
    return apiKeyResult ? true : false;
  }
}
