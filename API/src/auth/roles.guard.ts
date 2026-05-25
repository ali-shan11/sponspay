import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from '../decorators/role.decorator';
import { UserRole } from '../creator/enums/user.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../creator/entities/user.entity';

const ROLE_PRIORITY: Record<UserRole, number> = {
  [UserRole.Fan]: 0,
  [UserRole.Creator]: 1,
  [UserRole.Admin]: 2,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<UserRole>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRole) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const authUser = request.user;
    if (!authUser) {
      throw new ForbiddenException('Insufficient role');
    }
    const firebaseUid: string | undefined = authUser.uid ?? authUser.user_id;
    if (!firebaseUid) {
      throw new ForbiddenException('Insufficient role');
    }

    const user = await this.userRepository.findOne({
      where: { firebaseUid },
      select: { role: true },
    });
    const userRole = user?.role;
    if (!userRole) {
      throw new ForbiddenException('Insufficient role');
    }

    // Preserve backwards compatibility by attaching the role to the request
    authUser.role = userRole;

    if (ROLE_PRIORITY[userRole] >= ROLE_PRIORITY[requiredRole]) {
      return true;
    }
    throw new ForbiddenException('Insufficient role');
  }
}
