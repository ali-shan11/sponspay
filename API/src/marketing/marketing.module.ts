import { Module } from '@nestjs/common';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactUs } from './entities/contact-us.entity';
import { News } from './entities/news.entity';
import { Country } from '../transaction/entities/country.entity';
import { User } from '../creator/entities/user.entity';
import { ZohoModule } from '../zoho/zoho.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactUs, News, Country, User]),
    ZohoModule,
  ],
  controllers: [MarketingController],
  providers: [MarketingService],
})
export class MarketingModule {}
