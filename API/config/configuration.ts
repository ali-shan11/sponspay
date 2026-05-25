import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { CustomTypeOrmLogger } from '../src/config/typeorm-logger';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_NAME'),
      autoLoadEntities: true,
      synchronize: this.configService.get<boolean>('DB_SYNC'),
      cache: this.configService.get<string>('NODE_ENV') !== 'test',
      // Use custom logger for all environments except test
      // Queries are logged at 'verbose' level (won't show in debug mode)
      logger:
        this.configService.get<string>('NODE_ENV') === 'test'
          ? undefined
          : new CustomTypeOrmLogger(),
      logging:
        this.configService.get<string>('NODE_ENV') === 'test'
          ? ['error', 'warn']
          : false, // Custom logger handles all logging
      // Log queries that take longer than this threshold (in milliseconds)
      // Can be configured via MAX_QUERY_EXECUTION_TIME env var, defaults to 1000ms (1 second)
      maxQueryExecutionTime: this.configService.get<number>(
        'MAX_QUERY_EXECUTION_TIME',
        1000,
      ),
    };
  }
}
