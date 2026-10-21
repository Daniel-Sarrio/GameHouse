export interface Categoria {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  status: 'draft' | 'published' | 'archived' | 'suspended';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type DatosCategoria = Omit<Categoria, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type CambiosCategoria = Partial<DatosCategoria>;
