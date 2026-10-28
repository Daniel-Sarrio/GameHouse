import { Injectable, inject } from '@angular/core';
import { RespuestaApi } from '../models/api.model';
import { Rol, DatosRol } from '../models/role.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly api = inject(ApiService);
  private readonly path = 'roles';
  async obtenerRoles(): Promise<Rol[]> {
    return (await this.api.get<RespuestaApi<Rol[]>>(this.path)).data;
  }
  async obtenerRolPorId(id: number): Promise<Rol> {
    return (await this.api.get<RespuestaApi<Rol>>(`${this.path}/${id}`)).data;
  }
  async crearRol(datos: DatosRol): Promise<Rol> {
    return (await this.api.post<RespuestaApi<Rol>>(this.path, datos)).data;
  }
  async modificarRol(id: number, datos: DatosRol): Promise<Rol> {
    return (await this.api.patch<RespuestaApi<Rol>>(`${this.path}/${id}`, datos)).data;
  }
  async eliminarRol(id: number): Promise<Rol> {
    return (await this.api.patch<RespuestaApi<Rol>>(`${this.path}/${id}` + '/delete', {})).data;
  }
}
