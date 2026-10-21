import { Injectable, inject, signal } from '@angular/core';
import { CambiosOrganizador, DatosOrganizador, Organizador } from '../models/host.model';
import { OrganizadoresService } from '../services/host.service';

@Injectable({ providedIn: 'root' })
export class OrganizadoresStore {
  private readonly service = inject(OrganizadoresService);
  readonly organizadores = signal<Organizador[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly organizadorActual = signal<Organizador | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly errorDetalle = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorAccion = signal<string | null>(null);

  async cargarOrganizadores(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try { this.organizadores.set(await this.service.obtenerOrganizadores()); }
    catch (error) { this.error.set((error as Error).message); }
    finally { this.cargando.set(false); }
  }
  async cargarOrganizador(slug: string): Promise<void> {
    this.organizadorActual.set(null);
    this.cargandoDetalle.set(true);
    this.errorDetalle.set(null);
    try { this.organizadorActual.set(await this.service.obtenerOrganizadorPorSlug(slug)); }
    catch (error) { this.errorDetalle.set((error as Error).message); }
    finally { this.cargandoDetalle.set(false); }
  }
  async crearOrganizador(datos: DatosOrganizador): Promise<Organizador | null> {
    const created = await this.ejecutar(() => this.service.crearOrganizador(datos));
    if (created) this.organizadores.update((rows) => [created, ...rows]);
    return created;
  }
  async modificarOrganizador(id: number, cambios: CambiosOrganizador): Promise<Organizador | null> {
    const updated = await this.ejecutar(() => this.service.modificarOrganizador(id, cambios));
    if (updated) {
      this.organizadores.update((rows) => rows.map((row) => row.id === id ? updated : row));
      this.organizadorActual.set(updated);
    }
    return updated;
  }
  async cambiarEstado(id: number, activar: boolean): Promise<Organizador | null> {
    const updated = await this.ejecutar(() => this.service.cambiarEstado(id, activar));
    if (updated) {
      this.organizadores.update((rows) => rows.map((row) => row.id === id ? updated : row));
      if (this.organizadorActual()?.id === id) this.organizadorActual.set(updated);
    }
    return updated;
  }
  async eliminarOrganizador(id: number): Promise<boolean> {
    const deleted = await this.ejecutar(async () => {
      await this.service.eliminarOrganizador(id);
      return true;
    });
    if (deleted) {
      this.organizadores.update((rows) => rows.filter((row) => row.id !== id));
      this.organizadorActual.set(null);
    }
    return deleted === true;
  }
  limpiarErrorAccion(): void { this.errorAccion.set(null); }
  private async ejecutar<T>(action: () => Promise<T>): Promise<T | null> {
    this.guardando.set(true);
    this.errorAccion.set(null);
    try { return await action(); }
    catch (error) { this.errorAccion.set((error as Error).message); return null; }
    finally { this.guardando.set(false); }
  }
}
