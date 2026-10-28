import { Injectable, inject } from '@angular/core';
import { RespuestaApi } from '../models/api.model';
import { CambiosCategoria, Categoria, DatosCategoria } from '../models/category.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private readonly api = inject(ApiService);
  private readonly path = 'categories';

  async obtenerCategorias(): Promise<Categoria[]> {
    return (await this.api.get<RespuestaApi<Categoria[]>>(this.path)).data;
  }
  async obtenerCategoriaPorSlug(slug: string): Promise<Categoria> {
    return (await this.api.get<RespuestaApi<Categoria>>(`${this.path}/slug/${encodeURIComponent(slug)}`)).data;
  }
  async crearCategoria(datos: DatosCategoria): Promise<Categoria> {
    return (await this.api.post<RespuestaApi<Categoria>>(this.path, datos)).data;
  }
  async modificarCategoria(id: number, cambios: CambiosCategoria): Promise<Categoria> {
    return (await this.api.patch<RespuestaApi<Categoria>>(`${this.path}/${id}`, cambios)).data;
  }
  async cambiarEstado(id: number, activar: boolean): Promise<Categoria> {
    return (await this.api.patch<RespuestaApi<Categoria>>(`${this.path}/${id}/${activar ? 'activate' : 'deactivate'}`, {})).data;
  }
  async eliminarCategoria(id: number): Promise<Categoria> {
    return (await this.api.patch<RespuestaApi<Categoria>>(`${this.path}/${id}` + '/delete', {})).data;
  }
}
