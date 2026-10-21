export interface Organizador {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  email: string | null;
  phone: string | null;
  status: 'draft' | 'published' | 'archived' | 'suspended';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type DatosOrganizador = Omit<Organizador, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type CambiosOrganizador = Partial<DatosOrganizador>;
