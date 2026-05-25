import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NonProdGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    void context; // prevent unused var lint error
    const env = this.configService.get<string>('NODE_ENV');
    if (env === 'production') {
      throw new ForbiddenException(
        'This endpoint is disabled in production environments.',
      );
    }
    return true;
  }
}
