import { AuthRole, AuthUser } from '../../auth/auth.models';
export type User = AuthUser;
export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  role: AuthRole;
  status: string;
  avatarImageUrl: string | null;
}
