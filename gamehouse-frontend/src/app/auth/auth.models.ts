export type AuthRole = 'USER' | 'ADMIN';

/**
 * Lo único que el cliente sabe del usuario autenticado. Los tokens viven en cookies HttpOnly
 * que JavaScript no puede leer: el cliente no conoce tokens, caducidades ni datos internos.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: AuthRole;
  avatarUrl: string | null;
}

export interface AuthSession {
  user: AuthUser;
}
export interface LoginCredentials {
  email: string;
  password: string;
}
