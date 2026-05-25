import { Global, Module } from '@nestjs/common';
import { InfobipService } from './infobip.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsMessage } from './entities/sms-message.entity';

@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([SmsMessage])],
  providers: [InfobipService],
  exports: [InfobipService],
})
export class InfobipModule {}
