import { ParamMap, Params } from '@angular/router';
import { DEFAULT_SHOP_FILTERS, SHOP_SORTS, ShopFilters, ShopSort } from '../models/shop.model';

const MAX_FILTER_VALUES = 20;
const MAX_SEARCH_LENGTH = 100;
const MAX_PAGE = 10_000;

// La URL es editable por el usuario: se descartan valores no válidos en lugar de enviarlos a la API.
const parseIds = (value: string | null): number[] => [
  ...new Set(
    (value ?? '')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((id) => Number.isSafeInteger(id) && id > 0),
  ),
].slice(0, MAX_FILTER_VALUES);

const parsePage = (value: string | null): number => {
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1;
};

const isSort = (value: string | null): value is ShopSort => SHOP_SORTS.includes(value as ShopSort);

/** URL → filtros del store. */
export function parseShopFilters(params: ParamMap): ShopFilters {
  const sort = params.get('sort');
  return {
    category: parseIds(params.get('category')),
    host: parseIds(params.get('host')),
    location: parseIds(params.get('location')),
    search: (params.get('search') ?? '').trim().slice(0, MAX_SEARCH_LENGTH),
    sort: isSort(sort) ? sort : DEFAULT_SHOP_FILTERS.sort,
    page: parsePage(params.get('page')),
  };
}

/** Filtros → query params. Los valores por defecto se envían como null para limpiarlos de la URL. */
export function toShopQueryParams(filters: Partial<ShopFilters>): Params {
  const params: Params = {};
  if (filters.category) params['category'] = filters.category.length ? filters.category.join(',') : null;
  if (filters.host) params['host'] = filters.host.length ? filters.host.join(',') : null;
  if (filters.location) params['location'] = filters.location.length ? filters.location.join(',') : null;
  if (filters.search !== undefined) params['search'] = filters.search.trim() || null;
  if (filters.sort) params['sort'] = filters.sort === DEFAULT_SHOP_FILTERS.sort ? null : filters.sort;
  if (filters.page !== undefined) params['page'] = filters.page > 1 ? filters.page : null;
  return params;
}

export function priceText(price: number | null): string {
  if (price === null) return 'Sin fechas';
  return price === 0
    ? 'Gratis'
    : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

export function dateText(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function timeRangeText(start: string, end: string): string {
  const from = new Date(start);
  const to = new Date(end);
  const sameDay = from.toDateString() === to.toDateString();
  return sameDay
    ? `${timeFormatter.format(from)} – ${timeFormatter.format(to)}`
    : `${timeFormatter.format(from)} – ${dateFormatter.format(to)}, ${timeFormatter.format(to)}`;
}
