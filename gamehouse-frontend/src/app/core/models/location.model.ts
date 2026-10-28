export interface Lugar {
  id: number;
  name: string;
  address: string | null;
  city: string;
  postalCode: string | null;
  country: string;
  imageUrl: string | null;
  deletedAt: string | null;
}
export type DatosLugar = Omit<Lugar, 'id' | 'deletedAt'> & { address: string; postalCode: string };
export type CambiosLugar = Partial<DatosLugar>;
