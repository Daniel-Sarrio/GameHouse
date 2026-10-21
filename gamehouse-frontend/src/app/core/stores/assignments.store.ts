import { Injectable, inject, signal } from '@angular/core';
import { CambiosAsignacion, Asignacion, DatosAsignacion } from '../models/assignment.model';
import { AsignacionesService } from '../services/assignment.service';

@Injectable({ providedIn: 'root' })
export class AsignacionesStore {
  private readonly service = inject(AsignacionesService);
  readonly asignaciones = signal<Asignacion[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly asignacionActual = signal<Asignacion | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly errorDetalle = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorAccion = signal<string | null>(null);

  async cargarAsignaciones(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try { this.asignaciones.set(await this.service.obtenerAsignaciones()); }
    catch (error) { this.error.set((error as Error).message); }
    finally { this.cargando.set(false); }
  }
  async cargarAsignacion(experienceId: number, categoryId: number): Promise<void> {
    this.asignacionActual.set(null);
    this.cargandoDetalle.set(true);
    this.errorDetalle.set(null);
    try { this.asignacionActual.set(await this.service.obtenerAsignacionPorId(experienceId, categoryId)); }
    catch (error) { this.errorDetalle.set((error as Error).message); }
    finally { this.cargandoDetalle.set(false); }
  }
  async crearAsignacion(datos: DatosAsignacion): Promise<Asignacion | null> {
    const created = await this.ejecutar(() => this.service.crearAsignacion(datos));
    if (created) this.asignaciones.update((rows) => [created, ...rows]);
    return created;
  }
  async modificarAsignacion(experienceId: number, categoryId: number, cambios: CambiosAsignacion): Promise<Asignacion | null> {
    const updated = await this.ejecutar(() => this.service.modificarAsignacion(experienceId, categoryId, cambios));
    if (updated) {
      this.asignaciones.update((rows) => rows.map((row) => row.experienceId === experienceId && row.categoryId === categoryId ? updated : row));
      this.asignacionActual.set(updated);
    }
    return updated;
  }
  async eliminarAsignacion(experienceId: number, categoryId: number): Promise<boolean> {
    const deleted = await this.ejecutar(async () => {
      await this.service.eliminarAsignacion(experienceId, categoryId);
      return true;
    });
    if (deleted) {
      this.asignaciones.update((rows) => rows.filter((row) => !(row.experienceId === experienceId && row.categoryId === categoryId)));
      this.asignacionActual.set(null);
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
