import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiExtension, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '../creator/enums/user.enum';

export const ROLE_KEY = 'role';

/**
 * Decorator that attaches a required role to a route handler and documents it in
 * the generated OpenAPI specification. The role is stored as metadata for
 * runtime checks by {@link RolesGuard} and exposed via the custom `x-roles`
 * extension so consumers can easily see which roles can access the endpoint.
 */
export const Role = (role: UserRole) =>
  applyDecorators(
    SetMetadata(ROLE_KEY, role),
    ApiExtension('x-roles', [role]),
    ApiOperation({ description: `Requires role: ${role} or higher` }),
  );
