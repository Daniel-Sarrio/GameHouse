import { Injectable, inject, signal } from '@angular/core';
import { CambiosEvento, DatosEvento, Evento } from '../models/experience.model';
import { EventosService } from '../services/experience.service';

@Injectable({ providedIn: 'root' })
export class EventosStore {
  private readonly service = inject(EventosService);

  readonly eventos = signal<Evento[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly eventoActual = signal<Evento | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly errorDetalle = signal<string | null>(null);

  readonly guardando = signal(false);
  readonly errorAccion = signal<string | null>(null);

  async cargarEventos(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.eventos.set(await this.service.obtenerEventos());
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  async cargarEvento(slug: string): Promise<void> {
    this.eventoActual.set(null);
    this.cargandoDetalle.set(true);
    this.errorDetalle.set(null);
    try {
      this.eventoActual.set(await this.service.obtenerEventoPorSlug(slug));
    } catch (error) {
      this.errorDetalle.set((error as Error).message);
    } finally {
      this.cargandoDetalle.set(false);
    }
  }

  async crearEvento(datos: DatosEvento): Promise<Evento | null> {
    const creado = await this.ejecutar(() => this.service.crearEvento(datos));
    if (creado) this.eventos.update((lista) => [...lista, creado].sort((a, b) => a.id - b.id));
    return creado;
  }

  async modificarEvento(id: number | string, cambios: CambiosEvento): Promise<Evento | null> {
    const actualizado = await this.ejecutar(() => this.service.modificarEvento(id, cambios));
    if (actualizado) {
      this.eventos.update((lista) => lista.map((evento) => evento.id === actualizado.id ? actualizado : evento));
      this.eventoActual.set(actualizado);
    }
    return actualizado;
  }

  async cambiarEstado(id: number, activar: boolean): Promise<Evento | null> {
    const actualizado = await this.ejecutar(() => this.service.cambiarEstado(id, activar));
    if (actualizado) {
      this.eventos.update((lista) => lista.map((evento) => evento.id === id ? actualizado : evento));
      if (this.eventoActual()?.id === id) this.eventoActual.set(actualizado);
    }
    return actualizado;
  }

  async eliminarEvento(id: number): Promise<boolean> {
    const borrado = await this.ejecutar(async () => {
      await this.service.eliminarEvento(id);
      return true;
    });
    if (borrado) {
      this.eventos.update((lista) => lista.filter((evento) => evento.id !== id));
      this.eventoActual.set(null);
    }
    return borrado === true;
  }

  limpiarErrorAccion(): void { this.errorAccion.set(null); }

  private async ejecutar<T>(accion: () => Promise<T>): Promise<T | null> {
    this.guardando.set(true);
    this.errorAccion.set(null);
    try {
      return await accion();
    } catch (error) {
      this.errorAccion.set((error as Error).message);
      return null;
    } finally {
      this.guardando.set(false);
    }
  }
}
