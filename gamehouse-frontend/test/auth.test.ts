import '@angular/compiler';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  PendingTasks,
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
import { authGuard } from '../src/app/auth/auth.guard';
import { adminGuard } from '../src/app/auth/admin.guard';
import { AUTH_STORAGE_KEY, safeReturnUrl, tokenExpiresAt } from '../src/app/auth/auth.utils';
import { environment } from '../src/environments/environment';
import { AuthUser } from '../src/app/auth/auth.models';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});
const token = (seconds = 3600, role = 'USER') =>
  `header.${Buffer.from(JSON.stringify({ sub: 'user-id', role, exp: Date.now() / 1000 + seconds })).toString('base64url')}.signature`;
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
      provideHttpClient(withInterceptors([authInterceptor])),
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

test('store expone signals, roles y sesión persistente sin contraseñas', () => {
  const { store } = setup();
  store.login({ user: user('ADMIN'), token: token() });
  assert.equal(store.isAuthenticated(), true);
  assert.equal(store.isAdmin(), true);
  assert.deepEqual(store.roles(), ['ADMIN']);
  assert.equal(store.hasRole('admin'), true);
  assert.equal(store.hasRole('HOST'), false);
  assert.equal(storage.size, 1);
  store.logout();
  assert.equal(store.token(), null);
  assert.equal(store.user(), null);
  assert.equal(storage.size, 0);
});
test('tokens caducados, malformados y sin exp se rechazan', () => {
  const { store } = setup();
  for (const value of [token(-1), 'invalid', 'header.e30.signature']) {
    storage.set(AUTH_STORAGE_KEY, value);
    store.restoreToken();
    assert.equal(store.token(), null);
  }
  assert.equal(tokenExpiresAt('broken'), 0);
});
test('caducidad cierra la sesión sin esperar a otra petición', async () => {
  const { store } = setup();
  store.login({ user: user(), token: token(0.04) });
  await new Promise((resolve) => setTimeout(resolve, 70));
  assert.equal(store.isAuthenticated(), false);
  assert.equal(storage.size, 0);
});
test('restaurar consulta /auth/me y usa el rol actual del servidor', async () => {
  const { store, service, controller } = setup();
  const jwt = token(3600, 'ADMIN');
  storage.set(AUTH_STORAGE_KEY, jwt);
  const restore = service.restoreSession();
  assert.equal(store.isAuthenticated(), false);
  const request = controller.expectOne(`${environment.apiUrl}/auth/me`);
  assert.equal(request.request.headers.get('Authorization'), `Bearer ${jwt}`);
  request.flush({ success: true, data: user('USER') });
  await restore;
  assert.equal(store.isAuthenticated(), true);
  assert.equal(store.isAdmin(), false);
});
test('login sincroniza store y un 401 de credenciales no invalida otra sesión', async () => {
  const { store, service, controller } = setup();
  const jwt = token();
  const login = service.login({ email: 'test@example.invalid', password: 'test-password' });
  const request = controller.expectOne(`${environment.apiUrl}/auth/login`);
  assert.equal(request.request.headers.has('Authorization'), false);
  request.flush({ success: true, data: { token: jwt, user: user() } });
  await login;
  assert.equal(store.token(), jwt);
  const failed = service.login({ email: 'test@example.invalid', password: 'wrong' });
  controller
    .expectOne(`${environment.apiUrl}/auth/login`)
    .flush({}, { status: 401, statusText: 'Unauthorized' });
  await assert.rejects(failed);
  assert.equal(store.token(), jwt);
});
test('interceptor añade JWT solo a la API propia', async () => {
  const { store, http, controller } = setup();
  const jwt = token();
  store.login({ user: user(), token: jwt });
  for (const url of [
    `${environment.apiUrl}/users`,
    'https://example.invalid/api/users',
    `${environment.apiUrl}-other/users`,
  ]) {
    const response = firstValueFrom(http.get(url));
    const request = controller.expectOne(url);
    assert.equal(
      request.request.headers.get('Authorization'),
      url === `${environment.apiUrl}/users` ? `Bearer ${jwt}` : null,
    );
    request.flush({});
    await response;
  }
});
test('401 invalida sesión; 403 mantiene autenticación', async () => {
  const { store, http, controller } = setup();
  for (const status of [403, 401]) {
    store.login({ user: user(), token: token() });
    const response = firstValueFrom(http.get(`${environment.apiUrl}/users`));
    controller.expectOne(`${environment.apiUrl}/users`).flush({}, { status, statusText: 'Denied' });
    await assert.rejects(response, HttpErrorResponse);
    assert.equal(store.isAuthenticated(), status === 403);
  }
});
test('401 de una petición antigua no borra un token nuevo', async () => {
  const { store, http, controller } = setup();
  store.login({ user: user(), token: token() });
  const response = firstValueFrom(http.get(`${environment.apiUrl}/users`));
  const request = controller.expectOne(`${environment.apiUrl}/users`);
  const fresh = token(7200);
  store.login({ user: user(), token: fresh });
  request.flush({}, { status: 401, statusText: 'Unauthorized' });
  await assert.rejects(response);
  assert.equal(store.token(), fresh);
});
test('restauración pendiente no revive una sesión cerrada', async () => {
  const { store, service, controller } = setup();
  storage.set(AUTH_STORAGE_KEY, token());
  const restore = service.restoreSession();
  const request = controller.expectOne(`${environment.apiUrl}/auth/me`);
  const logout = service.logout();
  controller.expectOne(`${environment.apiUrl}/auth/logout`).flush({ success: true, data: { message: 'Sesión cerrada.' } });
  await logout;
  request.flush({ success: true, data: user() });
  await restore;
  assert.equal(store.isAuthenticated(), false);
});
test('logout envía Bearer al servidor y borra inmediatamente el estado local', async () => {
  const { store, service, controller } = setup();
  const jwt = token();
  store.login({ token: jwt, user: user() });
  const result = service.logout();
  const request = controller.expectOne(`${environment.apiUrl}/auth/logout`);
  assert.equal(request.request.method, 'POST');
  assert.equal(request.request.headers.get('Authorization'), `Bearer ${jwt}`);
  assert.equal(store.isAuthenticated(), false);
  assert.equal(storage.size, 0);
  request.flush({ success: true, data: { message: 'Sesión cerrada.' } });
  await result;
});
test('logout mantiene limpieza local ante fallo y tolera un token ya revocado', async () => {
  const { store, service, controller } = setup();
  for (const status of [503, 401]) {
    store.login({ token: token(), user: user() });
    const result = service.logout();
    controller.expectOne(`${environment.apiUrl}/auth/logout`).flush({}, { status, statusText: 'Error' });
    if (status === 401) await result; else await assert.rejects(result);
    assert.equal(store.isAuthenticated(), false);
  }
  await service.logout();
  controller.expectNone(`${environment.apiUrl}/auth/logout`);
});
test('guards: anónimo a login, USER sin acceso admin, ADMIN autorizado', async () => {
  const { injector, store, controller } = setup();
  const state = { url: '/usuarios' } as any;
  const anonymous: any = await runInInjectionContext(injector, () => authGuard({} as any, state));
  assert.deepEqual(anonymous.path, ['/login']);
  assert.equal(anonymous.extras.queryParams.returnUrl, '/usuarios');
  for (const role of ['USER', 'ADMIN'] as const) {
    store.login({ token: token(), user: user(role) });
    const guarded = runInInjectionContext(injector, () => adminGuard({} as any, state));
    controller
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush({ success: true, data: user(role) });
    const result: any = await guarded;
    if (role === 'ADMIN') assert.equal(result, true);
    else assert.deepEqual(result.path, ['/sin-acceso']);
  }
});
test('returnUrl solo admite rutas internas y evita bucles de login', () => {
  for (const url of [
    'https://evil.invalid',
    '//evil.invalid',
    '/\\evil.invalid',
    '/login?returnUrl=/login',
  ])
    assert.equal(safeReturnUrl(url, '/dashboard'), '/dashboard');
  assert.equal(safeReturnUrl('/usuarios?estado=active', '/dashboard'), '/usuarios?estado=active');
});
