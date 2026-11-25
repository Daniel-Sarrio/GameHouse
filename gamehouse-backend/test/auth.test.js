require('dotenv').config();
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGINS = 'http://localhost:4200';
// Las pruebas nunca llaman al agente IA real (ni gastan llamadas al modelo).
process.env.AGENT_INTERNAL_TOKEN = '';
const pool = require('../src/config/database');
const control = new Pool({ ...pool.options, password: pool.options.password });
const schema = `auth_test_${randomBytes(8).toString('hex')}`;
pool.options.options = `-c search_path=${schema}`;
const app = require('../src/app');
const migrateAuth = require('../migrate-auth');
const migrateUsers = require('../migrate-users');
const password = 'A-long-test-password-123!';
let server, base, alice, bob, admin, hostId, experienceId;

// token = access token (cookie gamehouse_access); refresh = refresh token (cookie gamehouse_refresh).
async function request(method, url, { token, refresh, body, headers = {} } = {}) {
  const cookies = [token && `gamehouse_access=${token}`, refresh && `gamehouse_refresh=${refresh}`].filter(Boolean);
  const response = await fetch(base + url, {
    method,
    headers: { ...(cookies.length ? { Cookie: cookies.join('; '), 'X-Requested-With': 'XMLHttpRequest' } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  const serialized = JSON.stringify(data);
  assert.equal(serialized.includes('password_hash'), false);
  assert.equal(serialized.includes('$argon2'), false);
  const setCookies = response.headers.getSetCookie();
  const cookie = (name) => setCookies.find((value) => value.startsWith(`${name}=`));
  const value = (name) => cookie(name)?.split(';')[0].slice(name.length + 1) || undefined;
  const access = value('gamehouse_access');
  const refreshToken = value('gamehouse_refresh');
  // Ningún token ni caducidad viaja en el cuerpo de la respuesta.
  for (const secret of [access, refreshToken]) if (secret) assert.equal(serialized.includes(secret), false);
  assert.equal(/"(token|accessToken|refreshToken|expiresAt)"/.test(serialized), false);
  return { status: response.status, data, headers: response.headers, setCookies, cookie, token: access, refresh: refreshToken };
}
async function register(email, extra = {}) {
  const result = await request('POST', '/api/auth/register', { body: { email, password, firstName: 'Test', ...extra } });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  const profile = (await request('GET', '/api/profiles/me', { token: result.token })).data.data;
  return { ...result.data.data, profile, token: result.token, refresh: result.refresh };
}
const sessionUserKeys = ['avatarUrl', 'email', 'id', 'name', 'role'];

before(async () => {
  await control.query(`CREATE SCHEMA ${schema}`);
  await pool.query(fs.readFileSync(path.join(__dirname, '..', 'database.sql'), 'utf8'));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await migrateAuth(client);
    await migrateUsers(client);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
  // Solo elimina el esquema aleatorio creado por esta suite, nunca public.
  try { await control.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); }
  finally { await control.end(); }
});

test('registro crea USER y perfil con UUID y hash Argon2id', async () => {
  alice = await register('alice@example.invalid', { lastName: 'Alice', phone: '123456789' });
  bob = await register('bob@example.invalid');
  admin = await register('admin@example.invalid');
  await pool.query("UPDATE users SET role = 'ADMIN' WHERE id = $1", [admin.user.id]);
  assert.equal(alice.user.role, 'USER');
  assert.equal(alice.profile.userId, alice.user.id);
  const credentials = (await pool.query('SELECT password_hash FROM users WHERE id=$1', [alice.user.id])).rows[0];
  assert.ok(credentials.password_hash.startsWith('$argon2id$'));
  assert.ok(await argon2.verify(credentials.password_hash, password));
  assert.deepEqual(Object.keys(alice.user).sort(), sessionUserKeys);
  const payload = jwt.decode(alice.token);
  assert.deepEqual(Object.keys(payload).sort(), ['aud', 'exp', 'iat', 'iss', 'jti', 'sid', 'sub']);
  assert.equal(payload.sub, alice.user.id);
  assert.equal(payload.exp - payload.iat, 3600);
  assert.equal(payload.role, undefined);
  assert.equal(payload.email, undefined);
  // El refresh token es opaco (no es un JWT) y en BD solo se guarda su huella.
  assert.equal(jwt.decode(alice.refresh), null);
  const stored = (await pool.query('SELECT token_hash, expires_at, user_id FROM refresh_tokens WHERE session_id = $1', [payload.sid])).rows;
  assert.equal(stored.length, 1);
  assert.equal(stored[0].user_id, alice.user.id);
  assert.notEqual(stored[0].token_hash, alice.refresh);
  const ttl = stored[0].expires_at.getTime() - Date.now();
  assert.ok(ttl > 7 * 24 * 3600 * 1000 - 60000 && ttl <= 7 * 24 * 3600 * 1000);
});

test('correo duplicado sin distinguir mayúsculas y escalada de rol rechazados', async () => {
  assert.equal((await request('POST', '/api/auth/register', { body: { email: 'ALICE@example.invalid', password } })).status, 409);
  assert.equal((await request('POST', '/api/auth/register', { body: { email: 'evil@example.invalid', password, role: 'ADMIN' } })).status, 400);
  assert.equal((await pool.query("SELECT id FROM users WHERE email='evil@example.invalid'")).rowCount, 0);
});

test('login correcto, contraseña incorrecta y correo inexistente', async () => {
  const ok = await request('POST', '/api/auth/login', { body: { email: 'ALICE@example.invalid', password } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.data.user.id, alice.user.id);
  assert.deepEqual(Object.keys(ok.data.data.user).sort(), sessionUserKeys);
  assert.ok(ok.token && ok.refresh);
  const adminLogin = await request('POST', '/api/auth/login', { body: { email: 'admin@example.invalid', password } });
  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.data.data.user.role, 'ADMIN');
  assert.equal(jwt.decode(adminLogin.token).role, undefined);
  admin.token = adminLogin.token;
  const bad = await request('POST', '/api/auth/login', { body: { email: 'alice@example.invalid', password: 'incorrect' } });
  const absent = await request('POST', '/api/auth/login', { body: { email: 'absent@example.invalid', password } });
  assert.equal(bad.status, 401);
  assert.deepEqual(bad.data, absent.data);
  assert.equal(bad.setCookies.length, 0);
});

test('JWT ausente, inválido, expirado, algoritmo distinto y sin expiración', async () => {
  assert.equal((await request('GET', '/api/auth/me')).status, 401);
  assert.equal((await request('GET', '/api/auth/me', { token: 'invalid' })).status, 401);
  const sid = jwt.decode(alice.token).sid;
  const claims = { sub: alice.user.id, sid, iss: 'gamehouse', aud: 'gamehouse-api' };
  for (const token of [
    jwt.sign({ ...claims, sid: randomUUID() }, process.env.JWT_SECRET, { expiresIn: '1h' }),
    jwt.sign({ ...claims, sub: bob.user.id }, process.env.JWT_SECRET, { expiresIn: '1h' }),
    jwt.sign({ sub: alice.user.id, iss: 'gamehouse', aud: 'gamehouse-api' }, process.env.JWT_SECRET, { expiresIn: '1h' }),
    jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: -1 }),
    jwt.sign(claims, process.env.JWT_SECRET, { algorithm: 'HS384', expiresIn: '1h' }),
    jwt.sign(claims, process.env.JWT_SECRET),
    jwt.sign(claims, 'another-secret', { expiresIn: '1h' }),
  ]) assert.equal((await request('GET', '/api/auth/me', { token })).status, 401);
  const me = await request('GET', '/api/auth/me', { token: alice.token });
  assert.equal(me.status, 200);
  assert.equal(me.data.data.id, alice.user.id);
  assert.deepEqual(Object.keys(me.data.data).sort(), sessionUserKeys);
  assert.equal(me.data.expiresAt, undefined);
  assert.equal(me.headers.get('cache-control'), 'no-store');
  // Authorization: Bearer ya no autentica: la sesión solo se acepta desde la cookie HttpOnly.
  assert.equal((await request('GET', '/api/auth/me', { headers: { Authorization: `Bearer ${alice.token}` } })).status, 401);
});

test('RBAC usa el rol actual en BD; ADMIN lista y consulta usuarios', async () => {
  assert.equal((await request('GET', '/api/users')).status, 401);
  assert.equal((await request('GET', '/api/users', { token: alice.token })).status, 403);
  assert.equal((await request('GET', '/api/users?limit=2', { token: admin.token })).data.data.length, 2);
  assert.equal((await request('GET', `/api/users/${alice.user.id}`, { token: admin.token })).status, 200);
  assert.equal((await request('GET', `/api/users/${randomUUID()}`, { token: admin.token })).status, 404);
  await pool.query("UPDATE users SET role='USER' WHERE id=$1", [admin.user.id]);
  assert.equal((await request('GET', '/api/users', { token: admin.token })).status, 403);
  await pool.query("UPDATE users SET role='ADMIN' WHERE id=$1", [admin.user.id]);
});

test('ABAC permite el perfil propio y bloquea lectura/escritura de otro usuario', async () => {
  const own = await request('GET', '/api/profiles/me', { token: alice.token });
  assert.equal(own.data.data.id, alice.profile.id);
  const update = await request('PATCH', '/api/profiles/me', { token: alice.token, body: { firstName: 'Updated', phone: null } });
  assert.equal(update.status, 200);
  assert.equal(update.data.data.firstName, 'Updated');
  assert.equal(update.data.data.phone, null);
  assert.ok(new Date(update.data.data.updatedAt) >= new Date(own.data.data.updatedAt));
  assert.equal((await request('GET', `/api/profiles/${alice.profile.id}`, { token: alice.token })).status, 200);
  assert.equal((await request('GET', `/api/profiles/${bob.profile.id}`, { token: alice.token })).status, 403);
  assert.equal((await request('PATCH', `/api/profiles/${bob.profile.id}`, { token: alice.token, body: { firstName: 'Stolen' } })).status, 403);
  assert.equal((await request('PATCH', '/api/profiles/me', { token: alice.token, body: { userId: bob.user.id } })).status, 400);
  assert.equal((await request('PATCH', '/api/profiles/me', { token: alice.token, body: {} })).status, 400);
  assert.equal((await request('GET', `/api/profiles/${randomUUID()}`, { token: alice.token })).status, 404);
  assert.equal((await request('GET', '/api/profiles/invalid', { token: alice.token })).status, 400);
});

test('ADMIN consulta y modifica perfiles ajenos; cadenas SQL se guardan como datos', async () => {
  assert.equal((await request('GET', `/api/profiles/${bob.profile.id}`, { token: admin.token })).status, 200);
  const name = "Robert'); DROP TABLE users; --";
  const updated = await request('PATCH', `/api/profiles/${bob.profile.id}`, { token: admin.token, body: { firstName: name } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.data.firstName, name);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM users')).rows[0].count, 3);
});

test('registro hace rollback si falla la creación del perfil', async () => {
  await pool.query(`CREATE FUNCTION reject_test_profile() RETURNS trigger AS $$
    BEGIN IF NEW.first_name = 'Force rollback' THEN RAISE EXCEPTION 'private database detail'; END IF;
    RETURN NEW; END; $$ LANGUAGE plpgsql;
    CREATE TRIGGER reject_test_profile BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION reject_test_profile();`);
  try {
    const result = await request('POST', '/api/auth/register', { body: { email: 'rollback@example.invalid', password, firstName: 'Force rollback' } });
    assert.equal(result.status, 500);
    assert.equal(result.data.message, 'Internal server error');
    assert.equal((await pool.query("SELECT id FROM users WHERE email='rollback@example.invalid'")).rowCount, 0);
  } finally { await pool.query('DROP TRIGGER reject_test_profile ON profiles; DROP FUNCTION reject_test_profile()'); }
});

test('catálogos conservan lecturas públicas; escrituras requieren ADMIN', async () => {
  for (const resource of ['experiences', 'events', 'categories', 'hosts', 'locations', 'assignments']) {
    assert.equal((await request('GET', `/api/${resource}`)).status, 200, resource);
    assert.equal((await request('POST', `/api/${resource}`, { body: {} })).status, 401, resource);
    assert.equal((await request('POST', `/api/${resource}`, { token: alice.token, body: {} })).status, 403, resource);
  }
  assert.equal((await request('GET', '/api/roles')).status, 401);
  assert.equal((await request('GET', '/api/roles', { token: admin.token })).status, 200);
  const result = await request('POST', '/api/hosts', { token: admin.token, body: {
    name: 'Auth Test Host', description: null, imageUrl: null, email: null, phone: null,
  } });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  hostId = result.data.data.id;
  await pool.query('UPDATE hosts SET user_id=$1 WHERE id=$2', [alice.user.id, hostId]);
  experienceId = (await pool.query("INSERT INTO experiences (host_id,name,slug) VALUES ($1,'Test Experience','test-experience') RETURNING id", [hostId])).rows[0].id;
});

test('experiencias comprueban el propietario real a través del organizador', async () => {
  const url = `/api/experiences/${experienceId}`;
  assert.equal((await request('PATCH', url, { token: bob.token, body: { name: 'Unauthorized' } })).status, 403);
  assert.equal((await request('PATCH', url, { token: alice.token, body: { name: 'Owned experience' } })).status, 200);
  assert.equal((await request('PATCH', url, { token: alice.token, body: { hostId: hostId + 1 } })).status, 403);
  assert.equal((await request('PATCH', url, { token: admin.token, body: { name: 'Admin experience' } })).status, 200);
});

test('CORS, Helmet, JSON inválido y límite de cuerpo', async () => {
  // El interceptor de Angular añade X-Requested-With incluso a las lecturas.
  for (const method of ['GET', 'PATCH']) {
    const preflight = await fetch(base + '/api/experiences', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:4200',
        'Access-Control-Request-Method': method,
        'Access-Control-Request-Headers': 'content-type,x-requested-with',
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:4200');
    const allowedHeaders = preflight.headers.get('access-control-allow-headers').toLowerCase().split(',').map((value) => value.trim());
    for (const header of ['content-type', 'x-requested-with']) assert.ok(allowedHeaders.includes(header));
    assert.equal(allowedHeaders.includes('authorization'), false);
    assert.ok(preflight.headers.get('access-control-allow-methods').split(',').includes(method));
  }
  const allowed = await request('GET', '/api/events', { headers: { Origin: 'http://localhost:4200' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:4200');
  assert.equal(allowed.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await request('GET', '/api/events', { headers: { Origin: 'https://untrusted.invalid' } })).status, 403);
  const invalid = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
  assert.equal(invalid.status, 400);
  assert.equal((await request('POST', '/api/auth/login', { body: { email: 'x'.repeat(40000) } })).status, 413);
});

test('bcrypt previo se acepta y se convierte a Argon2id al iniciar sesión', async () => {
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(password, 12), bob.user.id]);
  assert.equal((await request('POST', '/api/auth/login', { body: { email: bob.user.email, password } })).status, 200);
  assert.ok((await pool.query('SELECT password_hash FROM users WHERE id=$1', [bob.user.id])).rows[0].password_hash.startsWith('$argon2id$'));
});

test('eliminación de usuario borra perfil e invalida su token', async () => {
  await pool.query('DELETE FROM users WHERE id=$1', [bob.user.id]);
  assert.equal((await pool.query('SELECT id FROM profiles WHERE user_id=$1', [bob.user.id])).rowCount, 0);
  assert.equal((await request('GET', '/api/auth/me', { token: bob.token })).status, 401);
});

test('restricciones de perfiles: usuario obligatorio, único y existente', async () => {
  await assert.rejects(pool.query('INSERT INTO profiles (user_id) VALUES ($1)', [alice.user.id]), { code: '23505' });
  await assert.rejects(pool.query('INSERT INTO profiles (user_id) VALUES ($1)', [randomUUID()]), { code: '23503' });
  await assert.rejects(pool.query('INSERT INTO profiles (user_id) VALUES (NULL)'), { code: '23502' });
  await assert.rejects(pool.query("UPDATE users SET role='HOST' WHERE id=$1", [alice.user.id]), { code: '23514' });
});

test('migración desde esquema antiguo conserva usuarios, perfiles y organizadores', async () => {
  const client = await control.connect();
  const legacySchema = `${schema}_legacy`;
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA ${legacySchema}; SET LOCAL search_path TO ${legacySchema}`);
    await client.query(`CREATE TABLE roles (id SERIAL PRIMARY KEY, name TEXT);
      INSERT INTO roles (name) VALUES ('ADMIN'), ('HOST');
      CREATE TABLE users (id SERIAL PRIMARY KEY, role_id INTEGER REFERENCES roles(id), name VARCHAR(100),
        surname VARCHAR(100), email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL,
        phone VARCHAR(30), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE hosts (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id), is_active BOOLEAN DEFAULT TRUE, deleted_at TIMESTAMPTZ);
      INSERT INTO users (role_id,name,surname,email,password,phone) VALUES
        (1,'Old','Admin','old@example.invalid','legacy-password','123'),
        (2,'Old','Host','host@example.invalid','another-password','456');
      INSERT INTO hosts (user_id) VALUES (2);`);
    await migrateAuth(client);
    await migrateUsers(client);
    const result = (await client.query(`SELECT u.id, u.legacy_id, u.role, u.password_hash, p.first_name, p.last_name, p.phone
      FROM users u JOIN profiles p ON p.user_id=u.id ORDER BY u.legacy_id`)).rows;
    assert.equal(result.length, 2);
    assert.equal(result[0].role, 'ADMIN');
    assert.equal(result[1].role, 'USER');
    assert.equal(result[1].last_name, 'Host');
    assert.equal(result[1].phone, '456');
    assert.ok(await argon2.verify(result[0].password_hash, 'legacy-password'));
    assert.equal((await client.query('SELECT user_id FROM hosts')).rows[0].user_id, result[1].id);
    await migrateAuth(client);
    assert.equal((await client.query('SELECT id FROM users WHERE legacy_id=1')).rows[0].id, result[0].id);
    assert.equal((await client.query('SELECT count(*)::int AS count FROM profiles')).rows[0].count, 2);
    const newUser = await require('../src/repos/users.repo').create(client, 'new@example.invalid', await argon2.hash(password));
    const newProfile = await require('../src/repos/profiles.repo').create(client, newUser.id, { firstName: 'New' });
    assert.equal(newUser.role, 'USER');
    assert.equal(newProfile.userId, newUser.id);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

async function softDeleteFixture() {
  const key = randomBytes(6).toString('hex');
  const host = (await pool.query('INSERT INTO hosts (name,slug) VALUES ($1,$1) RETURNING id', ['host-' + key])).rows[0].id;
  const category = (await pool.query('INSERT INTO categories (name,slug) VALUES ($1,$1) RETURNING id', ['category-' + key])).rows[0].id;
  const location = (await pool.query("INSERT INTO locations (name,city,country,image_url) VALUES ($1,'Madrid','España','https://example.com/location.png') RETURNING id", ['location-' + key])).rows[0].id;
  const experience = (await pool.query('INSERT INTO experiences (name,slug,host_id) VALUES ($1,$1,$2) RETURNING id', ['experience-' + key, host])).rows[0].id;
  await pool.query('INSERT INTO experience_categories (experience_id,category_id) VALUES ($1,$2)', [experience,category]);
  const event = (await pool.query(`INSERT INTO events (sku,experience_id,location_id,category_id,price,capacity,image_url)
    VALUES ($1,$2,$3,$4,10,5,'https://example.com/event.png') RETURNING id`, ['event-' + key,experience,location,category])).rows[0].id;
  return { host, category, location, experience, event };
}

test('PATCH delete conserva filas e imágenes, oculta registros y respeta permisos en todos los recursos', async () => {
  for (const [resource, field] of [['events','event'], ['locations','location'], ['categories','category'], ['hosts','host'], ['experiences','experience'], ['roles','role']]) {
    const fixture = await softDeleteFixture();
    const id = resource === 'roles'
      ? (await pool.query("INSERT INTO roles (name) VALUES ('HOST') RETURNING id")).rows[0].id : fixture[field];
    const url = `/api/${resource}/${id}`;
    assert.equal((await request('PATCH', url + '/delete', { body: {} })).status, 401);
    assert.equal((await request('PATCH', url + '/delete', { token: alice.token, body: {} })).status, 403);
    assert.equal((await request('DELETE', url, { token: admin.token })).status, 404);
    const before = (await pool.query(`SELECT count(*) FROM ${resource}`)).rows[0].count;
    const deleted = await request('PATCH', url + '/delete', { token: admin.token, body: {} });
    assert.equal(deleted.status, 200, JSON.stringify(deleted.data));
    assert.ok(deleted.data.data.deletedAt);
    assert.equal((await pool.query(`SELECT count(*) FROM ${resource}`)).rows[0].count, before);
    assert.ok((await pool.query(`SELECT deleted_at FROM ${resource} WHERE id=$1`, [id])).rows[0].deleted_at);
    assert.equal((await request('GET', url, { token: admin.token })).status, 404);
    const list = await request('GET', `/api/${resource}`, { token: admin.token });
    assert.equal(list.data.data.some(row => row.id === id), false);
    assert.equal((await request('PATCH', url + '/delete', { token: admin.token, body: {} })).status, 404);
    const changes = resource === 'events' ? { price: 20 } : resource === 'roles' ? { name: 'USER' } : { name: 'Edited' };
    assert.equal((await request('PATCH', url, { token: admin.token, body: changes })).status, 404);
    if (['events','locations'].includes(resource)) {
      assert.equal((await pool.query('SELECT id FROM images WHERE entity_type=$1 AND entity_id=$2', [resource,id])).rowCount, 1);
    }
    if (resource !== 'roles') {
      assert.equal((await pool.query('SELECT is_active FROM events WHERE id=$1', [fixture.event])).rows[0].is_active, false);
    }
    if (resource === 'events') {
      assert.equal((await request('GET', `/api/experiences/${fixture.experience}`)).data.data.eventCount, 0);
      assert.equal((await request('PATCH', url + '/activate', { token: admin.token })).status, 404);
    }
    if (resource === 'locations') {
      const options = (await request('GET', '/api/events/form-options')).data.data;
      assert.equal(options.locations.some(row => row.id === id), false);
      assert.equal((await request('PATCH', `/api/events/${fixture.event}/activate`, { token: admin.token })).status, 409);
    }
  }
});

test('asignaciones conservadas al eliminar, editar y volver a asignar; eventos no se reactivan solos', async () => {
  const fixture = await softDeleteFixture();
  const url = `/api/assignments/${fixture.experience}/${fixture.category}`;
  const deleted = await request('PATCH', url + '/delete', { token: admin.token, body: {} });
  assert.equal(deleted.status, 200);
  assert.ok(deleted.data.data.deletedAt);
  assert.equal((await request('GET', url)).status, 404);
  const old = (await pool.query('SELECT deleted_at FROM experience_categories WHERE experience_id=$1 AND category_id=$2', [fixture.experience,fixture.category])).rows[0];
  assert.ok(old.deleted_at);
  assert.equal((await pool.query('SELECT is_active FROM events WHERE id=$1', [fixture.event])).rows[0].is_active, false);
  assert.equal((await request('PATCH', `/api/events/${fixture.event}/activate`, { token: admin.token })).status, 409);
  assert.equal((await request('GET', `/api/experiences/${fixture.experience}`)).data.data.categoryIds.length, 0);
  const restored = await request('POST', '/api/assignments', { token: admin.token, body: { experienceId:fixture.experience,categoryId:fixture.category } });
  assert.equal(restored.status, 201);
  assert.equal(restored.data.data.deletedAt, null);
  assert.equal((await pool.query('SELECT is_active FROM events WHERE id=$1', [fixture.event])).rows[0].is_active, false);
  const category2 = (await pool.query("INSERT INTO categories (name,slug) VALUES ('extra-category','extra-category') RETURNING id")).rows[0].id;
  assert.equal((await request('PATCH', url, { token: admin.token, body: {experienceId:fixture.experience,categoryId:category2} })).status, 200);
  assert.ok((await pool.query('SELECT deleted_at FROM experience_categories WHERE experience_id=$1 AND category_id=$2', [fixture.experience,fixture.category])).rows[0].deleted_at);
  // Cambiar las categorías desde el formulario de experiencia usa el mismo borrado lógico.
  assert.equal((await request('PATCH', `/api/experiences/${fixture.experience}`, { token: admin.token, body: {categoryIds:[fixture.category]} })).status, 200);
  const links = (await pool.query('SELECT category_id,deleted_at FROM experience_categories WHERE experience_id=$1', [fixture.experience])).rows;
  assert.equal(links.length, 2);
  assert.equal(links.find(row => row.category_id === fixture.category).deleted_at, null);
  assert.ok(links.find(row => row.category_id === category2).deleted_at);
});

test('migración de soft delete es repetible y conserva datos existentes', async () => {
  const migrateSoftDelete = require('../migrate-soft-delete');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const before = (await client.query('SELECT count(*) FROM events')).rows[0].count;
    await migrateSoftDelete(client);
    await migrateSoftDelete(client);
    assert.equal((await client.query('SELECT count(*) FROM events')).rows[0].count, before);
  } finally { await client.query('ROLLBACK'); client.release(); }
});

let managedUser, managedToken;
test('administración de usuarios: crear perfil, nombre, avatar, rol y estado sin exponer credenciales', async () => {
  assert.equal((await request('POST', '/api/users', {body:{}})).status, 401);
  assert.equal((await request('POST', '/api/users', {token:alice.token,body:{}})).status, 403);
  assert.equal((await request('GET', '/api/admin/users', {token:admin.token})).status, 404);
  const roleId = (await pool.query("SELECT id FROM roles WHERE name='USER'")).rows[0].id;
  const body = {name:'Managed User',email:'MANAGED@example.invalid',password,roleId,status:'pending',avatarImageUrl:'https://example.com/avatar.png'};
  const created = await request('POST','/api/users',{token:admin.token,body});
  assert.equal(created.status,201,JSON.stringify(created.data));
  managedUser = created.data.data;
  assert.equal(managedUser.email,'managed@example.invalid');
  assert.equal(managedUser.name,body.name);
  assert.equal(managedUser.role,'USER');
  assert.equal(managedUser.roleId,roleId);
  assert.equal(managedUser.status,'pending');
  assert.equal(managedUser.isActive,true);
  assert.equal(managedUser.avatarUrl,body.avatarImageUrl);
  assert.equal(managedUser.deletedAt,null);
  assert.equal(managedUser.lastLoginAt,null);
  assert.equal((await pool.query('SELECT id FROM profiles WHERE user_id=$1',[managedUser.id])).rowCount,1);
  assert.equal((await request('POST','/api/users',{token:admin.token,body})).status,409);
  assert.equal((await request('POST','/api/users',{token:admin.token,body:{...body,email:'other@example.invalid',isActive:false}})).status,400);
  assert.equal((await request('POST','/api/users',{token:admin.token,body:{...body,email:'other@example.invalid',roleId:999999}})).status,400);
  assert.equal((await request('GET','/api/users/not-a-uuid',{token:admin.token})).status,400);
});

test('edición parcial: contraseña, correo, nombre y avatar; login actualiza lastLoginAt', async () => {
  const url = '/api/users/' + managedUser.id;
  assert.equal((await request('PATCH',url,{token:admin.token,body:{}})).status,400);
  assert.equal((await request('PATCH',url,{token:admin.token,body:{passwordHash:'injected'}})).status,400);
  assert.equal((await request('PATCH',url,{token:admin.token,body:{email:alice.user.email}})).status,409);
  const newPassword = password + '-changed';
  const changed = await request('PATCH',url,{token:admin.token,body:{name:'Updated Name',email:'updated@example.invalid',password:newPassword,avatarImageUrl:null}});
  assert.equal(changed.status,200,JSON.stringify(changed.data));
  assert.equal(changed.data.data.name,'Updated Name');
  assert.equal(changed.data.data.avatarUrl,null);
  assert.equal(changed.data.data.status,'pending');
  const oldLogin = await request('POST','/api/auth/login',{body:{email:'updated@example.invalid',password}});
  assert.equal(oldLogin.status,401);
  const login = await request('POST','/api/auth/login',{body:{email:'updated@example.invalid',password:newPassword}});
  assert.equal(login.status,200);
  assert.equal(login.data.data.user.lastLoginAt, undefined);
  assert.ok((await pool.query('SELECT last_login_at FROM users WHERE id=$1',[managedUser.id])).rows[0].last_login_at);
  managedToken = login.token;
  assert.equal((await request('PATCH',url,{token:admin.token,body:{avatarImageUrl:'https://example.com/new.png'}})).status,200);
  assert.equal((await request('GET',url,{token:admin.token})).data.data.avatarUrl,'https://example.com/new.png');
});

test('usuarios inactivos y eliminados no pueden iniciar sesión ni utilizar tokens anteriores', async () => {
  const url = '/api/users/' + managedUser.id;
  assert.equal((await request('PATCH',url+'/active',{token:admin.token,body:{isActive:'false'}})).status,400);
  assert.equal((await request('PATCH',url+'/active',{token:admin.token,body:{isActive:false}})).status,200);
  assert.equal((await request('GET','/api/auth/me',{token:managedToken})).status,401);
  assert.equal((await request('POST','/api/auth/login',{body:{email:'updated@example.invalid',password:password+'-changed'}})).status,401);
  assert.equal((await request('GET',url,{token:admin.token})).status,404);
  assert.equal((await request('PATCH',url,{token:admin.token,body:{name:'No edit'}})).status,404);
  const all = (await request('GET','/api/users',{token:admin.token})).data.data;
  assert.equal(all.find(row=>row.id===managedUser.id).isActive,false);
  assert.equal((await request('GET','/api/users/active',{token:admin.token})).data.data.some(row=>row.id===managedUser.id),false);
  assert.equal((await request('PATCH',url+'/active',{token:admin.token,body:{isActive:true}})).status,200);
  assert.equal((await request('GET','/api/auth/me',{token:managedToken})).status,401);
  const deleted = await request('PATCH',url+'/softdelete',{token:admin.token,body:{}});
  assert.equal(deleted.status,200);
  assert.equal(deleted.data.data.isActive,false);
  assert.ok(deleted.data.data.deletedAt);
  assert.equal((await request('PATCH',url+'/softdelete',{token:admin.token,body:{}})).status,404);
  assert.equal((await request('PATCH',url+'/active',{token:admin.token,body:{isActive:true}})).status,409);
  assert.equal((await request('GET','/api/auth/me',{token:managedToken})).status,401);
  assert.equal((await request('POST','/api/auth/login',{body:{email:'updated@example.invalid',password:password+'-changed'}})).status,401);
  const listing = (await request('GET','/api/users/deleted',{token:admin.token})).data.data;
  assert.equal(listing.find(row=>row.id===managedUser.id).deletedAt,deleted.data.data.deletedAt);
  assert.equal((await pool.query('SELECT id FROM profiles WHERE user_id=$1',[managedUser.id])).rowCount,1);
  assert.equal((await request('POST','/api/users',{token:admin.token,body:{email:'UPDATED@example.invalid',password}})).status,409);
});

test('organizadores bloquean desactivación y borrado de su usuario según su estado', async () => {
  const created = await request('POST','/api/users',{token:admin.token,body:{email:'host-owner@example.invalid',password,name:'Host Owner'}});
  assert.equal(created.status,201);
  const id = created.data.data.id;
  const host = (await pool.query("INSERT INTO hosts (name,slug,user_id) VALUES ('lifecycle-host','lifecycle-host',$1) RETURNING id",[id])).rows[0].id;
  const url = '/api/users/' + id;
  assert.equal((await request('PATCH',url+'/active',{token:admin.token,body:{isActive:false}})).status,409);
  assert.equal((await request('PATCH',url+'/softdelete',{token:admin.token,body:{}})).status,409);
  assert.equal((await request('PATCH',`/api/hosts/${host}/deactivate`,{token:admin.token,body:{}})).status,200);
  assert.equal((await request('PATCH',url+'/active',{token:admin.token,body:{isActive:false}})).status,200);
  assert.equal((await request('PATCH',`/api/hosts/${host}/activate`,{token:admin.token,body:{}})).status,409);
  assert.equal((await request('PATCH',url+'/softdelete',{token:admin.token,body:{}})).status,409);
  assert.equal((await request('PATCH',`/api/hosts/${host}/delete`,{token:admin.token,body:{}})).status,200);
  assert.equal((await request('PATCH',url+'/softdelete',{token:admin.token,body:{}})).status,200);
  assert.equal((await pool.query('SELECT user_id FROM hosts WHERE id=$1',[host])).rows[0].user_id,id);
});

test('creación administrativa es transaccional si falla el perfil', async () => {
  await pool.query(`CREATE FUNCTION reject_managed_profile() RETURNS trigger AS $$
    BEGIN IF NEW.first_name = 'Fail profile' THEN RAISE EXCEPTION 'test failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
    CREATE TRIGGER reject_managed_profile BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION reject_managed_profile();`);
  try {
    assert.equal((await request('POST','/api/users',{token:admin.token,body:{name:'Fail profile',email:'failed-managed@example.invalid',password}})).status,500);
    assert.equal((await pool.query("SELECT id FROM users WHERE email='failed-managed@example.invalid'")).rowCount,0);
  } finally { await pool.query('DROP TRIGGER reject_managed_profile ON profiles; DROP FUNCTION reject_managed_profile()'); }
});

test('roles activos: validación al crear y reactivar, y protección de roles en uso', async () => {
  const role = (await pool.query("SELECT id FROM roles WHERE name='USER'")).rows[0].id;
  assert.equal((await request('PATCH',`/api/roles/${role}`,{token:admin.token,body:{isActive:false}})).status,409);
  assert.equal((await request('PATCH',`/api/roles/${role}/delete`,{token:admin.token,body:{}})).status,409);
  await pool.query("UPDATE hosts SET is_active=FALSE WHERE user_id IN (SELECT id FROM users WHERE role='USER')");
  await pool.query("UPDATE users SET is_active=FALSE WHERE role='USER' AND deleted_at IS NULL");
  assert.equal((await request('PATCH',`/api/roles/${role}`,{token:admin.token,body:{isActive:false}})).status,200);
  assert.equal((await request('PATCH',`/api/users/${alice.user.id}/active`,{token:admin.token,body:{isActive:true}})).status,409);
  assert.equal((await request('POST','/api/users',{token:admin.token,body:{email:'disabled-role@example.invalid',password,roleId:role}})).status,400);
  assert.equal((await request('PATCH',`/api/roles/${role}`,{token:admin.token,body:{isActive:true}})).status,200);
  assert.equal((await request('PATCH',`/api/users/${alice.user.id}/active`,{token:admin.token,body:{isActive:true}})).status,200);
  const active = (await request('GET','/api/users/active',{token:admin.token})).data.data;
  assert.ok(active.some(row=>row.id===alice.user.id));
  assert.deepEqual(Object.keys(active[0]).sort(),['email','id','name']);
});

test('migración de usuarios repetible conserva perfiles y fechas de borrado', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const before = (await client.query('SELECT id,is_active,deleted_at,last_login_at FROM users ORDER BY id')).rows;
    await migrateUsers(client);
    await migrateUsers(client);
    assert.deepEqual((await client.query('SELECT id,is_active,deleted_at,last_login_at FROM users ORDER BY id')).rows,before);
  } finally { await client.query('ROLLBACK'); client.release(); }
});

test('me pasa por el servicio y devuelve el usuario actual sin credenciales', async () => {
  const service = require('../src/services/auth.service');
  const current = await service.me(admin.user.id);
  assert.equal(current.role, 'ADMIN');
  assert.deepEqual(Object.keys(current).sort(), sessionUserKeys);
  await assert.rejects(service.me(randomUUID()), error => error.statusCode === 404 || error.status === 404);
});

const login = async (email = 'admin@example.invalid', headers = {}) => {
  const result = await request('POST', '/api/auth/login', { body: { email, password }, headers });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  return result;
};
const sessionOf = (token) => jwt.decode(token).sid;
const expiredAccessToken = (userId, sid) => jwt.sign({ sid }, process.env.JWT_SECRET,
  { subject: userId, expiresIn: -1, issuer: 'gamehouse', audience: 'gamehouse-api' });
// Saca la rotación del margen de concurrencia para simular una reutilización posterior.
const ageRotation = (sid) => pool.query(`UPDATE refresh_tokens SET revoked_at = revoked_at - interval '1 minute'
  WHERE session_id = $1 AND revoked_at IS NOT NULL`, [sid]);

test('cookies HttpOnly: access en /api, refresh solo en /api/auth y ningún token en el JSON', async () => {
  const session = await login('admin@example.invalid', { Origin: 'http://localhost:4200' });
  const access = session.cookie('gamehouse_access');
  const refresh = session.cookie('gamehouse_refresh');
  for (const value of [access, refresh]) {
    assert.match(value, /HttpOnly/i);
    assert.match(value, /SameSite=Strict/i);
    assert.doesNotMatch(value, /Secure/i);
  }
  assert.match(access, /Path=\/api(;|$)/);
  assert.match(refresh, /Path=\/api\/auth(;|$)/);
  const accessExpires = new Date(access.match(/Expires=([^;]+)/i)[1]).getTime();
  assert.ok(Math.abs(accessExpires - jwt.decode(session.token).exp * 1000) < 1000);
  assert.ok(new Date(refresh.match(/Expires=([^;]+)/i)[1]).getTime() - Date.now() > 7 * 24 * 3600 * 1000 - 60000);
  assert.deepEqual(Object.keys(session.data.data), ['user']);
  assert.equal(session.headers.get('access-control-allow-credentials'), 'true');
  // El refresh token no sirve como access token.
  assert.equal((await request('GET', '/api/auth/me', { token: session.refresh })).status, 401);
  // Las escrituras con cookies exigen X-Requested-With y un origen permitido.
  const Cookie = `gamehouse_access=${session.token}; gamehouse_refresh=${session.refresh}`;
  assert.equal((await request('POST', '/api/auth/refresh', { headers: { Cookie } })).status, 403);
  assert.equal((await request('POST', '/api/auth/logout', { headers: { Cookie } })).status, 403);
  assert.equal((await request('POST', '/api/auth/logout', { headers: { Cookie, Origin: 'https://external.invalid', 'X-Requested-With': 'XMLHttpRequest' } })).status, 403);
  assert.equal((await request('GET', '/api/auth/me', { token: session.token })).status, 200);
});

test('refresh renueva el access token caducado y rota el refresh token', async () => {
  const session = await login();
  const sid = sessionOf(session.token);
  assert.equal((await request('GET', '/api/auth/me', { token: expiredAccessToken(admin.user.id, sid) })).status, 401);
  const renewed = await request('POST', '/api/auth/refresh', { refresh: session.refresh });
  assert.equal(renewed.status, 200);
  assert.ok(renewed.token && renewed.refresh);
  assert.notEqual(renewed.token, session.token);
  assert.notEqual(renewed.refresh, session.refresh);
  assert.equal(sessionOf(renewed.token), sid);
  assert.equal((await request('GET', '/api/auth/me', { token: renewed.token })).status, 200);
  // La rotación conserva la caducidad absoluta de la sesión: 7 días desde el login.
  const rows = (await pool.query(`SELECT expires_at, revoked_at, replaced_by FROM refresh_tokens
    WHERE session_id = $1 ORDER BY created_at`, [sid])).rows;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].expires_at.getTime(), rows[1].expires_at.getTime());
  assert.ok(rows[0].revoked_at && rows[0].replaced_by);
  assert.equal(rows[1].revoked_at, null);
});

test('refresh sin cookie, desconocido o de una sesión caducada responde 401 y borra las cookies', async () => {
  assert.equal((await request('POST', '/api/auth/refresh')).status, 401);
  const unknown = await request('POST', '/api/auth/refresh', { refresh: 'unknown-token' });
  assert.equal(unknown.status, 401);
  assert.match(unknown.cookie('gamehouse_access'), /^gamehouse_access=;/);
  assert.match(unknown.cookie('gamehouse_refresh'), /^gamehouse_refresh=;/);
  const session = await login();
  await pool.query("UPDATE refresh_tokens SET expires_at = CURRENT_TIMESTAMP - interval '1 second' WHERE session_id = $1",
    [sessionOf(session.token)]);
  assert.equal((await request('POST', '/api/auth/refresh', { refresh: session.refresh })).status, 401);
  // Una sesión caducada invalida también su access token aunque el JWT siga vigente.
  assert.equal((await request('GET', '/api/auth/me', { token: session.token })).status, 401);
});

test('reutilizar un refresh token ya rotado revoca la sesión completa', async () => {
  const session = await login();
  const renewed = await request('POST', '/api/auth/refresh', { refresh: session.refresh });
  assert.equal(renewed.status, 200);
  await ageRotation(sessionOf(session.token));
  assert.equal((await request('POST', '/api/auth/refresh', { refresh: session.refresh })).status, 401);
  assert.equal((await request('GET', '/api/auth/me', { token: renewed.token })).status, 401);
  assert.equal((await request('POST', '/api/auth/refresh', { refresh: renewed.refresh })).status, 401);
});

test('dos refresh simultáneos del mismo token no cierran la sesión', async () => {
  const session = await login();
  const results = await Promise.all([1, 2].map(() => request('POST', '/api/auth/refresh', { refresh: session.refresh })));
  assert.deepEqual(results.map((result) => result.status), [200, 200]);
  const rotated = results.filter((result) => result.refresh);
  assert.equal(rotated.length, 1);
  assert.equal((await request('GET', '/api/auth/me', { token: rotated[0].token })).status, 200);
  assert.equal((await request('POST', '/api/auth/refresh', { refresh: rotated[0].refresh })).status, 200);
});

test('logout revoca solo la sesión presentada, borra las cookies y es idempotente', async () => {
  const service = require('../src/services/auth.service');
  const first = await login();
  const second = await login();
  assert.notEqual(sessionOf(first.token), sessionOf(second.token));
  const result = await request('POST', '/api/auth/logout', { token: first.token, refresh: first.refresh });
  assert.equal(result.status, 200);
  assert.equal(result.data.success, true);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.match(result.cookie('gamehouse_access'), /^gamehouse_access=;/);
  assert.match(result.cookie('gamehouse_refresh'), /^gamehouse_refresh=;.*Path=\/api\/auth/);
  assert.equal((await request('GET', '/api/auth/me', { token: first.token })).status, 401);
  assert.equal((await request('POST', '/api/auth/refresh', { refresh: first.refresh })).status, 401);
  assert.equal((await request('GET', '/api/auth/me', { token: second.token })).status, 200);
  assert.equal((await request('POST', '/api/auth/logout')).status, 200);
  assert.equal((await request('POST', '/api/auth/logout', { token: 'invalid', refresh: 'invalid' })).status, 200);
  // Un access token caducado (pero firmado por el servidor) también identifica la sesión a cerrar.
  const third = await login();
  assert.equal((await request('POST', '/api/auth/logout', { token: expiredAccessToken(admin.user.id, sessionOf(third.token)) })).status, 200);
  assert.equal((await request('POST', '/api/auth/refresh', { refresh: third.refresh })).status, 401);
  assert.equal((await service.me(admin.user.id)).role, 'ADMIN');
});

test('cambiar la contraseña cierra todas las sesiones del usuario', async () => {
  const first = await register('sessions@example.invalid');
  const second = await login('sessions@example.invalid');
  const changed = await request('PATCH', `/api/users/${first.user.id}`, { token: admin.token, body: { password: password + '-new' } });
  assert.equal(changed.status, 200, JSON.stringify(changed.data));
  for (const session of [first, second]) {
    assert.equal((await request('GET', '/api/auth/me', { token: session.token })).status, 401);
    assert.equal((await request('POST', '/api/auth/refresh', { refresh: session.refresh })).status, 401);
  }
});

test('producción emite cookies Secure; tokens sin sesión o de otra identidad fallan', async () => {
  const { setAuthCookies } = require('../src/services/utils/auth-cookie');
  const previous = process.env.NODE_ENV;
  const cookies = [];
  try {
    process.env.NODE_ENV = 'production';
    setAuthCookies({ cookie: (name, value, options) => cookies.push(options), clearCookie: () => {} },
      { access: { token: 'access', expiresAt: new Date() }, refresh: { token: 'refresh', expiresAt: new Date() } });
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
  assert.equal(cookies.length, 2);
  for (const options of cookies) {
    assert.equal(options.secure, true);
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, 'strict');
  }
  const sid = sessionOf(admin.token);
  for (const claims of [{ sub: alice.user.id }, { sub: randomUUID(), sid }, { sub: alice.user.id, sid }, { sub: admin.user.id, sid: 'x' }]) {
    const token = jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: '1h', issuer: 'gamehouse', audience: 'gamehouse-api' });
    assert.equal((await request('GET', '/api/auth/me', { token })).status, 401);
  }
  assert.equal((await request('GET', '/api/auth/me', { token: admin.token })).status, 200);
});

test('servicios rechazan campos inválidos antes de acceder al repositorio', async () => {
  const cases = [
    ['auth', 'register', [{ email: 'invalid', password: 'short' }]],
    ['auth', 'login', [{ email: 'invalid', password: '' }]],
    ['users', 'createUser', [{ email: 'invalid', password: 'short', role: 'ROOT' }]],
    ['users', 'updateUser', [admin.user.id, { status: 'x'.repeat(31) }]],
    ['profiles', 'updateProfile', [admin.user, 'me', { avatarUrl: 'javascript:alert(1)' }]],
    ['categories', 'createCategory', [{ name: '' }]],
    ['hosts', 'updateHost', [1, { email: 'invalid' }]],
    ['locations', 'updateLocation', [1, { city: '' }]],
    ['experiences', 'updateExperience', [1, { categoryIds: [0] }]],
    ['events', 'updateEvent', [1, { price: -1, capacity: 0 }]],
    ['roles', 'updateRole', [1, { isActive: 'false' }]],
    ['assignments', 'createAssignment', [{ experienceId: -1, categoryId: 1 }]],
  ];
  for (const [name, method, args] of cases) {
    await assert.rejects(async () => require(`../src/services/${name}.service`)[method](...args), error => error.statusCode === 400, name);
  }
});

test('login y registro limitan intentos por separado', async () => {
  let result;
  for (let i = 0; i < 22; i++) result = await request('POST', '/api/auth/login', { body: {} });
  assert.equal(result.status, 429);
  assert.ok(result.headers.get('retry-after'));
  for (let i = 0; i < 12; i++) result = await request('POST', '/api/auth/register', { body: {} });
  assert.equal(result.status, 429);
});
