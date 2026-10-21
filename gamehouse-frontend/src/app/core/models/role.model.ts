export interface Rol {
  id: number;
  name: string;
}
export type DatosRol = Pick<Rol, 'name'>;
