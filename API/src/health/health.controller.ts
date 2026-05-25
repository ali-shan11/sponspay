import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import {
  ApiSecurityProfile,
  ApiCommonResponses,
} from '../decorators/api-security-docs.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly telegramServiceUrl: string;

  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly http: HttpHealthIndicator,
    private readonly configService: ConfigService,
  ) {
    this.telegramServiceUrl = this.configService.get<string>(
      'TELEGRAM_SERVICE_URL',
      'http://telegram-service',
    );
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Simple liveness check — returns 200 if the process is running.',
  })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  live() {
    return { status: 'ok' };
  }

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'System health check',
    description:
      ApiSecurityProfile({
        auth: 'None',
        authLocation: 'N/A - Public endpoint',
        authorization: 'None - Publicly accessible',
        rateLimit: '60 requests per minute',
        dataSensitivity: 'Public',
        auditLogging: 'No',
        securityConsiderations: [
          'Public endpoint for monitoring',
          'Checks database, disk, and telegram-service health',
          'No sensitive information exposed',
          'Used by load balancers and monitoring systems',
        ],
        commonErrors: {
          '429': 'Rate limit exceeded - Maximum 60 requests per minute',
          '503': 'Service unhealthy - one or more checks failed',
        },
      }) +
      '\n\n' +
      'Performs system health checks including database connectivity and disk storage. Returns detailed status for each component.',
  })
  @ApiResponse({
    status: 200,
    description: 'System is healthy - all checks passed',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          storage: { status: 'up' },
          'telegram-service': { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          storage: { status: 'up' },
          'telegram-service': { status: 'up' },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'System is unhealthy - one or more checks failed',
    schema: {
      example: {
        status: 'error',
        info: {
          storage: { status: 'up' },
          'telegram-service': { status: 'up' },
        },
        error: {
          database: { status: 'down', message: 'Connection failed' },
        },
        details: {
          storage: { status: 'up' },
          'telegram-service': { status: 'up' },
          database: { status: 'down', message: 'Connection failed' },
        },
      },
    },
  })
  @ApiCommonResponses()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () =>
        this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.8 }),
      () =>
        this.http.pingCheck(
          'telegram-service',
          `${this.telegramServiceUrl}/health`,
          { timeout: 5000 },
        ),
    ]);
  }
}
