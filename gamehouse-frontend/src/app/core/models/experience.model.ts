// La experiencia define el catálogo; lugar, fechas y precio pertenecen a events.
export interface Evento {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  hostId: number;
  hostName: string;
  categoryIds: number[];
  categoryNames: string[];
  eventCount: number;
  status: 'draft' | 'published' | 'archived' | 'suspended';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export type DatosEvento = Pick<Evento, 'name' | 'description' | 'imageUrl' | 'hostId' | 'categoryIds' | 'status' | 'isActive'>;
export type CambiosEvento = Partial<DatosEvento>;

export interface OpcionesEvento {
  hosts: { id: number; name: string }[];
  categories: { id: number; name: string }[];
}
