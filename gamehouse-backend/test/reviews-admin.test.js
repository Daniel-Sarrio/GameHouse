require('dotenv').config();
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { Pool } = require('pg');

process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.CORS_ORIGINS = 'http://localhost:4200';
// Agente falso local: la prueba nunca llama al modelo real.
process.env.AGENT_INTERNAL_TOKEN = randomBytes(32).toString('base64url');
const pool = require('../src/config/database');
const control = new Pool({ ...pool.options, password: pool.options.password });
const schema = `reviews_test_${randomBytes(8).toString('hex')}`;
pool.options.options = `-c search_path=${schema}`;
const app = require('../src/app');
const insightsService = require('../src/services/comment-insights.service');
const migrateAuth = require('../migrate-auth');
const migrateUsers = require('../migrate-users');
const password = 'A-long-test-password-123!';
let server, agent, base, alice, admin, publishedId, draftId;

const fakeAgent = { calls: 0, status: 200, delayMs: 0, reply: null };
const defaultReply = (comments) => ({
  analyzedCount: comments.length,
  recommendCount: comments.filter((comment) => comment.rating >= 4).length,
  aspects: [{ key: 'ambiente', rating: 4, mentions: 1 }],
  summary: 'Gusta el ambiente; se quejan de las esperas.',
  positives: ['Buen ambiente', 'Buen ambiente', '  ', 'Personal atento', 7],
  negatives: ['Esperas largas entre partidas'],
  sentiment: { positive: 2, neutral: 0, negative: 1 },
});

async function request(method, url, { token, body } = {}) {
  const response = await fetch(base + url, {
    method,
    headers: { ...(token ? { Cookie: `gamehouse_access=${token}`, 'X-Requested-With': 'XMLHttpRequest' } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}
async function register(email, firstName) {
  const response = await fetch(`${base}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, firstName }),
  });
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith('gamehouse_access='));
  return { ...(await response.json()).data.user, token: cookie.split(';')[0].slice('gamehouse_access='.length) };
}
const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  await insightsService.settle();
};
const insertComment = (experienceId, userId, rating, body) => pool.query(
  'INSERT INTO comments (experience_id, user_id, rating, body) VALUES ($1, $2, $3, $4) RETURNING id', [experienceId, userId, rating, body],
).then((result) => result.rows[0].id);

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

  agent = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      fakeAgent.calls += 1;
      const body = JSON.parse(raw);
      setTimeout(() => {
        res.writeHead(fakeAgent.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(fakeAgent.status === 200 ? (fakeAgent.reply ?? defaultReply(body.comments)) : { error: 'fallo' }));
      }, fakeAgent.delayMs);
    });
  });
  await new Promise((resolve) => agent.listen(0, '127.0.0.1', resolve));
  process.env.AGENT_API_URL = `http://127.0.0.1:${agent.address().port}/api/agent`;

  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
  const host = (await pool.query("INSERT INTO hosts (name, slug) VALUES ('Host test', 'host-test') RETURNING id")).rows[0].id;
  publishedId = (await pool.query("INSERT INTO experiences (host_id, name, slug) VALUES ($1, 'Torneo test', 'torneo-test') RETURNING id", [host])).rows[0].id;
  draftId = (await pool.query("INSERT INTO experiences (host_id, name, slug, status) VALUES ($1, 'Borrador', 'borrador', 'draft') RETURNING id", [host])).rows[0].id;
  await pool.query("INSERT INTO experiences (host_id, name, slug) VALUES ($1, 'Sin opiniones', 'sin-opiniones')", [host]);
  alice = await register('alice@example.invalid', 'Alice');
  admin = await register('admin@example.invalid', 'Admin');
  await pool.query("UPDATE users SET role = 'ADMIN' WHERE id = $1", [admin.id]);
  await insertComment(publishedId, alice.id, 5, 'Buen ambiente y personal atento.');
  await insertComment(publishedId, alice.id, 4, 'Muy divertido.');
  await insertComment(publishedId, alice.id, 1, 'Esperas larguísimas entre partidas.');
  await insertComment(draftId, alice.id, 3, 'Normal.');
});

beforeEach(() => {
  fakeAgent.calls = 0;
  fakeAgent.status = 200;
  fakeAgent.delayMs = 0;
  fakeAgent.reply = null;
  insightsService.resetFailures();
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (agent) await new Promise((resolve) => agent.close(resolve));
  await pool.end();
  // Solo elimina el esquema aleatorio creado por esta suite, nunca public.
  try { await control.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); }
  finally { await control.end(); }
});

test('todas las rutas de /api/reviews exigen sesión y rol ADMIN', async () => {
  for (const [method, url] of [
    ['GET', '/api/reviews/experiences'],
    ['GET', `/api/reviews/experiences/${publishedId}/comments`],
    ['GET', `/api/reviews/experiences/${publishedId}/analysis`],
    ['POST', `/api/reviews/experiences/${publishedId}/analysis`],
    ['DELETE', '/api/reviews/comments/1'],
  ]) {
    assert.equal((await request(method, url)).status, 401, `${method} ${url} sin sesión`);
    assert.equal((await request(method, url, { token: alice.token })).status, 403, `${method} ${url} USER`);
  }
  assert.equal(fakeAgent.calls, 0);
});

test('lista las experiencias con opiniones, publicadas o no, con su media', async () => {
  const result = await request('GET', '/api/reviews/experiences', { token: admin.token });
  assert.equal(result.status, 200);
  const rows = result.data.data;
  assert.deepEqual(rows.map((row) => row.slug).sort(), ['borrador', 'torneo-test']);
  const published = rows.find((row) => row.slug === 'torneo-test');
  assert.equal(published.commentCount, 3);
  assert.equal(published.average, 3.3);
  assert.equal(published.analyzedAt, null);
  assert.equal(published.analysisFresh, false);
});

test('el administrador ve los comentarios con el email del autor para moderar', async () => {
  const result = await request('GET', `/api/reviews/experiences/${publishedId}/comments?sort=rating_asc`, { token: admin.token });
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.data.items.map((item) => item.rating), [1, 4, 5]);
  assert.deepEqual(result.data.data.items[0].author, { name: 'Alice', email: 'alice@example.invalid' });
  assert.equal(result.data.data.summary.count, 3);
  assert.equal((await request('GET', '/api/reviews/experiences/999999/comments', { token: admin.token })).status, 404);
  assert.equal((await request('GET', '/api/reviews/experiences/abc/comments', { token: admin.token })).status, 400);
});

test('analizar genera en segundo plano lo positivo, lo negativo y la balanza', async () => {
  const before = await request('GET', `/api/reviews/experiences/${publishedId}/analysis`, { token: admin.token });
  assert.deepEqual(before.data.data, { commentCount: 3, generating: false, lastFailedAt: null, analysis: null });

  fakeAgent.delayMs = 150;
  const started = await request('POST', `/api/reviews/experiences/${publishedId}/analysis`, { token: admin.token });
  assert.equal(started.status, 202);
  assert.equal(started.data.data.generating, true);
  await settle();
  assert.equal(fakeAgent.calls, 1);

  const { data } = (await request('GET', `/api/reviews/experiences/${publishedId}/analysis`, { token: admin.token })).data;
  assert.equal(data.generating, false);
  assert.equal(data.analysis.stale, false);
  // Sin repetidos, vacíos ni valores que no sean texto.
  assert.deepEqual(data.analysis.positives, ['Buen ambiente', 'Personal atento']);
  assert.deepEqual(data.analysis.negatives, ['Esperas largas entre partidas']);
  assert.deepEqual(data.analysis.sentiment, { positive: 2, neutral: 0, negative: 1, score: 0.33 });
  assert.equal(data.analysis.summary, 'Gusta el ambiente; se quejan de las esperas.');
  // El mismo análisis sirve a la página pública, que no expone lo positivo y lo negativo.
  const pub = (await request('GET', '/api/shop/experiences/torneo-test/comments/insights')).data.data;
  assert.equal(pub.status, 'ready');
  assert.equal(pub.positives, undefined);
});

test('volver a analizar regenera aunque el análisis esté al día; un comentario nuevo lo deja desactualizado', async () => {
  assert.equal((await request('POST', `/api/reviews/experiences/${publishedId}/analysis`, { token: admin.token })).status, 202);
  await settle();
  assert.equal(fakeAgent.calls, 1);
  await insertComment(publishedId, alice.id, 2, 'No me gustó.');
  const list = (await request('GET', '/api/reviews/experiences', { token: admin.token })).data.data;
  assert.equal(list.find((row) => row.slug === 'torneo-test').analysisFresh, false);
  const analysis = (await request('GET', `/api/reviews/experiences/${publishedId}/analysis`, { token: admin.token })).data.data;
  assert.equal(analysis.analysis.stale, true);
});

test('una balanza que no cuadra con los comentarios se recalcula con las valoraciones', async () => {
  fakeAgent.reply = { positives: [], negatives: [], sentiment: { positive: 40, neutral: 0, negative: 0 } };
  await request('POST', `/api/reviews/experiences/${publishedId}/analysis`, { token: admin.token });
  await settle();
  const { sentiment } = (await request('GET', `/api/reviews/experiences/${publishedId}/analysis`, { token: admin.token })).data.data.analysis;
  // Valoraciones 5, 4, 2 y 1: dos positivas y dos negativas.
  assert.deepEqual(sentiment, { positive: 2, neutral: 0, negative: 2, score: 0 });
});

test('también se analiza una experiencia no publicada; sin opiniones responde 409', async () => {
  assert.equal((await request('POST', `/api/reviews/experiences/${draftId}/analysis`, { token: admin.token })).status, 202);
  await settle();
  const draft = (await request('GET', `/api/reviews/experiences/${draftId}/analysis`, { token: admin.token })).data.data;
  assert.equal(draft.analysis.analyzedCount, 1);
  const empty = (await pool.query("SELECT id FROM experiences WHERE slug = 'sin-opiniones'")).rows[0].id;
  assert.equal((await request('POST', `/api/reviews/experiences/${empty}/analysis`, { token: admin.token })).status, 409);
});

test('si el agente falla se informa sin romper la página', async () => {
  fakeAgent.status = 502;
  await request('POST', `/api/reviews/experiences/${publishedId}/analysis`, { token: admin.token });
  await settle();
  const result = (await request('GET', `/api/reviews/experiences/${publishedId}/analysis`, { token: admin.token })).data.data;
  assert.ok(result.lastFailedAt);
  assert.equal(result.generating, false);
  // Se conserva el último análisis correcto.
  assert.ok(result.analysis);
});

test('el administrador puede borrar cualquier comentario (borrado lógico)', async () => {
  const id = (await pool.query("SELECT id FROM comments WHERE body = 'No me gustó.'")).rows[0].id;
  assert.equal((await request('DELETE', `/api/reviews/comments/${id}`, { token: admin.token })).status, 200);
  assert.equal((await request('DELETE', `/api/reviews/comments/${id}`, { token: admin.token })).status, 404);
  assert.ok((await pool.query('SELECT deleted_at FROM comments WHERE id = $1', [id])).rows[0].deleted_at);
});
