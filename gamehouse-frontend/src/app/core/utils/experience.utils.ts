export function precioTexto(precio: number, moneda = 'EUR'): string {
  return precio === 0 ? 'Gratis' : new Intl.NumberFormat('es-ES', { style: 'currency', currency: moneda }).format(precio);
}

export function estadoTexto(estado: 'draft' | 'published' | 'archived' | 'suspended'): string {
  return {
    draft: 'Borrador',
    published: 'Publicado',
    archived: 'Archivado',
    suspended: 'Suspendido',
  }[estado];
}

