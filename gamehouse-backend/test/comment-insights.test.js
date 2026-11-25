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
const schema = `insights_test_${randomBytes(8).toString('hex')}`;
pool.options.options = `-c search_path=${schema}`;
const app = require('../src/app');
const insightsService = require('../src/services/comment-insights.service');
const migrateAuth = require('../migrate-auth');
const migrateUsers = require('../migrate-users');
const password = 'A-long-test-password-123!';
const commentsUrl = '/api/shop/experiences/torneo-test/comments';
const insightsUrl = `${commentsUrl}/insights`;
let server, agent, base, alice, bob;

// Lo que responde el agente falso y las peticiones que recibe.
const fakeAgent = { calls: [], status: 200, delayMs: 0, reply: null };
const defaultReply = (comments) => ({
  analyzedCount: comments.length,
  recommendCount: comments.filter((comment) => comment.rating >= 4).length,
  aspects: [
    { key: 'ambiente', rating: 4.3, mentions: 2 },
    { key: 'hackeo', rating: 5, mentions: 1 },
    { key: 'organizacion', rating: 9, mentions: 99 },
    { key: 'ambiente', rating: 1, mentions: 1 },
  ],
  summary: 'Buen ambiente y buena organización.',
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
  assert.equal(response.status, 201);
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith('gamehouse_access='));
  return { ...(await response.json()).data.user, token: cookie.split(';')[0].slice('gamehouse_access='.length) };
}
const comment = (user, rating, body) => request('POST', commentsUrl, { token: user.token, body: { rating, body } });
const insights = async () => (await request('GET', insightsUrl)).data.data;
// Espera a que termine la generación en segundo plano (la lanzan publicar, borrar o consultar el análisis).
const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  await insightsService.settle();
};

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
      const body = JSON.parse(raw);
      fakeAgent.calls.push({ url: req.url, token: req.get?.('x-internal-token') ?? req.headers['x-internal-token'], body });
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
  await pool.query("INSERT INTO experiences (host_id, name, slug) VALUES ($1, 'Torneo test', 'torneo-test')", [host]);
  alice = await register('alice@example.invalid', 'Alice');
  bob = await register('bob@example.invalid', 'Bob');
});

beforeEach(() => {
  fakeAgent.calls = [];
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

test('con menos de 3 opiniones no se llama al agente', async () => {
  assert.deepEqual(await insights(), { status: 'insufficient', minComments: 3, commentCount: 0 });
  assert.equal((await comment(alice, 5, 'Muy buen ambiente, repetiré.')).status, 201);
  assert.equal((await comment(bob, 2, 'Mala organización, mucha espera.')).status, 201);
  await settle();
  assert.equal((await insights()).commentCount, 2);
  assert.equal(fakeAgent.calls.length, 0);
  assert.equal((await request('GET', '/api/shop/experiences/no-existe/comments/insights')).status, 404);
});

test('con 3 opiniones el agente analiza los comentarios en segundo plano y el resultado se valida', async () => {
  assert.equal((await comment(alice, 4, 'Buen ambiente, el personal muy atento.')).status, 201);
  await settle();
  // Publicar el comentario ya ha generado el análisis en segundo plano.
  assert.equal(fakeAgent.calls.length, 1);
  const [call] = fakeAgent.calls;
  assert.equal(call.url, '/api/agent/insights');
  assert.equal(call.token, process.env.AGENT_INTERNAL_TOKEN);
  assert.deepEqual(call.body.experience, { name: 'Torneo test', categories: [] });
  // Solo valoración y texto: ni autores, ni ids, ni emails viajan al agente.
  assert.deepEqual(Object.keys(call.body.comments[0]).sort(), ['body', 'rating']);
  assert.equal(JSON.stringify(call.body).includes(alice.id), false);
  assert.equal(JSON.stringify(call.body).includes('@example.invalid'), false);

  const result = await insights();
  assert.equal(fakeAgent.calls.length, 1, 'la segunda lectura usa la caché');
  assert.equal(result.status, 'ready');
  assert.equal(result.stale, false);
  assert.equal(result.refreshing, false);
  assert.equal(result.analyzedCount, 3);
  assert.equal(result.recommendCount, 2);
  assert.equal(result.recommendPercent, 67);
  // Claves desconocidas y duplicadas fuera; valoraciones a pasos de 0,5 entre 1 y 5; menciones acotadas.
  assert.deepEqual(result.aspects, [
    { key: 'ambiente', rating: 4.5, mentions: 2, label: 'Ambiente' },
    { key: 'organizacion', rating: 5, mentions: 3, label: 'Organización' },
  ]);
  assert.equal(result.summary, 'Buen ambiente y buena organización.');
});

test('un comentario nuevo o borrado invalida la caché y se vuelve a analizar una sola vez', async () => {
  const created = await comment(bob, 5, 'Diversión asegurada.');
  await settle();
  assert.equal(fakeAgent.calls.length, 1);
  assert.equal((await insights()).analyzedCount, 4);
  assert.equal(fakeAgent.calls.length, 1);
  assert.equal((await request('DELETE', `${commentsUrl}/${created.data.data.id}`, { token: bob.token })).status, 200);
  await settle();
  assert.equal(fakeAgent.calls.length, 2);
  assert.equal((await insights()).analyzedCount, 3);
});

test('la consulta nunca espera al modelo: devuelve el último análisis mientras se genera uno nuevo', async () => {
  await pool.query("UPDATE comment_insights SET signature = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'");
  fakeAgent.delayMs = 400;
  const started = Date.now();
  const results = await Promise.all([1, 2, 3, 4].map(() => insights()));
  assert.ok(Date.now() - started < 400, 'las visitas no esperan al agente');
  assert.ok(results.every((result) => result.status === 'ready' && result.stale && result.refreshing));
  await settle();
  // Varias visitas simultáneas generan un único análisis.
  assert.equal(fakeAgent.calls.length, 1);
  const fresh = await insights();
  assert.equal(fresh.stale, false);
  assert.equal(fresh.refreshing, false);
});

test('sin análisis previo responde pending hasta que el agente termina', async () => {
  await pool.query('DELETE FROM comment_insights');
  fakeAgent.delayMs = 200;
  assert.deepEqual(await insights(), { status: 'pending' });
  assert.deepEqual(await insights(), { status: 'pending' });
  await settle();
  assert.equal((await insights()).status, 'ready');
  assert.equal(fakeAgent.calls.length, 1);
});

test('si el agente falla se muestra el último análisis (stale) y no se reintenta en cada visita', async () => {
  await pool.query("UPDATE comment_insights SET signature = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'");
  fakeAgent.status = 502;
  assert.equal((await insights()).refreshing, true);
  await settle();
  const stale = await insights();
  assert.equal(stale.status, 'ready');
  assert.equal(stale.stale, true);
  assert.equal(stale.refreshing, false);
  assert.equal(stale.analyzedCount, 3);
  assert.equal(fakeAgent.calls.length, 1, 'tras un fallo hay una pausa antes de reintentar');
  // Sin análisis previo, la sección queda como no disponible y la página sigue funcionando.
  await pool.query('DELETE FROM comment_insights');
  insightsService.resetFailures();
  assert.deepEqual(await insights(), { status: 'pending' });
  await settle();
  assert.deepEqual(await insights(), { status: 'unavailable' });
});

test('una respuesta del agente con un recuento imposible no se guarda tal cual', async () => {
  await pool.query('DELETE FROM comment_insights');
  fakeAgent.reply = { recommendCount: 50, aspects: 'nada', summary: { texto: 'no' } };
  await insights();
  await settle();
  const result = await insights();
  // 50 de 3 es imposible: se usa el recuento por estrellas (5 y 4 recomiendan, 2 no).
  assert.equal(result.recommendCount, 2);
  assert.equal(result.recommendPercent, 67);
  assert.deepEqual(result.aspects, []);
  assert.equal(result.summary, '');
});

test('sin token interno configurado no se llama al agente', async () => {
  await pool.query('DELETE FROM comment_insights');
  const token = process.env.AGENT_INTERNAL_TOKEN;
  process.env.AGENT_INTERNAL_TOKEN = '';
  try {
    await insights();
    await settle();
    assert.deepEqual(await insights(), { status: 'unavailable' });
    assert.equal(fakeAgent.calls.length, 0);
  } finally { process.env.AGENT_INTERNAL_TOKEN = token; }
});

test('el listado de comentarios se puede ordenar por valoración', async () => {
  const ratings = async (sort) => (await request('GET', `${commentsUrl}?sort=${sort}`)).data.data.items.map((item) => item.rating);
  assert.deepEqual(await ratings('rating_desc'), [5, 4, 2]);
  assert.deepEqual(await ratings('rating_asc'), [2, 4, 5]);
  assert.equal((await request('GET', `${commentsUrl}?sort=DROP`)).status, 400);
});
