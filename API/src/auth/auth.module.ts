import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JWTStrategy } from './jwt.strategy';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { RolesGuard } from './roles.guard';
import { ApiKeyGuard } from './api-key.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../creator/entities/user.entity';

@Module({
  imports: [PassportModule, TypeOrmModule.forFeature([User])],
  providers: [ApiKeyGuard, JWTStrategy, FirebaseAuthGuard, RolesGuard],
  exports: [ApiKeyGuard, JWTStrategy, FirebaseAuthGuard, RolesGuard],
})
export class AuthModule {}
