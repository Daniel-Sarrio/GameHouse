import '@angular/compiler';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  PendingTasks,
  computed,
  createEnvironmentInjector,
  runInInjectionContext,
  ɵINJECTOR_SCOPE,
} from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../src/app/auth/auth.store';
import { AuthService } from '../src/app/auth/auth.service';
import { authInterceptor } from '../src/app/auth/auth.interceptor';
import { requestInterceptor } from '../src/app/core/interceptors/request.interceptor';
import { authGuard } from '../src/app/auth/auth.guard';
import { adminGuard } from '../src/app/auth/admin.guard';
import { safeReturnUrl } from '../src/app/auth/auth.utils';
import { environment } from '../src/environments/environment';
import { AuthUser } from '../src/app/auth/auth.models';
import { ProfilePage } from '../src/app/features/profile/profile.page';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});
const expires = (seconds = 3600) => Date.now() + seconds * 1000;
const user = (role: 'USER' | 'ADMIN' = 'USER') =>
  ({
    id: 'user-id',
    email: 'test@example.invalid',
    name: 'Test',
    role,
    isActive: true,
    deletedAt: null,
  }) as AuthUser;
const injectors: ReturnType<typeof createEnvironmentInjector>[] = [];
function setup() {
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: 'root' },
      AuthStore,
      AuthService,
      // Estas pruebas ejercitan HTTP y signals sin un árbol de componentes que renderizar.
      { provide: PendingTasks, useValue: { add: () => () => {} } },
      provideHttpClient(withInterceptors([requestInterceptor, authInterceptor])),
      provideHttpClientTesting(),
      {
        provide: Router,
        useValue: { createUrlTree: (path: string[], extras?: unknown) => ({ path, extras }) },
      },
    ],
    null as any,
  );
  injectors.push(injector);
  return {
    injector,
    store: injector.get(AuthStore),
    service: injector.get(AuthService),
    http: injector.get(HttpClient),
    controller: injector.get(HttpTestingController),
  };
}
afterEach(() => {
  for (const injector of injectors.splice(0)) {
    injector.get(HttpTestingController).verify();
    injector.destroy();
  }
  storage.clear();
});

test('store expone usuario y roles sin almacenar ni exponer JWT', () => {
  const { store } = setup();
  store.login({ user: user('ADMIN'), expiresAt: expires() });
  assert.equal(store.isAuthenticated(), true);
  assert.equal(store.isAdmin(), true);
  assert.deepEqual(store.roles(), ['ADMIN']);
  assert.equal(store.hasRole('admin'), true);
  assert.equal(store.hasRole('HOST'), false);
  assert.equal('token' in store, false);
  assert.equal(storage.size, 0);
  store.logout();
  assert.equal(store.user(), null);
});

test('sesiones caducadas, sin expiración o de usuarios desactivados se rechazan', () => {
  const { store } = setup();
  for (const expiresAt of [expires(-1), NaN, undefined]) {
    assert.throws(() => store.login({ user: user(), expiresAt: expiresAt as number }));
    assert.equal(store.isAuthenticated(), false);
  }
  assert.throws(() => store.login({ user: { ...user(), isActive: false }, expiresAt: expires() }));
});

test('caducidad cierra sesión incluso sin peticiones', async () => {
  const { store } = setup();
  store.login({ user: user(), expiresAt: expires(0.04) });
  await new Promise(resolve => setTimeout(resolve, 70));
  assert.equal(store.isAuthenticated(), false);
});

test('F5 restaura desde cookie mediante /me sin token en memoria ni localStorage', async () => {
  const { store, service, controller } = setup();
  storage.set('gamehouse.auth.token', 'legacy-token');
  const restore = service.restoreSession();
  assert.equal(store.isAuthenticated(), false);
  const request = controller.expectOne(`${environment.apiUrl}/auth/me`);
  assert.equal(request.request.withCredentials, true);
  assert.equal(request.request.headers.has('Authorization'), false);
  request.flush({ success: true, data: user('ADMIN'), expiresAt: expires() });
  await restore;
  assert.equal(store.isAdmin(), true);
  assert.equal(storage.size, 0);
});

test('login sincroniza store y un 401 de credenciales no invalida otra sesión', async () => {
  const { store, service, controller } = setup();
  const login = service.login({ email: 'test@example.invalid', password: 'test-password' });
  const request = controller.expectOne(`${environment.apiUrl}/auth/login`);
  assert.equal(request.request.withCredentials, true);
  request.flush({ success: true, data: { user: user(), expiresAt: expires() } });
  await login;
  const failed = service.login({ email: 'test@example.invalid', password: 'wrong' });
  controller.expectOne(`${environment.apiUrl}/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });
  await assert.rejects(failed);
  assert.equal(store.isAuthenticated(), true);
});

test('interceptor envía credenciales solo a la API propia y conserva el header existente', async () => {
  const { http, controller } = setup();
  for (const url of [`${environment.apiUrl}/users`, 'https://external.invalid/api/users', `${environment.apiUrl}-other/users`]) {
    const response = firstValueFrom(http.get(url));
    const request = controller.expectOne(url);
    const own = url === `${environment.apiUrl}/users`;
    assert.equal(request.request.withCredentials, own);
    assert.equal(request.request.headers.get('X-Requested-With'), 'XMLHttpRequest');
    assert.equal(request.request.headers.has('Authorization'), false);
    request.flush({});
    await response;
  }
});

test('401 invalida sesión; 403 mantiene autenticación', async () => {
  const { store, http, controller } = setup();
  for (const status of [403, 401]) {
    store.login({ user: user(), expiresAt: expires() });
    const response = firstValueFrom(http.get(`${environment.apiUrl}/users`));
    controller.expectOne(`${environment.apiUrl}/users`).flush({}, { status, statusText: 'Denied' });
    await assert.rejects(response, HttpErrorResponse);
    assert.equal(store.isAuthenticated(), status === 403);
  }
});

test('401 antiguo no elimina una nueva sesión', async () => {
  const { store, http, controller } = setup();
  store.login({ user: user(), expiresAt: expires() });
  const response = firstValueFrom(http.get(`${environment.apiUrl}/users`));
  const request = controller.expectOne(`${environment.apiUrl}/users`);
  store.login({ user: user('ADMIN'), expiresAt: expires() });
  request.flush({}, { status: 401, statusText: 'Unauthorized' });
  await assert.rejects(response);
  assert.equal(store.isAdmin(), true);
});

test('restauración pendiente no revive una sesión cerrada', async () => {
  const { store, service, controller } = setup();
  const restore = service.restoreSession();
  const request = controller.expectOne(`${environment.apiUrl}/auth/me`);
  const logout = service.logout();
  controller.expectOne(`${environment.apiUrl}/auth/logout`).flush({ success: true });
  await logout;
  request.flush({ success: true, data: user(), expiresAt: expires() });
  await restore;
  assert.equal(store.isAuthenticated(), false);
});

test('logout envía cookie y limpia estado inmediatamente; tolera 401', async () => {
  const { store, service, controller } = setup();
  for (const status of [200, 503, 401]) {
    store.login({ user: user(), expiresAt: expires() });
    const result = service.logout();
    const request = controller.expectOne(`${environment.apiUrl}/auth/logout`);
    assert.equal(request.request.method, 'POST');
    assert.equal(request.request.withCredentials, true);
    assert.equal(store.isAuthenticated(), false);
    request.flush({}, { status, statusText: 'Result' });
    if (status === 503) await assert.rejects(result); else await result;
  }
});

test('guards consultan al servidor: anónimo a login, USER denegado, ADMIN permitido', async () => {
  const { injector, controller } = setup();
  const state = { url: '/usuarios' } as any;
  const guardedAnonymous = runInInjectionContext(injector, () => authGuard({} as any, state));
  controller.expectOne(`${environment.apiUrl}/auth/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
  const anonymous: any = await guardedAnonymous;
  assert.deepEqual(anonymous.path, ['/login']);
  assert.equal(anonymous.extras.queryParams.returnUrl, '/usuarios');
  for (const role of ['USER', 'ADMIN'] as const) {
    const guarded = runInInjectionContext(injector, () => adminGuard({} as any, state));
    controller.expectOne(`${environment.apiUrl}/auth/me`).flush({ success: true, data: user(role), expiresAt: expires() });
    const result: any = await guarded;
    if (role === 'ADMIN') assert.equal(result, true); else assert.deepEqual(result.path, ['/sin-acceso']);
  }
});

test('guardar perfil actualiza avatar reactivo del usuario sin recargar', async () => {
  const { injector, store, controller } = setup();
  store.login({ user: user(), expiresAt: expires() });
  const avatar = computed(() => store.user()?.avatarUrl);
  assert.equal(avatar(), undefined);
  const page = runInInjectionContext(injector, () => new ProfilePage());
  const profile = { firstName: 'Test', lastName: null, phone: null, avatarUrl: null };
  controller.expectOne(`${environment.apiUrl}/profiles/me`).flush({ data: profile });
  await new Promise(resolve => setTimeout(resolve, 0));
  page.form.patchValue({ avatarUrl: 'https://example.invalid/avatar.png' });
  const save = page.save();
  controller.expectOne(`${environment.apiUrl}/profiles/me`).flush({ data: { ...profile, avatarUrl: page.form.getRawValue().avatarUrl } });
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.expectOne(`${environment.apiUrl}/auth/me`).flush({ data: { ...user(), avatarUrl: 'https://example.invalid/avatar.png' }, expiresAt: expires() });
  await save;
  assert.equal(avatar(), 'https://example.invalid/avatar.png');
  assert.equal(page.saved(), true);
});

test('returnUrl solo admite rutas internas y evita bucles', () => {
  for (const url of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/login?returnUrl=/login'])
    assert.equal(safeReturnUrl(url, '/dashboard'), '/dashboard');
  assert.equal(safeReturnUrl('/usuarios?estado=active', '/dashboard'), '/usuarios?estado=active');
});
