import { Injectable, inject } from '@angular/core';
import { RespuestaApi } from '../models/api.model';
import { Lugar, DatosLugar, CambiosLugar } from '../models/location.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class LugaresService {
  private readonly api = inject(ApiService);
  private readonly path = 'locations';
  async obtenerLugares(): Promise<Lugar[]> {
    return (await this.api.get<RespuestaApi<Lugar[]>>(this.path)).data;
  }
  async obtenerLugarPorId(id: number): Promise<Lugar> {
    return (await this.api.get<RespuestaApi<Lugar>>(this.path + '/' + id)).data;
  }
  async crearLugar(datos: DatosLugar): Promise<Lugar> {
    return (await this.api.post<RespuestaApi<Lugar>>(this.path, datos)).data;
  }
  async modificarLugar(id: number, datos: CambiosLugar): Promise<Lugar> {
    return (await this.api.patch<RespuestaApi<Lugar>>(this.path + '/' + id, datos)).data;
  }
  async eliminarLugar(id: number): Promise<Lugar> {
    return (await this.api.delete<RespuestaApi<Lugar>>(this.path + '/' + id)).data;
  }
}
