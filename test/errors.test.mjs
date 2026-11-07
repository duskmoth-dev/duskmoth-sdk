import test from 'node:test';
import assert from 'node:assert/strict';
import { DuskmothClient, DuskmothError } from '../src/index.js';

const baseUrl = 'https://example.com';
test('HTTP errors expose only allowlisted diagnostic metadata, never response contents', async () => {
  const ref = '00000000-0000-4000-8000-000000000001';
  for (const status of [400, 401, 403, 409, 410, 422, 429, 503]) {
    let calls = 0;
    const client = new DuskmothClient({ baseUrl, fetch: async () => {
      calls++;
      return new Response('sensitive bearer and recipient details', { status, headers: { 'X-Request-ID': ref, 'Retry-After': '12' } });
    } });
    await assert.rejects(client.health(), error => {
      assert.ok(error instanceof DuskmothError);
      assert.equal(error.status, status);
      assert.equal(error.code, 'HTTP_ERROR');
      assert.equal(error.requestId, ref);
      assert.equal(error.retryAfter, 12);
      assert.doesNotMatch(JSON.stringify(error) + error.message, /sensitive|bearer and recipient/);
      return true;
    });
    assert.equal(calls, 1);
  }
});

test('untrusted response headers cannot leak arbitrary data through errors', async () => {
  const client = new DuskmothClient({ baseUrl, fetch: async () => new Response('{}', {
    status: 429, headers: { 'X-Request-ID': 'private-response-data', 'Retry-After': 'private-response-data' },
  }) });
  await assert.rejects(client.health(), error => error.requestId === undefined && error.retryAfter === undefined);
});

test('malformed success JSON remains an error with no automatic retry', async () => {
  let calls = 0;
  const client = new DuskmothClient({ baseUrl, fetch: async () => { calls++; return new Response('<html>private-content</html>'); } });
  await assert.rejects(client.passInfo(), error => error.code === 'INVALID_JSON' && !error.message.includes('private-content'));
  assert.equal(calls, 1);
});

test('real abort-signal expiration is classified as TIMEOUT with no retry', async () => {
  let calls = 0;
  const client = new DuskmothClient({ baseUrl, timeout: 1, fetch: async (_url, { signal }) => {
    calls++;
    return new Promise((_resolve, reject) => {
      const hold = setTimeout(() => reject(new Error('fixture deadline')), 100);
      const abort = () => { clearTimeout(hold); reject(signal.reason); };
      if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
    });
  } });
  await assert.rejects(client.health(), error => error.code === 'TIMEOUT' && error.status === 0);
  assert.equal(calls, 1);
});

test('network errors do not attach underlying transport secrets', async () => {
  const client = new DuskmothClient({ baseUrl, fetch: async () => { throw new Error('fixture-private-details'); } });
  await assert.rejects(client.health(), error => error.code === 'NETWORK_ERROR' && !JSON.stringify(error).includes('fixture-private-details'));
});

test('base path is retained and external routes cannot be used to redirect proofs', async () => {
  const urls = [];
  const client = new DuskmothClient({ baseUrl: baseUrl + '/prefix/', fetch: async (url, options) => {
    urls.push(url); assert.equal(options.redirect, 'error'); return new Response('{}');
  } });
  await client.passInfo();
  assert.equal(urls[0], baseUrl + '/prefix/api/pass/info');
  for (const route of ['https://other.example/collect', '/../collect', '/config?secret=value']) {
    await assert.rejects(client.request(route), TypeError);
  }
});
