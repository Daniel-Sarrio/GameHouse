import { Injectable, inject, signal } from '@angular/core';
import { Rol, DatosRol } from '../models/role.model';
import { RolesService } from '../services/role.service';

@Injectable({ providedIn: 'root' })
export class RolesStore {
  private readonly service = inject(RolesService);
  readonly roles = signal<Rol[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly rolActual = signal<Rol | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly errorDetalle = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorAccion = signal<string | null>(null);

  async cargarRoles(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try { this.roles.set(await this.service.obtenerRoles()); }
    catch (error) { this.error.set((error as Error).message); }
    finally { this.cargando.set(false); }
  }
  async cargarRol(id: number): Promise<void> {
    this.rolActual.set(null);
    this.cargandoDetalle.set(true);
    this.errorDetalle.set(null);
    try { this.rolActual.set(await this.service.obtenerRolPorId(id)); }
    catch (error) { this.errorDetalle.set((error as Error).message); }
    finally { this.cargandoDetalle.set(false); }
  }
  async crearRol(datos: DatosRol): Promise<Rol | null> {
    const created = await this.ejecutar(() => this.service.crearRol(datos));
    if (created) this.roles.update((rows) => [created, ...rows]);
    return created;
  }
  async modificarRol(id: number, datos: DatosRol): Promise<Rol | null> {
    const updated = await this.ejecutar(() => this.service.modificarRol(id, datos));
    if (updated) {
      this.roles.update((rows) => rows.map((row) => row.id === id ? updated : row));
      this.rolActual.set(updated);
    }
    return updated;
  }
  async eliminarRol(id: number): Promise<boolean> {
    const deleted = await this.ejecutar(async () => {
      await this.service.eliminarRol(id);
      return true;
    });
    if (deleted) {
      this.roles.update((rows) => rows.filter((row) => row.id !== id));
      this.rolActual.set(null);
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
