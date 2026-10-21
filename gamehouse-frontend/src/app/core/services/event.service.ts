import { Injectable, inject } from '@angular/core';
import { RespuestaApi } from '../models/api.model';
import { Celebracion, DatosCelebracion, CambiosCelebracion } from '../models/event.model';
import { ApiService } from './api.service';

export interface OpcionesCelebracion {
  experiences: { id: number; name: string }[];
  locations: { id: number; name: string; city: string; country: string }[];
  categories: { id: number; name: string; experienceId: number }[];
}
@Injectable({ providedIn: 'root' })
export class CelebracionesService {
  private readonly api = inject(ApiService);
  private readonly path = 'events';
  async obtenerCelebraciones(): Promise<Celebracion[]> {
    return (await this.api.get<RespuestaApi<Celebracion[]>>(this.path)).data;
  }
  async obtenerOpcionesFormulario(): Promise<OpcionesCelebracion> {
    return (await this.api.get<RespuestaApi<OpcionesCelebracion>>(`${this.path}/form-options`)).data;
  }
  async obtenerCelebracionPorId(id: number): Promise<Celebracion> {
    return (await this.api.get<RespuestaApi<Celebracion>>(`${this.path}/${id}`)).data;
  }
  async crearCelebracion(datos: DatosCelebracion): Promise<Celebracion> {
    return (await this.api.post<RespuestaApi<Celebracion>>(this.path, datos)).data;
  }
  async modificarCelebracion(id: number, datos: CambiosCelebracion): Promise<Celebracion> {
    return (await this.api.patch<RespuestaApi<Celebracion>>(`${this.path}/${id}`, datos)).data;
  }
  async eliminarCelebracion(id: number): Promise<Celebracion> {
    return (await this.api.delete<RespuestaApi<Celebracion>>(`${this.path}/${id}`)).data;
  }
}
