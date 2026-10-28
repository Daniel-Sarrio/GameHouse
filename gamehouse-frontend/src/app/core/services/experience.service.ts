import { Injectable, inject } from '@angular/core';
import { RespuestaApi } from '../models/api.model';
import { CambiosEvento, DatosEvento, Evento, OpcionesEvento } from '../models/experience.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class EventosService {
  private readonly api = inject(ApiService);
  private readonly path = 'experiences';
  async obtenerOpcionesFormulario(): Promise<OpcionesEvento> {
    return (await this.api.get<RespuestaApi<OpcionesEvento>>(`${this.path}/form-options`)).data;
  }
  async obtenerEventos(): Promise<Evento[]> {
    return (await this.api.get<RespuestaApi<Evento[]>>(this.path)).data;
  }
  async obtenerEventoPorSlug(slug: string): Promise<Evento> {
    return (await this.api.get<RespuestaApi<Evento>>(`${this.path}/slug/${encodeURIComponent(slug)}`)).data;
  }
  async obtenerEventoPorId(id: number): Promise<Evento> {
    this.validarId(id);
    return (await this.api.get<RespuestaApi<Evento>>(`${this.path}/${id}`)).data;
  }
  async crearEvento(datos: DatosEvento): Promise<Evento> {
    return (await this.api.post<RespuestaApi<Evento>>(this.path, datos)).data;
  }
  async modificarEvento(id: number, cambios: CambiosEvento): Promise<Evento> {
    this.validarId(id);
    return (await this.api.patch<RespuestaApi<Evento>>(`${this.path}/${id}`, cambios)).data;
  }
  async cambiarEstado(id: number, activar: boolean): Promise<Evento> {
    return (await this.api.patch<RespuestaApi<Evento>>(`${this.path}/${id}/${activar ? 'activate' : 'deactivate'}`, {})).data;
  }
  async eliminarEvento(id: number): Promise<Evento> {
    return (await this.api.patch<RespuestaApi<Evento>>(`${this.path}/${id}` + '/delete', {})).data;
  }
  private validarId(id: number): void {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('El ID de la experiencia no es válido.');
  }
}
