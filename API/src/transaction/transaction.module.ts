import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Transaction } from './entities/transaction.entity';
import { Currency } from './entities/currency.entity';
import { TransactionStatus } from './entities/transaction-status.entity';
import { TransactionFee } from './entities/transaction-fee.entity';
import { Payout } from './entities/payout.entity';
import { Country } from './entities/country.entity';
import { CountryPrice } from './entities/country-price.entity';
import { TransactionStatusSeeder } from './seed/transaction-status.seeder';
import { CurrencySeeder } from './seed/currency.seeder';
import { CountrySeeder } from './seed/country.seeder';
import { CountryPriceSeeder } from './seed/country-price.seeder';
import { CountryMarketDataSeeder } from './seed/country-market-data.seeder';
import { ExchangeRateService } from './services/exchange-rate.service';
import { CountryPriceService } from './services/country-price.service';
import { ExchangeRateDevController } from './exchange-rate-dev.controller';
import { PawapayModule } from '../pawapay/pawapay.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      Currency,
      TransactionStatus,
      TransactionFee,
      Payout,
      Country,
      CountryPrice,
    ]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    forwardRef(() => PawapayModule),
  ],
  controllers: [ExchangeRateDevController],
  providers: [
    TransactionStatusSeeder,
    CurrencySeeder,
    CountrySeeder,
    CountryPriceSeeder,
    CountryMarketDataSeeder,
    ExchangeRateService,
    CountryPriceService,
  ],
  exports: [TypeOrmModule, ExchangeRateService, CountryPriceService],
})
export class TransactionModule {}
