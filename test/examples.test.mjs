import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { DuskmothClient } from '../src/index.js';
import { readStatus } from '../examples/status.mjs';
import { screenRecipient } from '../examples/screen.mjs';

test('status example reads only health and pass availability without inventing a balance', async () => {
  const calls = [];
  const client = new DuskmothClient({ baseUrl: 'https://example.invalid',
    fetch: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify(url.endsWith('/health')
        ? { ok: true, network: 'mainnet-beta', liveSend: true, secret: 'must-not-return' }
        : { enabled: true, features: { 'ai-pack': { cost: 1 } }, proof: 'must-not-return' }));
    } });
  assert.deepEqual(await readStatus(client), {
    reachable: true, network: 'mainnet-beta', transfersEnabled: true,
    passesEnabled: true, features: { 'ai-pack': { cost: 1 } },
  });
  assert.deepEqual(calls.map(call => [new URL(call.url).pathname, call.options.method]),
    [['/api/health', 'GET'], ['/api/pass/info', 'GET']]);
});

test('status example treats missing readiness as unavailable, not success', async () => {
  const client = new DuskmothClient({ baseUrl: 'https://example.invalid',
    fetch: async () => new Response('{}') });
  assert.deepEqual(await readStatus(client), {
    reachable: false, network: 'unknown', transfersEnabled: false, passesEnabled: false, features: {},
  });
});

test('screening example submits only the requested public address', async () => {
  let seen;
  const client = new DuskmothClient({ baseUrl: 'https://example.invalid',
    fetch: async (url, options) => {
      seen = { url, body: JSON.parse(options.body) };
      return new Response('{"allowed":false}');
    } });
  assert.deepEqual(await screenRecipient(client, '11111111111111111111111111111111'), { allowed: false });
  assert.deepEqual(seen, { url: 'https://example.invalid/api/screen',
    body: { recipient: '11111111111111111111111111111111' } });
});

test('screening example rejects missing or malformed input before HTTP', async () => {
  let calls = 0;
  const client = { screen: () => { calls++; } };
  for (const value of [undefined, '', 'not-an-address', 'a'.repeat(88)]) {
    await assert.rejects(screenRecipient(client, value), TypeError);
  }
  assert.equal(calls, 0);
});

test('offline demo runs without network or provider credentials', () => {
  const result = JSON.parse(execFileSync(process.execPath, ['examples/offline.mjs'], { encoding: 'utf8' }));
  assert.equal(result.mode, 'offline-fixture');
  assert.equal(result.network, 'offline-fixture');
  assert.equal(result.transfersEnabled, false);
  assert.equal(result.passesEnabled, false);
});
