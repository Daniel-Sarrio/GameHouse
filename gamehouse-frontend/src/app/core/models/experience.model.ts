// Los nombres y tipos son los que devuelve el backend PostgreSQL de GameHouse.
export interface Evento {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  location: string;
  country: string;
  city: string;
  price: number;
  currency: string;
  duration: number;
  capacity: number;
  coverImage: string;
  gallery: string[];
  hostName: string;
  status: 'draft' | 'published' | 'archived' | 'suspended';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type DatosEvento = Omit<Evento, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type CambiosEvento = Partial<DatosEvento>;
