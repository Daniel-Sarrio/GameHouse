import { Injectable, inject, signal } from '@angular/core';
import { CambiosCategoria, Categoria, DatosCategoria } from '../models/category.model';
import { CategoriasService } from '../services/category.service';

@Injectable({ providedIn: 'root' })
export class CategoriasStore {
  private readonly service = inject(CategoriasService);
  readonly categorias = signal<Categoria[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly categoriaActual = signal<Categoria | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly errorDetalle = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorAccion = signal<string | null>(null);

  async cargarCategorias(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try { this.categorias.set(await this.service.obtenerCategorias()); }
    catch (error) { this.error.set((error as Error).message); }
    finally { this.cargando.set(false); }
  }
  async cargarCategoria(slug: string): Promise<void> {
    this.categoriaActual.set(null);
    this.cargandoDetalle.set(true);
    this.errorDetalle.set(null);
    try { this.categoriaActual.set(await this.service.obtenerCategoriaPorSlug(slug)); }
    catch (error) { this.errorDetalle.set((error as Error).message); }
    finally { this.cargandoDetalle.set(false); }
  }
  async crearCategoria(datos: DatosCategoria): Promise<Categoria | null> {
    const created = await this.ejecutar(() => this.service.crearCategoria(datos));
    if (created) this.categorias.update((rows) => [created, ...rows]);
    return created;
  }
  async modificarCategoria(id: number, cambios: CambiosCategoria): Promise<Categoria | null> {
    const updated = await this.ejecutar(() => this.service.modificarCategoria(id, cambios));
    if (updated) {
      this.categorias.update((rows) => rows.map((row) => row.id === id ? updated : row));
      this.categoriaActual.set(updated);
    }
    return updated;
  }
  async cambiarEstado(id: number, activar: boolean): Promise<Categoria | null> {
    const updated = await this.ejecutar(() => this.service.cambiarEstado(id, activar));
    if (updated) {
      this.categorias.update((rows) => rows.map((row) => row.id === id ? updated : row));
      if (this.categoriaActual()?.id === id) this.categoriaActual.set(updated);
    }
    return updated;
  }
  async eliminarCategoria(id: number): Promise<boolean> {
    const deleted = await this.ejecutar(async () => {
      await this.service.eliminarCategoria(id);
      return true;
    });
    if (deleted) {
      this.categorias.update((rows) => rows.filter((row) => row.id !== id));
      this.categoriaActual.set(null);
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
