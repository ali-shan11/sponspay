import { Logger as NestLogger } from '@nestjs/common';
import { Logger as TypeOrmLogger, QueryRunner } from 'typeorm';

/**
 * Custom TypeORM logger that integrates with NestJS logging system.
 * Maps database operations to appropriate NestJS log levels:
 * - Queries → verbose (won't show in debug mode)
 * - Errors → error
 * - Warnings → warn
 * - Schema operations → log
 * - Slow queries → warn
 *
 * Note: The queryRunner parameter is required by TypeORM's Logger interface
 * but not used in this implementation, hence the eslint-disable below.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export class CustomTypeOrmLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger('TypeORM');

  /**
   * Logs query and parameters used in it.
   */
  logQuery(query: string, parameters?: any[], _queryRunner?: QueryRunner) {
    // Skip logging health check queries to reduce noise
    if (this.isHealthCheckQuery(query)) {
      return;
    }

    if (parameters && parameters.length) {
      this.logger.verbose(
        `Query: ${query} -- Parameters: ${this.stringifyParameters(parameters)}`,
      );
    } else {
      this.logger.verbose(`Query: ${query}`);
    }
  }

  /**
   * Logs query that is failed.
   */
  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
    _queryRunner?: QueryRunner,
  ) {
    if (parameters && parameters.length) {
      this.logger.error(
        `Query failed: ${query} -- Parameters: ${this.stringifyParameters(parameters)} -- Error: ${error}`,
      );
    } else {
      this.logger.error(`Query failed: ${query} -- Error: ${error}`);
    }
  }

  /**
   * Logs query that is slow.
   */
  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    _queryRunner?: QueryRunner,
  ) {
    if (parameters && parameters.length) {
      this.logger.warn(
        `Slow query (${time}ms): ${query} -- Parameters: ${this.stringifyParameters(parameters)}`,
      );
    } else {
      this.logger.warn(`Slow query (${time}ms): ${query}`);
    }
  }

  /**
   * Logs events from the schema build process.
   */
  logSchemaBuild(message: string, _queryRunner?: QueryRunner) {
    this.logger.log(message);
  }

  /**
   * Logs events from the migration run process.
   */
  logMigration(message: string, _queryRunner?: QueryRunner) {
    this.logger.log(message);
  }

  /**
   * Perform logging using given logger, or by default to the console.
   * Log has its own level and message.
   */
  log(
    level: 'log' | 'info' | 'warn',
    message: any,
    _queryRunner?: QueryRunner,
  ) {
    switch (level) {
      case 'log':
      case 'info':
        this.logger.log(message);
        break;
      case 'warn':
        this.logger.warn(message);
        break;
      default:
        this.logger.log(message);
    }
  }

  /**
   * Helper to safely stringify query parameters
   */
  private stringifyParameters(parameters: any[]): string {
    try {
      return JSON.stringify(parameters);
    } catch {
      return String(parameters);
    }
  }

  /**
   * Check if query is a health check query that should be suppressed
   */
  private isHealthCheckQuery(query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery === 'select 1';
  }
}
