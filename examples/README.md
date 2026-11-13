# Integration examples

Requires Node.js 22+. Clone this repository; no dependency installation is needed.
No example contains a key, signs a transaction, or transfers funds.

| Example | Run | Effect |
| --- | --- | --- |
| Offline demonstration | `node examples/offline.mjs` | Uses local fixtures; no network |
| Service availability | `npm run example:status` | Reads health and pass configuration |
| Sanctions screening | `node examples/screen.mjs PUBLIC_ADDRESS --allow-address-screening` | Sends the chosen address to the service and screening provider |
| Premium helpers | Import `examples/premium.mjs` | No action on import; explicit calls can consume a pass |

Set `DUSKMOTH_BASE_URL` to an HTTPS instance you trust, or a localhost test server.
This is a public service URL, **not an API key**. Never place provider credentials in it.
The CLI examples are for Node.js. Browser usage additionally depends on the host's CORS policy.

## Premium operations

`readPremiumAvailability(client)` is read-only. Availability is not a user's pass balance.
`requestApprovedAIPlan` and `authorizeApprovedPayroll` require a confirmation callback.
Use real proofs only in your own application, after explicit approval; do not paste proofs
into a terminal, issue, demonstration, or public fixture.

Before any pass-consuming call, securely persist the exact request with its original
pass and random recovery ID. A network failure does not prove the pass was unspent.
See [premium API and recovery](../docs/premium-api.md).

## What these examples do not establish

An authorization receipt does not execute payroll. Health checks do not prove that a
funded withdrawal will succeed. Sanctions screening is not an anonymity guarantee.
Automated examples and tests use unfunded fixtures, not mainnet payments.
