import { Injectable, inject, signal } from '@angular/core';
import { Celebracion, DatosCelebracion } from '../models/event.model';
import { CelebracionesService } from '../services/event.service';

@Injectable({ providedIn: 'root' })
export class CelebracionesStore {
  private readonly service = inject(CelebracionesService);
  readonly celebraciones = signal<Celebracion[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly celebracionActual = signal<Celebracion | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly errorDetalle = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorAccion = signal<string | null>(null);
  async cargarCelebraciones(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try { this.celebraciones.set(await this.service.obtenerCelebraciones()); }
    catch (error) { this.error.set((error as Error).message); }
    finally { this.cargando.set(false); }
  }
  async cargarCelebracion(id: number): Promise<void> {
    this.celebracionActual.set(null);
    this.cargandoDetalle.set(true);
    this.errorDetalle.set(null);
    try { this.celebracionActual.set(await this.service.obtenerCelebracionPorId(id)); }
    catch (error) { this.errorDetalle.set((error as Error).message); }
    finally { this.cargandoDetalle.set(false); }
  }
  async crearCelebracion(datos: DatosCelebracion): Promise<Celebracion | null> {
    const created = await this.ejecutar(() => this.service.crearCelebracion(datos));
    if (created) this.celebraciones.update((rows) => [created, ...rows]);
    return created;
  }
  async modificarCelebracion(id: number, datos: DatosCelebracion): Promise<Celebracion | null> {
    const updated = await this.ejecutar(() => this.service.modificarCelebracion(id, datos));
    if (updated) {
      this.celebraciones.update((rows) => rows.map((row) => row.id === id ? updated : row));
      this.celebracionActual.set(updated);
    }
    return updated;
  }
  async eliminarCelebracion(id: number): Promise<boolean> {
    const deleted = await this.ejecutar(async () => { await this.service.eliminarCelebracion(id); return true; });
    if (deleted) {
      this.celebraciones.update((rows) => rows.filter((row) => row.id !== id));
      this.celebracionActual.set(null);
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
