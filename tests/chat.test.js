import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../server/app.js';
import { OUT_OF_SCOPE_MESSAGE } from '../server/prompt.js';

async function withServer(app, run) {
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('returns a study answer and forwards conversation history', async () => {
  let captured;
  const app = createApp({ generateAnswer: async (request) => {
    captured = request;
    return { isEducational: true, answer: 'La fotosíntesis transforma luz en energía química.' };
  } });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '¿Qué es la fotosíntesis?' }] }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).answer, 'La fotosíntesis transforma luz en energía química.');
    assert.equal(captured.messages.length, 1);
    assert.match(captured.systemPrompt, /finalidad educativa/);
  });
});

test('accepts a mathematics question', async () => {
  const app = createApp({ generateAnswer: async ({ messages }) => {
    assert.match(messages.at(-1).content, /fracciones/);
    return { isEducational: true, answer: 'Tres cuartos se escribe 3/4.' };
  } });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '¿Cómo sumo fracciones?' }] }) });
    assert.equal(response.status, 200);
    assert.match((await response.json()).answer, /3\/4/);
  });
});

test('accepts a language and literature question', async () => {
  const app = createApp({ generateAnswer: async () => ({ isEducational: true, answer: 'Un mito es un relato tradicional.' }) });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '¿Qué es un mito?' }] }) });
    assert.equal(response.status, 200);
    assert.match((await response.json()).answer, /relato tradicional/);
  });
});

test('does not return model text for a non-educational question', async () => {
  const app = createApp({ generateAnswer: async () => ({ isEducational: false, answer: 'Un chiste secreto.' }) });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Contame un chiste' }] }) });
    assert.equal(response.status, 200);
    const { answer } = await response.json();
    assert.equal(answer, OUT_OF_SCOPE_MESSAGE);
    assert.equal(answer.includes('chiste secreto'), false);
  });
});

test('supports consecutive turns, redacts contact details and preserves math numbers', async () => {
  let calls = 0;
  const app = createApp({ generateAnswer: async ({ messages }) => {
    calls++;
    assert.equal(messages.at(-1).content.includes('estudiante@example.com'), false);
    assert.equal(messages.at(-1).content.includes('12345678'), false);
    assert.equal(messages.at(-1).content.includes('11 1234-5678'), false);
    assert.equal(messages.at(-1).content.includes('2 + 2'), true);
    return { isEducational: true, answer: `Explicación ${calls}` };
  } });
  await withServer(app, async (base) => {
    const first = [{ role: 'user', content: '¿Qué es un mito?' }, { role: 'assistant', content: 'Es un relato tradicional.' }, { role: 'user', content: 'Dame un ejemplo, mi correo es estudiante@example.com, mi DNI 12345678 y teléfono 11 1234-5678. ¿Cuánto da 2 + 2?' }];
    const response = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: first }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).answer, 'Explicación 1');
    assert.equal(calls, 1);
  });
});

test('returns only a generic failure when the model is unavailable', async () => {
  const app = createApp({ generateAnswer: async () => { throw new Error('secret provider details'); } });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '¿Cuánto es 2 + 2?' }] }) });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: 'generation_failed' });
  });
});

test('returns a generic service error when the API key is missing', async () => {
  const app = createApp({ hasApiKey: false });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '¿Cuánto es 2 + 2?' }] }) });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'service_unavailable' });
  });
});
