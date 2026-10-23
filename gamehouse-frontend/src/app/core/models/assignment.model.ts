export interface Asignacion {
  experienceId: number;
  categoryId: number;
  experienceName: string;
  categoryName: string;
}
export type DatosAsignacion = Pick<Asignacion, 'experienceId' | 'categoryId'>;
export type CambiosAsignacion = DatosAsignacion;

export interface OpcionesAsignacion {
  experiencias: { id: number; name: string }[];
  categorias: { id: number; name: string }[];
}
