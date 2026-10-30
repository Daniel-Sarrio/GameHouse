import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { RespuestaApi } from '../models/api.model';
import { User, UserPayload } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiService);
  async getAll(offset = 0, limit = 50): Promise<User[]> {
    return (await this.api.get<RespuestaApi<User[]>>(`users?offset=${offset}&limit=${limit}`)).data;
  }
  async create(payload: UserPayload): Promise<User> {
    return (await this.api.post<RespuestaApi<User>>('users', payload)).data;
  }
  async update(id: string, payload: UserPayload): Promise<User> {
    return (await this.api.patch<RespuestaApi<User>>(`users/${id}`, payload)).data;
  }
  async setActive(id: string, isActive: boolean): Promise<User> {
    return (await this.api.patch<RespuestaApi<User>>(`users/${id}/active`, { isActive })).data;
  }
  async softDelete(id: string): Promise<User> {
    return (await this.api.patch<RespuestaApi<User>>(`users/${id}/softdelete`, {})).data;
  }
}
