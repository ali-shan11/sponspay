import { UserRole } from '../../creator/enums/user.enum';

export interface AuthUser extends Express.User {
  user_id: string;
  role?: UserRole; // Populated by RolesGuard after DB lookup
}
