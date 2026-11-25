require('dotenv').config();
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.CORS_ORIGINS = 'http://localhost:4200';
// Las pruebas nunca llaman al agente IA real (ni gastan llamadas al modelo).
process.env.AGENT_INTERNAL_TOKEN = '';
const pool = require('../src/config/database');
const control = new Pool({ ...pool.options, password: pool.options.password });
const schema = `comments_test_${randomBytes(8).toString('hex')}`;
pool.options.options = `-c search_path=${schema}`;
const app = require('../src/app');
const migrateAuth = require('../migrate-auth');
const migrateUsers = require('../migrate-users');
const migrateComments = require('../migrate-comments');
const password = 'A-long-test-password-123!';
const url = '/api/shop/experiences/torneo-test/comments';
let server, base, alice, bob, admin, experienceId;

// token = access token en la cookie HttpOnly, igual que el navegador.
async function request(method, path, { token, body, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(token ? { Cookie: `gamehouse_access=${token}`, 'X-Requested-With': 'XMLHttpRequest' } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  const access = response.headers.getSetCookie().find((value) => value.startsWith('gamehouse_access='));
  return { status: response.status, data, headers: response.headers, token: access?.split(';')[0].slice('gamehouse_access='.length) };
}
async function register(email, profile) {
  const result = await request('POST', '/api/auth/register', { body: { email, password, ...profile } });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return { ...result.data.data.user, token: result.token };
}
const comment = (token, body) => request('POST', url, { token, body });
const list = (token, query = '') => request('GET', url + query, { token });

before(async () => {
  await control.query(`CREATE SCHEMA ${schema}`);
  await pool.query(fs.readFileSync(path.join(__dirname, '..', 'database.sql'), 'utf8'));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await migrateAuth(client);
    await migrateUsers(client);
    await migrateComments(client);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
  const host = (await pool.query("INSERT INTO hosts (name, slug) VALUES ('Host test', 'host-test') RETURNING id")).rows[0].id;
  experienceId = (await pool.query("INSERT INTO experiences (host_id, name, slug) VALUES ($1, 'Torneo test', 'torneo-test') RETURNING id", [host])).rows[0].id;
  await pool.query("INSERT INTO experiences (host_id, name, slug, status) VALUES ($1, 'Borrador', 'borrador', 'draft')", [host]);
  alice = await register('alice@example.invalid', { firstName: 'Alice', lastName: 'Martínez' });
  bob = await register('bob@example.invalid', { firstName: 'Bob' });
  admin = await register('admin@example.invalid', { firstName: 'Admin' });
  await pool.query("UPDATE users SET role = 'ADMIN' WHERE id = $1", [admin.id]);
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
  // Solo elimina el esquema aleatorio creado por esta suite, nunca public.
  try { await control.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); }
  finally { await control.end(); }
});

test('la tabla comments limita la valoración a 1-5 y exige texto', async () => {
  for (const [rating, body] of [[0, 'x'], [6, 'x'], [3, '   ']]) {
    await assert.rejects(pool.query('INSERT INTO comments (experience_id, user_id, rating, body) VALUES ($1, $2, $3, $4)',
      [experienceId, alice.id, rating, body]), { code: '23514' });
  }
});

test('leer comentarios es público y no se cachea en compartido', async () => {
  const result = await list();
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.data.items, []);
  assert.deepEqual(result.data.data.summary, { count: 0, average: null, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  assert.equal(result.headers.get('cache-control'), 'private, no-store');
  assert.equal((await request('GET', '/api/shop/experiences/no-existe/comments')).status, 404);
  assert.equal((await request('GET', '/api/shop/experiences/borrador/comments')).status, 404);
  assert.equal((await request('GET', '/api/shop/experiences/Slug_Invalido/comments')).status, 400);
  assert.equal((await list('', '?limit=500')).status, 400);
});

test('comentar pasa por el middleware auth: sin sesión válida responde 401 y no guarda nada', async () => {
  assert.equal((await comment(undefined, { rating: 5, body: 'Sin sesión' })).status, 401);
  assert.equal((await comment('token-falso', { rating: 5, body: 'Token falso' })).status, 401);
  const bearer = await request('POST', url, { body: { rating: 5, body: 'Bearer' }, headers: { Authorization: `Bearer ${alice.token}` } });
  assert.equal(bearer.status, 401);
  // Con cookie, una escritura sin X-Requested-With se rechaza (CSRF).
  const csrf = await request('POST', url, { body: { rating: 5, body: 'CSRF' }, headers: { Cookie: `gamehouse_access=${alice.token}` } });
  assert.equal(csrf.status, 403);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM comments')).rows[0].count, 0);
});

test('validación: valoración entera de 1 a 5, texto obligatorio y sin campos extra', async () => {
  for (const body of [
    { rating: 0, body: 'Cero' }, { rating: 6, body: 'Seis' }, { rating: 2.5, body: 'Decimal' }, { rating: '5', body: 'Texto' },
    { rating: 5 }, { rating: 5, body: '   ' }, { rating: 5, body: 'x'.repeat(1001) },
    { rating: 5, body: 'Suplantación', userId: bob.id },
  ]) assert.equal((await comment(alice.token, body)).status, 400, JSON.stringify(body));
  // Solo se comenta en experiencias publicadas.
  const draft = await request('POST', '/api/shop/experiences/borrador/comments', { token: alice.token, body: { rating: 5, body: 'Borrador' } });
  assert.equal(draft.status, 404);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM comments')).rows[0].count, 0);
});

test('un usuario puede dejar varios comentarios; el autor sale de la sesión', async () => {
  const first = await comment(alice.token, { rating: 5, body: '  ¡Genial! <script>alert(1)</script>  ' });
  assert.equal(first.status, 201, JSON.stringify(first.data));
  assert.deepEqual(Object.keys(first.data.data).sort(), ['author', 'body', 'canDelete', 'createdAt', 'id', 'rating']);
  assert.equal(first.data.data.body, '¡Genial! <script>alert(1)</script>');
  assert.deepEqual(first.data.data.author, { name: 'Alice M.', avatarUrl: null });
  assert.equal(first.data.data.canDelete, true);
  // Nunca se exponen el email ni el id del autor.
  assert.equal(JSON.stringify(first.data).includes(alice.id), false);
  assert.equal(JSON.stringify(first.data).includes('alice@example.invalid'), false);
  assert.equal((await comment(alice.token, { rating: 4, body: 'Segunda vez, también bien.' })).status, 201);
  assert.equal((await comment(bob.token, { rating: 2, body: 'Regular.' })).status, 201);
  const stored = (await pool.query('SELECT user_id FROM comments ORDER BY id')).rows.map((row) => row.user_id);
  assert.deepEqual(stored, [alice.id, alice.id, bob.id]);
});

test('el listado incluye media, reparto por estrellas, orden reciente y paginación', async () => {
  const result = await list(undefined, '?limit=2');
  assert.equal(result.status, 200);
  const { items, summary, pagination } = result.data.data;
  assert.deepEqual(summary, { count: 3, average: 3.7, distribution: { 1: 0, 2: 1, 3: 0, 4: 1, 5: 1 } });
  assert.deepEqual(pagination, { page: 1, limit: 2, total: 3, totalPages: 2 });
  assert.deepEqual(items.map((item) => item.body), ['Regular.', 'Segunda vez, también bien.']);
  assert.equal(items[0].author.name, 'Bob');
  assert.ok(items.every((item) => item.canDelete === false));
  assert.equal((await list(undefined, '?page=2&limit=2')).data.data.items.length, 1);
});

test('canDelete: solo el autor y ADMIN, según la sesión', async () => {
  const byViewer = async (token) => (await list(token)).data.data.items.map((item) => item.canDelete);
  assert.deepEqual(await byViewer(alice.token), [false, true, true]);
  assert.deepEqual(await byViewer(bob.token), [true, false, false]);
  assert.deepEqual(await byViewer(admin.token), [true, true, true]);
  // Una cookie inválida en una lectura pública no da error: se lista como anónimo.
  assert.deepEqual(await byViewer('token-falso'), [false, false, false]);
});

test('borrar exige sesión, es del autor o de ADMIN y es lógico', async () => {
  const ids = (await pool.query('SELECT id FROM comments ORDER BY id')).rows.map((row) => row.id);
  const [aliceFirst, aliceSecond, bobComment] = ids;
  assert.equal((await request('DELETE', `${url}/${aliceFirst}`)).status, 401);
  assert.equal((await request('DELETE', `${url}/${aliceFirst}`, { token: bob.token })).status, 403);
  assert.equal((await request('DELETE', `/api/shop/experiences/borrador/comments/${aliceFirst}`, { token: alice.token })).status, 404);
  assert.equal((await request('DELETE', `${url}/abc`, { token: alice.token })).status, 400);
  const deleted = await request('DELETE', `${url}/${aliceFirst}`, { token: alice.token });
  assert.equal(deleted.status, 200);
  assert.deepEqual(deleted.data.data, { id: aliceFirst, deleted: true });
  assert.equal((await request('DELETE', `${url}/${aliceFirst}`, { token: alice.token })).status, 404);
  // Moderación: ADMIN borra el comentario de otro usuario.
  assert.equal((await request('DELETE', `${url}/${bobComment}`, { token: admin.token })).status, 200);
  const remaining = (await list()).data.data;
  assert.deepEqual(remaining.items.map((item) => item.id), [aliceSecond]);
  assert.equal(remaining.summary.count, 1);
  assert.equal(remaining.summary.average, 4);
  const rows = (await pool.query('SELECT id, deleted_at FROM comments ORDER BY id')).rows;
  assert.equal(rows.length, 3);
  assert.ok(rows[0].deleted_at && rows[2].deleted_at && !rows[1].deleted_at);
});

test('tras cerrar sesión ya no se puede comentar ni borrar', async () => {
  const logout = await request('POST', '/api/auth/logout', { token: alice.token });
  assert.equal(logout.status, 200);
  assert.equal((await comment(alice.token, { rating: 5, body: 'Después del logout' })).status, 401);
  const remaining = (await list()).data.data.items[0].id;
  assert.equal((await request('DELETE', `${url}/${remaining}`, { token: alice.token })).status, 401);
});

test('eliminar el usuario elimina sus comentarios', async () => {
  await pool.query('DELETE FROM users WHERE id = $1', [bob.id]);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM comments WHERE user_id = $1', [bob.id])).rows[0].count, 0);
});
