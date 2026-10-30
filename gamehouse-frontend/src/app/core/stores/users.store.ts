import { Injectable, inject, signal } from '@angular/core';
import { UsersService } from '../services/users.service';
import { User } from '../models/user.model';

@Injectable()
export class UsersStore {
  private readonly service = inject(UsersService);
  readonly items = signal<User[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly offset = signal(0);
  readonly pageSize = 50;

  async load(offset = this.offset()): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      this.items.set(await this.service.getAll(offset, this.pageSize));
      this.offset.set(offset);
    } catch (error) {
      this.items.set([]);
      this.error.set(
        error instanceof Error ? error.message : 'No se han podido cargar los usuarios.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  upsert(user: User): void {
    this.items.update((rows) => rows.map((row) => (row.id === user.id ? user : row)));
  }
}
