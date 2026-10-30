import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { RespuestaApi } from '../models/api.model';
import { Profile, ProfilePayload } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(ApiService);
  async getMe(): Promise<Profile> {
    return (await this.api.get<RespuestaApi<Profile>>('profiles/me')).data;
  }
  async updateMe(payload: ProfilePayload): Promise<Profile> {
    return (await this.api.patch<RespuestaApi<Profile>>('profiles/me', payload)).data;
  }
}
