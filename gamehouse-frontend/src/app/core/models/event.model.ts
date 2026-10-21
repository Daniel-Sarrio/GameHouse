export interface Celebracion {
  id: number;
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
}
export type DatosCelebracion = Pick<Celebracion, 'experienceId' | 'locationId' | 'categoryId' |
  'startDatetime' | 'endDatetime' | 'price' | 'capacity' | 'status' | 'imageUrl'>;
export type CambiosCelebracion = Partial<DatosCelebracion>;
