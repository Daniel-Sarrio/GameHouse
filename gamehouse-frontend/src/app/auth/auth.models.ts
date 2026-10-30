export type AuthRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: AuthRole;
  roleId: number | null;
  profileId: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  deletedAt: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}
export interface LoginCredentials {
  email: string;
  password: string;
}
