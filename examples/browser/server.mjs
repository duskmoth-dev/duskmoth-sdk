import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { fixture } from './fixtures.mjs';

// Explicit allowlist: never expose the working directory or arbitrary paths.
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/examples/browser/demo.mjs', ['demo.mjs', 'text/javascript; charset=utf-8']],
  ['/examples/browser/model.mjs', ['model.mjs', 'text/javascript; charset=utf-8']],
  ['/src/index.js', ['../../src/index.js', 'text/javascript; charset=utf-8']],
  ['/src/validation.js', ['../../src/validation.js', 'text/javascript; charset=utf-8']],
]);
const policy = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export function createDemoServer() {
  return createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', policy);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    // Reject foreign Host headers as well as binding only to loopback.
    if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host || '')) {
      res.writeHead(403); res.end('Loopback fixture server only.'); return;
    }
    if (req.method !== 'GET') {
      res.writeHead(405, { Allow: 'GET' }); res.end('Read-only fixture server.'); return;
    }
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.search) { res.writeHead(404); res.end('Unknown fixture.'); return; }
      const match = /^\/fixtures\/([a-z-]+)\/api\/(health|config|pass\/info)$/.exec(url.pathname);
      if (match) {
        const response = fixture(match[1], match[2]);
        if (response) {
          res.writeHead(response.status, { 'Content-Type': response.raw ? 'text/plain' : 'application/json' });
          res.end(response.raw ?? JSON.stringify(response.body)); return;
        }
      }
      const asset = assets.get(url.pathname);
      if (!asset) { res.writeHead(404); res.end('Not found.'); return; }
      const bytes = await readFile(new URL(asset[0], import.meta.url));
      res.writeHead(200, { 'Content-Type': asset[1] }); res.end(bytes);
    } catch {
      res.writeHead(500); res.end('Offline fixture server error.');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = process.argv[2] ?? '8788';
  if (!/^\d+$/.test(input) || Number(input) < 1024 || Number(input) > 65535) {
    console.error('Usage: node examples/browser/server.mjs [port from 1024 to 65535]');
    process.exitCode = 1;
  } else {
    const server = createDemoServer();
    server.on('error', () => {
      console.error('Could not start the local fixture server. Try another port.');
      process.exitCode = 1;
    });
    server.listen(Number(input), '127.0.0.1', () => {
      console.log(`Offline fixture demo: http://127.0.0.1:${input}/`);
      console.log('Synthetic responses only. No wallet, credentials or external API requests.');
    });
  }
}
