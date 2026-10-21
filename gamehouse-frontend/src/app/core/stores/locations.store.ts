import { Injectable, inject, signal } from '@angular/core';
import { CambiosLugar, Lugar, DatosLugar } from '../models/location.model';
import { LugaresService } from '../services/location.service';

@Injectable({ providedIn: 'root' })
export class LugaresStore {
  private readonly service = inject(LugaresService);
  readonly lugares = signal<Lugar[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly lugarActual = signal<Lugar | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly errorDetalle = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorAccion = signal<string | null>(null);

  async cargarLugares(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try { this.lugares.set(await this.service.obtenerLugares()); }
    catch (error) { this.error.set((error as Error).message); }
    finally { this.cargando.set(false); }
  }
  async cargarLugar(id: number): Promise<void> {
    this.lugarActual.set(null);
    this.cargandoDetalle.set(true);
    this.errorDetalle.set(null);
    try { this.lugarActual.set(await this.service.obtenerLugarPorId(id)); }
    catch (error) { this.errorDetalle.set((error as Error).message); }
    finally { this.cargandoDetalle.set(false); }
  }
  async crearLugar(datos: DatosLugar): Promise<Lugar | null> {
    const created = await this.ejecutar(() => this.service.crearLugar(datos));
    if (created) this.lugares.update((rows) => [created, ...rows]);
    return created;
  }
  async modificarLugar(id: number, cambios: CambiosLugar): Promise<Lugar | null> {
    const updated = await this.ejecutar(() => this.service.modificarLugar(id, cambios));
    if (updated) {
      this.lugares.update((rows) => rows.map((row) => row.id === id ? updated : row));
      this.lugarActual.set(updated);
    }
    return updated;
  }
  async eliminarLugar(id: number): Promise<boolean> {
    const deleted = await this.ejecutar(async () => {
      await this.service.eliminarLugar(id);
      return true;
    });
    if (deleted) {
      this.lugares.update((rows) => rows.filter((row) => !(row.id === id)));
      this.lugarActual.set(null);
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
