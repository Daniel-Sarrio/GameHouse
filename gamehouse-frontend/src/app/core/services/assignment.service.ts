import { Injectable, inject } from '@angular/core';
import { RespuestaApi } from '../models/api.model';
import { Asignacion, DatosAsignacion, CambiosAsignacion } from '../models/assignment.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AsignacionesService {
  private readonly api = inject(ApiService);
  private readonly path = 'assignments';
  async obtenerAsignaciones(): Promise<Asignacion[]> {
    return (await this.api.get<RespuestaApi<Asignacion[]>>(this.path)).data;
  }
  async obtenerAsignacionPorId(experienceId: number, categoryId: number): Promise<Asignacion> {
    return (await this.api.get<RespuestaApi<Asignacion>>(this.path + '/' + experienceId + '/' + categoryId)).data;
  }
  async crearAsignacion(datos: DatosAsignacion): Promise<Asignacion> {
    return (await this.api.post<RespuestaApi<Asignacion>>(this.path, datos)).data;
  }
  async modificarAsignacion(experienceId: number, categoryId: number, datos: CambiosAsignacion): Promise<Asignacion> {
    return (await this.api.patch<RespuestaApi<Asignacion>>(this.path + '/' + experienceId + '/' + categoryId, datos)).data;
  }
  async eliminarAsignacion(experienceId: number, categoryId: number): Promise<Asignacion> {
    return (await this.api.patch<RespuestaApi<Asignacion>>(this.path + '/' + experienceId + '/' + categoryId + '/delete', {})).data;
  }
}
