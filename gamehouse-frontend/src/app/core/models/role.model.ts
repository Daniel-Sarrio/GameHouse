export const NOMBRES_ROL = ['USER', 'ADMIN', 'HOST'] as const;

export interface Rol {
  id: number;
  name: typeof NOMBRES_ROL[number];
  deletedAt: string | null;
}
export type DatosRol = Pick<Rol, 'name'>;
