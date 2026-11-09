import { Injectable, inject } from '@angular/core';
import { RespuestaApi } from '../models/api.model';
import {
  Departure,
  Paginated,
  SHOP_PAGE_SIZE,
  ShopExperience,
  ShopExperienceDetail,
  ShopFacet,
  ShopFilters,
} from '../models/shop.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly api = inject(ApiService);
  private readonly path = 'shop';

  async getCategories(): Promise<ShopFacet[]> {
    return (await this.api.get<RespuestaApi<ShopFacet[]>>(`${this.path}/categories`)).data;
  }

  async getHosts(): Promise<ShopFacet[]> {
    return (await this.api.get<RespuestaApi<ShopFacet[]>>(`${this.path}/hosts`)).data;
  }

  async getLocations(): Promise<ShopFacet[]> {
    return (await this.api.get<RespuestaApi<ShopFacet[]>>(`${this.path}/locations`)).data;
  }

  async getExperiences(filters: ShopFilters, signal?: AbortSignal): Promise<Paginated<ShopExperience>> {
    const params = {
      category: filters.category,
      host: filters.host,
      location: filters.location,
      search: filters.search.trim(),
      sort: filters.sort,
      page: filters.page,
      limit: SHOP_PAGE_SIZE,
    };
    return (await this.api.get<RespuestaApi<Paginated<ShopExperience>>>(`${this.path}/experiences`, { params, signal })).data;
  }

  async getExperience(slug: string, signal?: AbortSignal): Promise<ShopExperienceDetail> {
    return (await this.api.get<RespuestaApi<ShopExperienceDetail>>(`${this.path}/experiences/${encodeURIComponent(slug)}`, { signal })).data;
  }

  async getDepartures(slug: string, signal?: AbortSignal): Promise<Departure[]> {
    return (await this.api.get<RespuestaApi<Departure[]>>(`${this.path}/experiences/${encodeURIComponent(slug)}/departures`, { signal })).data;
  }
}
