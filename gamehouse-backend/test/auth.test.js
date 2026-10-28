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
const pool = require('../src/config/database');
const control = new Pool({ ...pool.options, password: pool.options.password });
const schema = `auth_test_${randomBytes(8).toString('hex')}`;
pool.options.options = `-c search_path=${schema}`;
const app = require('../src/app');
const migrateAuth = require('../migrate-auth');
const migrateUsers = require('../migrate-users');
const password = 'A-long-test-password-123!';
let server, base, alice, bob, admin, hostId, experienceId;

async function request(method, url, { token, body, headers = {} } = {}) {
  const response = await fetch(base + url, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(JSON.stringify(data).includes('password_hash'), false);
  assert.equal(JSON.stringify(data).includes('$argon2'), false);
  return { status: response.status, data, headers: response.headers };
}
async function register(email, extra = {}) {
  const result = await request('POST', '/api/auth/register', { body: { email, password, firstName: 'Test', ...extra } });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return result.data.data;
}

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
  const stored = (await pool.query('SELECT password_hash FROM users WHERE id=$1', [alice.user.id])).rows[0];
  assert.ok(stored.password_hash.startsWith('$argon2id$'));
  assert.ok(await argon2.verify(stored.password_hash, password));
  const payload = jwt.decode(alice.token);
  assert.equal(payload.sub, alice.user.id);
  assert.equal(payload.exp - payload.iat, 3600);
  assert.equal(payload.role, undefined);
  assert.equal(payload.password, undefined);
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
  const bad = await request('POST', '/api/auth/login', { body: { email: 'alice@example.invalid', password: 'incorrect' } });
  const absent = await request('POST', '/api/auth/login', { body: { email: 'absent@example.invalid', password } });
  assert.equal(bad.status, 401);
  assert.deepEqual(bad.data, absent.data);
});

test('JWT ausente, inválido, expirado, algoritmo distinto y sin expiración', async () => {
  assert.equal((await request('GET', '/api/auth/me')).status, 401);
  assert.equal((await request('GET', '/api/auth/me', { token: 'invalid' })).status, 401);
  const claims = { sub: alice.user.id, iss: 'gamehouse', aud: 'gamehouse-api' };
  for (const token of [
    jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: -1 }),
    jwt.sign(claims, process.env.JWT_SECRET, { algorithm: 'HS384', expiresIn: '1h' }),
    jwt.sign(claims, process.env.JWT_SECRET),
    jwt.sign(claims, 'another-secret', { expiresIn: '1h' }),
  ]) assert.equal((await request('GET', '/api/auth/me', { token })).status, 401);
  const me = await request('GET', '/api/auth/me', { token: alice.token });
  assert.equal(me.status, 200);
  assert.equal(me.data.data.id, alice.user.id);
  assert.equal(me.headers.get('cache-control'), 'no-store');
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
        'Access-Control-Request-Headers': 'authorization,content-type,x-requested-with',
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:4200');
    const allowedHeaders = preflight.headers.get('access-control-allow-headers').toLowerCase().split(',').map((value) => value.trim());
    for (const header of ['authorization', 'content-type', 'x-requested-with']) assert.ok(allowedHeaders.includes(header));
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
  assert.ok(login.data.data.user.lastLoginAt);
  managedToken = login.data.data.token;
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
  assert.equal((await request('GET','/api/auth/me',{token:managedToken})).status,200);
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

test('login y registro limitan intentos por separado', async () => {
  let result;
  for (let i = 0; i < 22; i++) result = await request('POST', '/api/auth/login', { body: {} });
  assert.equal(result.status, 429);
  assert.ok(result.headers.get('retry-after'));
  for (let i = 0; i < 12; i++) result = await request('POST', '/api/auth/register', { body: {} });
  assert.equal(result.status, 429);
});
