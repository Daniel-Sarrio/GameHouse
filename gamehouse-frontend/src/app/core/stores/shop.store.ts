import { Injectable, computed, inject, signal } from '@angular/core';
import {
  DEFAULT_SHOP_FILTERS,
  Pagination,
  ShopExperience,
  ShopFacet,
  ShopFilters,
} from '../models/shop.model';
import { isAbortError } from '../services/api.service';
import { ShopService } from '../services/shop.service';

@Injectable({ providedIn: 'root' })
export class ShopStore {
  private readonly service = inject(ShopService);

  // Facetas (home y filtros): se cargan una vez y se reutilizan entre páginas.
  readonly categories = signal<ShopFacet[]>([]);
  readonly hosts = signal<ShopFacet[]>([]);
  readonly locations = signal<ShopFacet[]>([]);
  readonly facetsLoading = signal(false);
  readonly facetsError = signal<string | null>(null);

  // Listado: filtros, búsqueda y paginación reflejan siempre la URL.
  readonly filters = signal<ShopFilters>(DEFAULT_SHOP_FILTERS);
  readonly experiences = signal<ShopExperience[]>([]);
  readonly pagination = signal<Pagination | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly activeFilterCount = computed(() => {
    const { category, host, location, search } = this.filters();
    return category.length + host.length + location.length + (search ? 1 : 0);
  });

  private facetsRequest?: Promise<void>;
  private listController?: AbortController;

  loadFacets(): Promise<void> {
    this.facetsRequest ??= this.fetchFacets();
    return this.facetsRequest;
  }

  retryFacets(): Promise<void> {
    this.facetsRequest = undefined;
    return this.loadFacets();
  }

  /** Lanza la búsqueda y aborta la anterior: solo la última respuesta llega a la vista. */
  async loadExperiences(filters: ShopFilters): Promise<void> {
    this.listController?.abort();
    const controller = new AbortController();
    this.listController = controller;
    this.filters.set(filters);
    this.loading.set(true);
    this.error.set(null);
    try {
      const { items, pagination } = await this.service.getExperiences(filters, controller.signal);
      this.experiences.set(items);
      this.pagination.set(pagination);
    } catch (error) {
      if (isAbortError(error)) return;
      this.experiences.set([]);
      this.pagination.set(null);
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar las experiencias.');
    } finally {
      if (this.listController === controller) this.loading.set(false);
    }
  }

  cancel(): void {
    this.listController?.abort();
    this.listController = undefined;
    this.loading.set(false);
  }

  private async fetchFacets(): Promise<void> {
    this.facetsLoading.set(true);
    this.facetsError.set(null);
    try {
      const [categories, hosts, locations] = await Promise.all([
        this.service.getCategories(),
        this.service.getHosts(),
        this.service.getLocations(),
      ]);
      this.categories.set(categories);
      this.hosts.set(hosts);
      this.locations.set(locations);
    } catch (error) {
      // Sin caché tras un error: el siguiente intento vuelve a pedir los datos.
      this.facetsRequest = undefined;
      this.facetsError.set(error instanceof Error ? error.message : 'No se pudo cargar el catálogo.');
    } finally {
      this.facetsLoading.set(false);
    }
  }
}
