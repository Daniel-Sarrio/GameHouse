export interface Asignacion {
  experienceId: number;
  categoryId: number;
  experienceName: string;
  categoryName: string;
}
export type DatosAsignacion = Pick<Asignacion, 'experienceId' | 'categoryId'>;
export type CambiosAsignacion = DatosAsignacion;
