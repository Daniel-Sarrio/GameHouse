export interface Celebracion {
  id: number;
  sku: string;
  isActive: boolean;
  experienceId: number;
  experienceName: string;
  experienceSlug: string;
  locationId: number;
  locationName: string;
  city: string;
  country: string;
  categoryId: number;
  categoryName: string;
  startDatetime: string | null;
  endDatetime: string | null;
  price: number;
  capacity: number;
  status: 'draft' | 'scheduled' | 'cancelled' | 'completed';
  imageUrl: string | null;
  durationMinutes: number | null;
  legacyExperienceId: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export type DatosCelebracion = Pick<Celebracion, 'experienceId' | 'locationId' | 'categoryId' |
  'startDatetime' | 'endDatetime' | 'price' | 'capacity' | 'status' | 'imageUrl' | 'isActive'>;
export type CambiosCelebracion = Partial<DatosCelebracion>;

export interface OpcionesCelebracion {
  experiences: { id: number; name: string }[];
  locations: { id: number; name: string; city: string; country: string }[];
  categories: { id: number; name: string; experienceId: number }[];
}
