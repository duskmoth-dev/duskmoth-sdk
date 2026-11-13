# Duskmoth SDK

[![CI](https://github.com/duskmoth-dev/duskmoth-sdk/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/duskmoth-dev/duskmoth-sdk/actions/workflows/ci.yml)

Dependency-free JavaScript/TypeScript HTTP client for Duskmoth on Solana.
Version **0.2.1** adds runnable integration examples, package verification, and a tokenless publishing workflow.
Moth Pass issuance/redemption, AI Pack plans, and Payroll authorization remain available.

This is **not** a cryptographic SDK, a Privacy Cash replacement, or a wallet-signing library.
It never burns tokens, signs messages, deposits, withdraws, broadcasts transactions, or executes payroll.
However, its premium POST methods **can consume existing Moth Passes**. Use them only after user approval.

## Install from GitHub Releases

Download `duskmoth-dev-sdk-0.2.1.tgz` and `duskmoth-sdk-0.2.1-SHA256SUMS.txt` from
[v0.2.1](https://github.com/duskmoth-dev/duskmoth-sdk/releases/tag/v0.2.1).
Verify the archive before installing:

```sh
sha256sum --ignore-missing -c duskmoth-sdk-0.2.1-SHA256SUMS.txt
npm install ./duskmoth-dev-sdk-0.2.1.tgz
```

The release archive can be installed now. npm publication requires owner setup;
the publishing workflow alone does not mean the package is on npm.
See [publishing and verification](docs/publishing.md).
Requires Node.js 22+ or a modern browser with fetch and AbortSignal.timeout.

## Try the examples

```sh
git clone https://github.com/duskmoth-dev/duskmoth-sdk.git
cd duskmoth-sdk
node examples/offline.mjs
npm test
npm run check:package
```

The default demo is offline and needs no wallet or credentials.
See [all examples and their effects](examples/README.md).

## Read configuration

```js
import { DuskmothClient } from '@duskmoth-dev/sdk';

const client = new DuskmothClient({ baseUrl: 'https://duskmoth.xyz' });
const configuration = await client.config();
const issuer = await client.passInfo();
// Read issuer.enabled, issuer.reason, issuer.price, and issuer.features.
// Availability is not a pass balance or proof of a completed payment.
```

HTTPS is required except for localhost. An optional base-path prefix is supported.
Browser access depends on the server's actual CORS policy; the SDK does not bypass it.
Provider credentials must remain on the server and must never be supplied to this client.

## API methods

| Method | Endpoint | Effect |
|---|---|---|
| `config()` | GET `/api/config` | Read configuration |
| `health()` | GET `/api/health` | Read service status |
| `intent(message)` | POST `/api/intent` | Prepare an intent, never execute it |
| `activity(address)` | POST `/api/activity` | Read public-chain activity |
| `screen({sender, recipient})` | POST `/api/screen` | Sanctions-only check |
| `score({address, ts, signature})` | POST `/api/score` | Wallet-owned privacy estimate |
| `relayerConfig()` | GET `/api/relayer/config` | Read fees and minimums |
| `passInfo()` | GET `/api/pass/info` | Read issuer and feature configuration |
| `issuePasses({burnSignature, blinded, proof})` | POST `/api/pass/issue` | Claim blinded signatures for an existing burn |
| `redeemPass({...pass, feature:'split-withdraw'})` | POST `/api/pass/redeem` | Spend one finalized pass for split-withdraw access |
| `aiPlan({prompt, pass})` | POST `/api/ai-pack/plan` | Spend one pass to prepare a plan |
| `authorizePayroll({payments, pass})` | POST `/api/payroll/authorize` | Spend one pass to authorize a bound batch; does not send payments |

Always check configuration for current costs, limits, and availability.
AI Pack and Payroll use **separate** passes. An AI plan is not a Payroll authorization.
Server balances, on-chain confirmations, screening, and live fee checks remain required by the executing app.
There is no invented `runPayroll()` or `privateBalance()` HTTP method.

## Premium requests and recovery

Supply a finalized bearer proof as `{kid, msg, sig, requestId}`. The wallet flow must create and verify it;
this HTTP SDK does not generate, blind, unblind, or verify passes.
Generate a cryptographically random 16-byte requestId, encode it as 32 lowercase hexadecimal characters,
and **save it with the exact request and pass before the first POST**.

```js
// savedRequest must already be prepared, approved and securely saved by your app.
// Calling this can spend ONE pass; it does not send a blockchain payment.
const receipt = await client.aiPlan(savedRequest);
const draft = receipt.result;
// Show draft.payments to the user. Payroll is a separate operation with its own pass.
```

For Payroll, `payments` is an array of `{recipient, amount, token}`, with 1–20 unique addresses,
one token per batch (`SOL` or `USDC`), and numeric amounts. The backend enforces current configured limits.
Authorization is bound to the validated batch. Keep the original payment order and amounts for recovery.

See [the full recovery and API guide](docs/premium-api.md) and [the side-effect-free integration example](examples/premium.mjs).

## Timeouts and errors

| Operation | Default |
|---|---|
| Ordinary requests | 15 seconds |
| Screening / pass redemption | 30 seconds |
| Pass issuance | 60 seconds |
| AI Pack / Payroll authorization | 90 seconds |

Existing `timeout` configuration still overrides all operations; `timeouts` overrides individual operations:

```js
const client = new DuskmothClient({
  baseUrl: 'https://duskmoth.xyz',
  timeouts: { screen: 30000, aiPlan: 90000 },
});
```

`DuskmothError` has `status`, `code`, and optional sanitized `requestId` and numeric `retryAfter` (seconds).
Codes: `HTTP_ERROR`, `INVALID_JSON`, `TIMEOUT`, `NETWORK_ERROR`.
Raw provider response bodies are not attached to errors. The client does not log or persist requests and rejects redirects.
It **never automatically retries** a request. A timeout, invalid JSON or disconnected response does not prove a pass was unspent.

## Development and limits

Join [Discussions](https://github.com/duskmoth-dev/duskmoth-sdk/discussions) for integration questions,
or choose a [good first issue](https://github.com/duskmoth-dev/duskmoth-sdk/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22).
See [contribution requirements](CONTRIBUTING.md).
CI tests Node.js 22 and 24 and checks the package allowlist. Dependency review checks pull requests;
Dependabot monitors action updates. OpenSSF Scorecard reviews repository practices, not payment privacy.

`npm test` uses unfunded, offline fixtures. Tests do not establish funded mainnet operation or an independent security audit.
TypeScript declarations cover the premium contracts; existing basic methods retain their unknown response type.

Private transactions do not guarantee anonymity. Scorechain sanctions checks are not full AML screening.
Use [Duskmoth](https://duskmoth.xyz), [report an issue](https://github.com/duskmoth-dev/duskmoth-sdk/issues),
or contact hello@duskmoth.xyz. Official X: [@duskmoth_app](https://x.com/duskmoth_app).
