import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyService } from '../api-key/api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly allowedDomains: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly apiKeyService: ApiKeyService,
  ) {
    const raw =
      this.configService.get<string>('API_KEY_ALLOWED_DOMAINS') || '[]';
    try {
      const parsed = JSON.parse(raw);
      this.allowedDomains = Array.isArray(parsed) ? parsed : [raw];
    } catch {
      this.allowedDomains = raw
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const origin = request.headers['origin'];

    if (origin && this.allowedDomains.includes(origin)) {
      return true;
    }

    const apiKey = request.headers['api-key'];
    if (apiKey && (await this.apiKeyService.isApiKeyValid(apiKey))) {
      return true;
    }

    throw new UnauthorizedException(
      'Missing or invalid authentication: provide a valid Origin or API key',
    );
  }
}
