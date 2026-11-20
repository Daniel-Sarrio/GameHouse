import { AuthRole, AuthUser } from '../../auth/auth.models';
/** Usuario completo de la administración (GET /api/users); la sesión solo expone `AuthUser`. */
export interface User extends AuthUser {
  roleId: number | null;
  profileId: string | null;
  isActive: boolean;
  deletedAt: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  role: AuthRole;
  status: string;
  avatarImageUrl: string | null;
}
