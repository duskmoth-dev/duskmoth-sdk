# Offline same-origin browser example

From the SDK repository root, using Node.js 22 or later:

```sh
npm run example:browser
# Or: node examples/browser/server.mjs
```

Open **http://127.0.0.1:8788/**. Use this exact loopback address, not a public host.
Choose a scenario and select **Read local fixtures**. Stop the server with Ctrl+C.
If the port is busy, run `node examples/browser/server.mjs 8790` and use that port.
The same command works from an extracted SDK package; no dependency installation
or build is needed. Opening index.html with file:// will not work.

## What happens

The browser imports the actual SDK directly from the same local server. Clicking
the button sends only GET requests to:

- `/fixtures/SCENARIO/api/health`
- `/fixtures/SCENARIO/api/config`
- `/fixtures/SCENARIO/api/pass/info`

Every API response is synthetic. The `ready` scenario deliberately simulates
available flags despite having no real provider configuration. It is not a
deployable backend configuration and cannot submit any transaction.

| Scenario | Expected result |
| --- | --- |
| Available flags | Three simulated available results; no action is enabled |
| Disabled services | Health reachable, transfers and passes simulated unavailable |
| Missing fields | Unknown availability, never treated as ready |
| HTTP 503 | All endpoints unavailable; sanitized HTTP diagnostics |
| Invalid JSON | All endpoints unavailable; sanitized SDK diagnostics |

Each endpoint is handled independently; one failure does not hide other results.
There are no automatic retries. Response strings are never inserted as HTML.

## Boundaries

- No remote API, CDN, fonts, analytics, provider credentials, wallet connection,
  proofs, token burns, pass spending or blockchain requests.
- No browser persistence; reloading clears displayed results.
- The server binds only to 127.0.0.1 and rejects foreign Host headers.
- Static files are explicitly allowlisted; POST/PUT/DELETE are refused.
- CSP allows scripts, styles and connections only from this local origin.
- No production CORS changes. Same-origin hosting avoids the need for CORS in this
  demo; a real cross-origin API still requires the operator's CORS permission.
- SDK configuration flags and health responses do not establish a completed
  payment, sufficient balance or a user's pass balance.
- TypeScript declarations do not validate JSON. The UI checks fields at runtime.

## Verify

```sh
npm test
npm run check:package
```

The tests exercise local HTTP routes, SDK failure handling and a lightweight DOM
harness. They are not a full browser accessibility audit or a mainnet payment test.
