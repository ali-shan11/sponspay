import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { Account } from './entities/account.entity';
import { User } from '../creator/entities/user.entity';
import { AccountVerification } from './entities/account-verification.entity';
import { AccountAuditLog } from './entities/account-audit-log.entity';
import { InfobipModule } from '../infobip/infobip.module';
import { PawapayModule } from '../pawapay/pawapay.module';
import { AccountsConfig } from './config/accounts.config';
import { AuditLogService } from './services/audit-log.service';
import { RequestContextMiddleware } from './middleware/request-context.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      User,
      AccountVerification,
      AccountAuditLog,
    ]),
    InfobipModule,
    PawapayModule,
  ],
  controllers: [AccountsController],
  providers: [AccountsService, AccountsConfig, AuditLogService],
  exports: [TypeOrmModule, AuditLogService],
})
export class AccountsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes(AccountsController);
  }
}
