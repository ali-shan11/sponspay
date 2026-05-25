import { Module } from '@nestjs/common';
import { TermsService } from './terms.service';
import { TermsController } from './terms.controller';
import { TermsSeeder } from './terms.seeder';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Terms } from './entities/terms.entity';
import { User } from '../creator/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Terms, User])],
  providers: [TermsService, TermsSeeder],
  controllers: [TermsController],
})
export class TermsModule {}
