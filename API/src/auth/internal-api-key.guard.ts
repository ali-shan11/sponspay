import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Guard for internal service-to-service communication.
 * Validates Bearer token against INTERNAL_API_KEY env var.
 * Used by the Telegram adapter service webhook endpoint.
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('INTERNAL_API_KEY', '');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    return !!token && token === this.apiKey;
  }
}
