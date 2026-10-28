import { Injectable, inject } from '@angular/core';
import { RespuestaApi } from '../models/api.model';
import { CambiosOrganizador, DatosOrganizador, Organizador } from '../models/host.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class OrganizadoresService {
  private readonly api = inject(ApiService);
  private readonly path = 'hosts';

  async obtenerOrganizadores(): Promise<Organizador[]> {
    return (await this.api.get<RespuestaApi<Organizador[]>>(this.path)).data;
  }
  async obtenerOrganizadorPorSlug(slug: string): Promise<Organizador> {
    return (await this.api.get<RespuestaApi<Organizador>>(`${this.path}/slug/${encodeURIComponent(slug)}`)).data;
  }
  async crearOrganizador(datos: DatosOrganizador): Promise<Organizador> {
    return (await this.api.post<RespuestaApi<Organizador>>(this.path, datos)).data;
  }
  async modificarOrganizador(id: number, cambios: CambiosOrganizador): Promise<Organizador> {
    return (await this.api.patch<RespuestaApi<Organizador>>(`${this.path}/${id}`, cambios)).data;
  }
  async cambiarEstado(id: number, activar: boolean): Promise<Organizador> {
    return (await this.api.patch<RespuestaApi<Organizador>>(`${this.path}/${id}/${activar ? 'activate' : 'deactivate'}`, {})).data;
  }
  async eliminarOrganizador(id: number): Promise<Organizador> {
    return (await this.api.patch<RespuestaApi<Organizador>>(`${this.path}/${id}` + '/delete', {})).data;
  }
}
