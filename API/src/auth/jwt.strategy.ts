import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-firebase-jwt';
import { FirebaseAdminService } from 'src/firebase/firebase-admin.service';

@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy, 'firebase-jwt') {
  constructor(private firebaseAdminService: FirebaseAdminService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  validate(token: string) {
    return this.firebaseAdminService.verifyIdToken(token);
  }
}
