export interface Profile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
export type ProfilePayload = Pick<Profile, 'firstName' | 'lastName' | 'phone' | 'avatarUrl'>;
