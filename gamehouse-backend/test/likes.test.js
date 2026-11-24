require('dotenv').config();
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.CORS_ORIGINS = 'http://localhost:4200';
const pool = require('../src/config/database');
const control = new Pool({ ...pool.options, password: pool.options.password });
const schema = `likes_test_${randomBytes(8).toString('hex')}`;
pool.options.options = `-c search_path=${schema}`;
const app = require('../src/app');
const migrateAuth = require('../migrate-auth');
const migrateUsers = require('../migrate-users');
const migrateLikes = require('../migrate-likes');
const password = 'A-long-test-password-123!';
const likeUrl = '/api/likes/torneo-test';
let server, base, alice, bob, experienceId, draftId;

// token = access token en la cookie HttpOnly, igual que el navegador.
async function request(method, url, { token, headers = {} } = {}) {
  const response = await fetch(base + url, {
    method,
    headers: { ...(token ? { Cookie: `gamehouse_access=${token}`, 'X-Requested-With': 'XMLHttpRequest' } : {}), ...headers },
  });
  return { status: response.status, data: await response.json(), headers: response.headers };
}
async function register(email) {
  const response = await fetch(`${base}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 201);
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith('gamehouse_access='));
  return { ...(await response.json()).data.user, token: cookie.split(';')[0].slice('gamehouse_access='.length) };
}
const likeCount = async (slug = 'torneo-test') => (await request('GET', `/api/shop/experiences/${slug}`)).data.data.likeCount;

before(async () => {
  await control.query(`CREATE SCHEMA ${schema}`);
  await pool.query(fs.readFileSync(path.join(__dirname, '..', 'database.sql'), 'utf8'));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await migrateAuth(client);
    await migrateUsers(client);
    await migrateLikes(client);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
  const host = (await pool.query("INSERT INTO hosts (name, slug) VALUES ('Host test', 'host-test') RETURNING id")).rows[0].id;
  experienceId = (await pool.query("INSERT INTO experiences (host_id, name, slug) VALUES ($1, 'Torneo test', 'torneo-test') RETURNING id", [host])).rows[0].id;
  draftId = (await pool.query("INSERT INTO experiences (host_id, name, slug, status) VALUES ($1, 'Borrador', 'borrador', 'draft') RETURNING id", [host])).rows[0].id;
  alice = await register('alice@example.invalid');
  bob = await register('bob@example.invalid');
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
  // Solo elimina el esquema aleatorio creado por esta suite, nunca public.
  try { await control.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); }
  finally { await control.end(); }
});

test('la base de datos impide dos likes del mismo usuario a la misma experiencia', async () => {
  await pool.query('INSERT INTO experience_likes (experience_id, user_id) VALUES ($1, $2)', [experienceId, alice.id]);
  await assert.rejects(pool.query('INSERT INTO experience_likes (experience_id, user_id) VALUES ($1, $2)', [experienceId, alice.id]), { code: '23505' });
  await pool.query('DELETE FROM experience_likes');
});

test('todas las rutas de likes pasan por el middleware auth', async () => {
  for (const [method, url] of [['GET', '/api/likes'], ['POST', likeUrl], ['DELETE', likeUrl]]) {
    assert.equal((await request(method, url)).status, 401, `${method} ${url}`);
    assert.equal((await request(method, url, { token: 'token-falso' })).status, 401, `${method} ${url} token falso`);
    const bearer = await request(method, url, { headers: { Authorization: `Bearer ${alice.token}` } });
    assert.equal(bearer.status, 401, `${method} ${url} Bearer`);
  }
  // Con cookie, una escritura sin X-Requested-With se rechaza (CSRF).
  assert.equal((await request('POST', likeUrl, { headers: { Cookie: `gamehouse_access=${alice.token}` } })).status, 403);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM experience_likes')).rows[0].count, 0);
});

test('dar like suma uno; un segundo like a la misma experiencia responde 409', async () => {
  assert.equal(await likeCount(), 0);
  const liked = await request('POST', likeUrl, { token: alice.token });
  assert.equal(liked.status, 201);
  assert.deepEqual(liked.data.data, { experienceId, liked: true, likeCount: 1 });
  const again = await request('POST', likeUrl, { token: alice.token });
  assert.equal(again.status, 409);
  // Peticiones simultáneas tampoco duplican el like.
  const parallel = await Promise.all([1, 2, 3].map(() => request('POST', likeUrl, { token: bob.token })));
  assert.deepEqual(parallel.map((result) => result.status).sort(), [201, 409, 409]);
  assert.equal(await likeCount(), 2);
  assert.equal((await request('GET', '/api/likes', { token: alice.token })).data.data.experienceIds[0], experienceId);
});

test('el contador es público en el listado y en el detalle; quién dio like no se expone', async () => {
  const list = (await request('GET', '/api/shop/experiences')).data.data.items;
  assert.equal(list.find((item) => item.id === experienceId).likeCount, 2);
  const detail = await request('GET', '/api/shop/experiences/torneo-test');
  assert.equal(detail.data.data.likeCount, 2);
  assert.equal(JSON.stringify(detail.data).includes(alice.id), false);
  assert.equal(detail.data.data.liked, undefined);
});

test('quitar el like resta uno y solo se puede quitar un like existente', async () => {
  const unliked = await request('DELETE', likeUrl, { token: alice.token });
  assert.equal(unliked.status, 200);
  assert.deepEqual(unliked.data.data, { experienceId, liked: false, likeCount: 1 });
  assert.equal((await request('DELETE', likeUrl, { token: alice.token })).status, 404);
  assert.deepEqual((await request('GET', '/api/likes', { token: alice.token })).data.data, { experienceIds: [] });
  // Se puede volver a dar like después de quitarlo.
  assert.equal((await request('POST', likeUrl, { token: alice.token })).status, 201);
  assert.equal(await likeCount(), 2);
});

test('cada usuario solo ve y modifica sus propios likes', async () => {
  assert.deepEqual((await request('GET', '/api/likes', { token: bob.token })).data.data, { experienceIds: [experienceId] });
  // Bob quita su like; el de Alice sigue intacto.
  assert.equal((await request('DELETE', likeUrl, { token: bob.token })).data.data.likeCount, 1);
  assert.deepEqual((await request('GET', '/api/likes', { token: alice.token })).data.data, { experienceIds: [experienceId] });
  assert.equal((await request('GET', '/api/likes', { token: alice.token })).headers.get('cache-control'), 'no-store');
});

test('solo se da like a experiencias publicadas; slug inválido o inexistente', async () => {
  assert.equal((await request('POST', '/api/likes/borrador', { token: bob.token })).status, 404);
  assert.equal((await request('POST', '/api/likes/no-existe', { token: bob.token })).status, 404);
  assert.equal((await request('POST', '/api/likes/Slug_Invalido', { token: bob.token })).status, 400);
  // Un like previo a una experiencia que deja de publicarse se puede quitar.
  await pool.query('INSERT INTO experience_likes (experience_id, user_id) VALUES ($1, $2)', [draftId, bob.id]);
  assert.equal((await request('DELETE', '/api/likes/borrador', { token: bob.token })).status, 200);
});

test('tras cerrar sesión no se puede dar ni quitar like', async () => {
  assert.equal((await request('POST', '/api/auth/logout', { token: alice.token })).status, 200);
  assert.equal((await request('DELETE', likeUrl, { token: alice.token })).status, 401);
  assert.equal((await request('GET', '/api/likes', { token: alice.token })).status, 401);
  assert.equal(await likeCount(), 1);
});

test('eliminar el usuario o la experiencia elimina sus likes', async () => {
  await pool.query('DELETE FROM users WHERE id = $1', [alice.id]);
  assert.equal(await likeCount(), 0);
  await pool.query('INSERT INTO experience_likes (experience_id, user_id) VALUES ($1, $2)', [experienceId, bob.id]);
  await pool.query('DELETE FROM experiences WHERE id = $1', [draftId]);
  await pool.query('DELETE FROM experiences WHERE id = $1', [experienceId]);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM experience_likes')).rows[0].count, 0);
});
