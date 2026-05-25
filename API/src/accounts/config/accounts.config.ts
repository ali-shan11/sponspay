import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AccountsConfig {
  constructor(private readonly configService: ConfigService) {}

  get codeValidityMs(): number {
    return this.configService.get<number>(
      'VERIFICATION_CODE_VALIDITY_MS',
      300000,
    ); // 5 minutes default
  }

  get resendCooldownMs(): number {
    return this.configService.get<number>(
      'VERIFICATION_RESEND_COOLDOWN_MS',
      20000,
    ); // 20 seconds default
  }

  get maxFailedAttempts(): number {
    return this.configService.get<number>('VERIFICATION_MAX_ATTEMPTS', 3); // 3 attempts default
  }
}
