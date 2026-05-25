import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDevController } from './admin-dev.controller';
import { AdminDevService } from './admin-dev.service';
import { NonProdGuard } from './guards/non-prod.guard';
import { User } from '../creator/entities/user.entity';
import { UserChannel } from '../creator/entities/user-channel.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { Currency } from '../transaction/entities/currency.entity';
import { TransactionStatus } from '../transaction/entities/transaction-status.entity';
import { Account } from '../accounts/entities/account.entity';
import { PawapayModule } from '../pawapay/pawapay.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserChannel,
      Transaction,
      Currency,
      TransactionStatus,
      Account,
    ]),
    PawapayModule,
  ],
  controllers: [AdminDevController],
  providers: [AdminDevService, NonProdGuard],
})
export class AdminModule {}
