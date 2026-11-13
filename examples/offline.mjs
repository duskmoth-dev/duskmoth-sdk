import { DuskmothClient } from '../src/index.js';
import { readStatus } from './status.mjs';

// Default demonstration: no network access, credentials, wallet, or funds.
const client = new DuskmothClient({
  baseUrl: 'https://example.invalid',
  fetch: async url => new Response(JSON.stringify(
    url.endsWith('/health')
      ? { ok: true, network: 'offline-fixture', liveSend: false }
      : { enabled: false, features: {} },
  )),
});
console.log(JSON.stringify({ mode: 'offline-fixture', ...await readStatus(client) }, null, 2));
