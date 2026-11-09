// Modelos del shop público (GET /api/shop). Los IDs de catálogo son numéricos.

export interface ShopFacet {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  imageUrl: string | null;
  experienceCount: number;
  city?: string;
  country?: string;
}

export type ShopFacetType = 'category' | 'host' | 'location';

export interface ShopFacets {
  categories: ShopFacet[];
  hosts: ShopFacet[];
  locations: ShopFacet[];
}

export interface ShopReference {
  id: number;
  name: string;
  slug?: string | null;
}

export interface ShopLocationReference extends ShopReference {
  city: string;
  country: string;
}

export interface ShopExperience {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  host: ShopReference & { description?: string | null; imageUrl?: string | null };
  categories: ShopReference[];
  locations: ShopLocationReference[];
  minPrice: number | null;
  nextDeparture: string | null;
  departureCount: number;
}

export interface ShopExperienceDetail extends ShopExperience {
  images: string[];
}

/** Evento programado y reservable de una experiencia. */
export interface Departure {
  id: number;
  sku: string;
  startDatetime: string;
  endDatetime: string;
  price: number;
  capacity: number;
  availableSpots: number;
  imageUrl: string | null;
  location: ShopLocationReference & { address: string | null; postalCode: string | null };
  category: ShopReference;
}

export const SHOP_SORTS = ['recent', 'name', 'price_asc', 'price_desc', 'date'] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];

export const SHOP_SORT_LABELS: Record<ShopSort, string> = {
  recent: 'Más recientes',
  name: 'Nombre (A-Z)',
  price_asc: 'Precio: menor a mayor',
  price_desc: 'Precio: mayor a menor',
  date: 'Próxima fecha',
};

/** Estado del listado que se refleja en la URL (?category=1,2&search=...&page=2). */
export interface ShopFilters {
  category: number[];
  host: number[];
  location: number[];
  search: string;
  sort: ShopSort;
  page: number;
}

export const DEFAULT_SHOP_FILTERS: ShopFilters = {
  category: [],
  host: [],
  location: [],
  search: '',
  sort: 'recent',
  page: 1,
};

export const SHOP_PAGE_SIZE = 9;

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

/** Datos que enviará el futuro sistema de reservas. */
export interface BookingDraft {
  experienceSlug: string;
  departureId: number;
  spots: number;
}
