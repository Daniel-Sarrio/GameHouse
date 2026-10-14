import { Injectable, inject } from '@angular/core';
import { RespuestaApi } from '../models/api.model';
import { CambiosEvento, DatosEvento, Evento } from '../models/experience.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class EventosService {
  private readonly api = inject(ApiService);
  private readonly path = 'experiences';

  async obtenerEventos(): Promise<Evento[]> {
    return (await this.api.get<RespuestaApi<Evento[]>>(this.path)).data;
  }

  async obtenerEventoPorSlug(slug: string): Promise<Evento> {
    return (await this.api.get<RespuestaApi<Evento>>(`${this.path}/slug/${encodeURIComponent(slug)}`)).data;
  }

  async crearEvento(datos: DatosEvento): Promise<Evento> {
    return (await this.api.post<RespuestaApi<Evento>>(this.path, datos)).data;
  }

  async modificarEvento(id: number | string, cambios: CambiosEvento): Promise<Evento> {
    return (await this.api.patch<RespuestaApi<Evento>>(`${this.path}/${id}`, cambios)).data;
  }

  async cambiarEstado(id: number, activar: boolean): Promise<Evento> {
    const accion = activar ? 'activate' : 'deactivate';
    return (await this.api.patch<RespuestaApi<Evento>>(`${this.path}/${id}/${accion}`, {})).data;
  }

  async eliminarEvento(id: number): Promise<Evento> {
    return (await this.api.delete<RespuestaApi<Evento>>(`${this.path}/${id}`)).data;
  }
}
