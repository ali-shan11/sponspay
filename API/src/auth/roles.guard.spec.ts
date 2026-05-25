import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../creator/enums/user.enum';
import { Repository } from 'typeorm';
import { User } from '../creator/entities/user.entity';

describe('RolesGuard', () => {
  const reflector = new Reflector();
  let guard: RolesGuard;
  let userRepository: jest.Mocked<Pick<Repository<User>, 'findOne'>>;

  const getContext = (uid?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: uid ? { user_id: uid } : undefined }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Pick<Repository<User>, 'findOne'>>;
    guard = new RolesGuard(
      reflector,
      userRepository as unknown as Repository<User>,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows access when no role metadata', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(undefined);
    await expect(guard.canActivate(getContext())).resolves.toBe(true);
    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('allows admin for creator role', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(UserRole.Creator);
    userRepository.findOne.mockResolvedValueOnce({
      role: UserRole.Admin,
    } as User);
    await expect(guard.canActivate(getContext('uid123'))).resolves.toBe(true);
  });

  it('denies access for insufficient role', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(UserRole.Admin);
    userRepository.findOne.mockResolvedValueOnce({
      role: UserRole.Creator,
    } as User);
    await expect(guard.canActivate(getContext('uid123'))).rejects.toThrow();
  });
});
