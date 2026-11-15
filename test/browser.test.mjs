import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { get } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createDemoServer } from '../examples/browser/server.mjs';
import { createFixtureClient, readAvailability } from '../examples/browser/model.mjs';
import { fixture, scenarios, endpoints } from '../examples/browser/fixtures.mjs';

async function withServer(run) {
  const server = createDemoServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); }
}

test('browser demo and SDK modules are served from one loopback origin without CORS headers', async () => {
  await withServer(async origin => {
    for (const path of ['/', '/style.css', '/examples/browser/demo.mjs',
      '/examples/browser/model.mjs', '/src/index.js', '/src/validation.js']) {
      const response = await fetch(origin + path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get('access-control-allow-origin'), null);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.match(response.headers.get('content-security-policy'), /connect-src 'self'/);
      assert.ok((await response.text()).length > 0);
    }
    const page = await (await fetch(origin)).text();
    assert.match(page, /OFFLINE FIXTURES/);
    assert.match(page, /<label for="scenario">/);
    assert.match(page, /role="status"/);
    assert.match(page, /aria-busy="false"/);
  });
});

test('all fixture routes return the documented scenarios, never a real provider response', async () => {
  await withServer(async origin => {
    for (const scenario of scenarios) for (const endpoint of endpoints) {
      const response = await fetch(`${origin}/fixtures/${scenario}/api/${endpoint}`);
      const expected = fixture(scenario, endpoint);
      assert.equal(response.status, expected.status);
      if (expected.raw) assert.equal(await response.text(), expected.raw);
      else assert.deepEqual(await response.json(), expected.body);
    }
  });
});

test('ready and disabled fixtures expose only simulated availability', async () => {
  await withServer(async origin => {
    for (const [scenario, expected] of [['ready', 'Simulated available'], ['disabled', 'Simulated unavailable']]) {
      const rows = await readAvailability(createFixtureClient(origin, scenario));
      assert.equal(rows.length, 3);
      // A reachable health endpoint can coexist with disabled transfers.
      assert.equal(rows[0].state, 'Simulated available');
      assert.equal(rows[1].state, expected);
      assert.equal(rows[2].state, expected);
      assert.match(rows[2].detail, /not your pass balance/);
    }
  });
});

test('missing fields and non-object JSON never become an available state', async () => {
  await withServer(async origin => {
    const rows = await readAvailability(createFixtureClient(origin, 'partial'));
    assert.ok(rows.every(row => row.state === 'Unknown'));
  });
  for (const value of [null, [], 'unexpected']) {
    const rows = await readAvailability({
      health: async () => value, config: async () => value, passInfo: async () => value,
    });
    assert.ok(rows.every(row => row.state === 'Unknown'));
  }
});

test('HTTP 503 and invalid JSON remain unavailable without exposing response bodies', async () => {
  await withServer(async origin => {
    for (const scenario of ['unavailable', 'invalid-json']) {
      const rows = await readAvailability(createFixtureClient(origin, scenario));
      assert.ok(rows.every(row => row.state === 'Unavailable'));
      assert.ok(rows.every(row => /No retry/.test(row.detail)));
      assert.ok(rows.every(row => !/Offline fixture:/.test(row.detail)));
    }
  });
});

test('a failed endpoint does not hide the other endpoint results and never retries', async () => {
  const calls = [];
  const rows = await readAvailability({
    health: async () => { calls.push('health'); throw new Error('private provider message'); },
    config: async () => { calls.push('config'); return { liveSend: false }; },
    passInfo: async () => { calls.push('pass'); return { enabled: true }; },
  });
  assert.deepEqual(calls, ['health', 'config', 'pass']);
  assert.deepEqual(rows.map(row => row.state), ['Unavailable', 'Simulated unavailable', 'Simulated available']);
  assert.ok(!JSON.stringify(rows).includes('private provider message'));
});

test('fixture client rejects remote, credentialed or unknown scenario targets', () => {
  for (const origin of ['https://example.com', 'http://localhost:8788',
    'http://user:secret@127.0.0.1:8788', 'http://127.0.0.1:8788/prefix',
    'http://127.0.0.1:8788/?anything=1']) {
    assert.throws(() => createFixtureClient(origin, 'ready'), TypeError);
  }
  assert.throws(() => createFixtureClient('http://127.0.0.1:8788', '../ready'), TypeError);
});

test('server refuses writes, private paths, foreign Hosts and unknown fixture endpoints', async () => {
  await withServer(async origin => {
    for (const path of ['/api/pass/issue', '/.env', '/package.json', '/server.mjs',
      '/fixtures/ready/api/payroll/authorize', '/fixtures/unknown/api/health',
      '/fixtures/ready/api/health?remote=true', '/%2e%2e/.env']) {
      assert.equal((await fetch(origin + path)).status, 404, path);
    }
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const response = await fetch(origin + '/fixtures/ready/api/health', { method });
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('allow'), 'GET');
    }
    // Node fetch normalizes Host; use HTTP directly to exercise the server guard.
    const status = await new Promise((resolve, reject) => {
      get(origin, { headers: { Host: 'foreign.example' } }, response => {
        response.resume(); resolve(response.statusCode);
      }).on('error', reject);
    });
    assert.equal(status, 403);
  });
});

test('browser controller renders with textContent, restores controls and never touches a wallet', async () => {
  const source = await readFile(new URL('../examples/browser/demo.mjs', import.meta.url), 'utf8');
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|localStorage|sessionStorage|window\.solana/.test(source));
  const oldDocument = globalThis.document;
  const oldLocation = globalThis.location;
  const oldFetch = globalThis.fetch;
  let handler;
  const makeElement = () => ({ textContent: '', children: [], attributes: {},
    append(...items) { this.children.push(...items); },
    replaceChildren() { this.children = []; },
    setAttribute(key, value) { this.attributes[key] = value; } });
  const elements = Object.fromEntries(['form', 'select', 'button', '#results', '#notice'].map(key => [key, makeElement()]));
  elements.form.addEventListener = (event, callback) => { assert.equal(event, 'submit'); handler = callback; };
  elements.select.value = 'ready';
  globalThis.document = { querySelector: selector => elements[selector], createElement: makeElement };
  globalThis.location = { origin: 'http://127.0.0.1:8788' };
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    assert.equal(new URL(url).origin, globalThis.location.origin);
    assert.equal(options.method, 'GET');
    return new Response(JSON.stringify(url.endsWith('/health') ? { ok: true }
      : url.endsWith('/config') ? { liveSend: true } : { enabled: true }));
  };
  try {
    await import('../examples/browser/demo.mjs');
    await handler({ preventDefault() {} });
    assert.equal(requests.length, 3);
    assert.equal(elements['#results'].children.length, 3);
    assert.match(elements['#results'].children[0].children[0].textContent, /Simulated available/);
    assert.equal(elements.button.disabled, false);
    assert.equal(elements['#results'].attributes['aria-busy'], 'false');
    elements.select.value = 'invalid';
    await handler({ preventDefault() {} });
    assert.equal(requests.length, 3);
    assert.match(elements['#notice'].textContent, /could not run/);
    assert.equal(elements.button.disabled, false);
  } finally {
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
    if (oldLocation === undefined) delete globalThis.location; else globalThis.location = oldLocation;
    globalThis.fetch = oldFetch;
  }
});
