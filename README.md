# Duskmoth SDK

A small, dependency-free JavaScript client for the Duskmoth HTTP API.
It is **not** a cryptographic SDK, a Privacy Cash replacement, or a wallet-signing library.
It does not deposit, withdraw, sign, broadcast, or automatically execute AI intents.

## Install the GitHub release package

Download `duskmoth-dev-sdk-0.1.0.tgz` from this repository's GitHub Releases and verify its SHA-256 against the release checksum.

```sh
npm install ./duskmoth-dev-sdk-0.1.0.tgz
```

No npm registry publication is claimed.

```js
import { DuskmothClient } from '@duskmoth-dev/sdk';
const client = new DuskmothClient({ baseUrl: 'https://duskmoth.xyz' });
const configuration = await client.config();
const preview = await client.intent('Shield 0.03 SOL');
// Review only. This client cannot execute the proposed transaction.
```

Use `config()`, `health()`, `activity(address)`, `screen({sender, recipient})`, `score({address, ts, signature})`, and `relayerConfig()`.
Score requests require a valid wallet-generated ownership proof; the client does not create one.
Responses are the server's actual JSON contract, not invented balances or simulated approvals.
HTTPS is required except for localhost. API/provider credentials must never be supplied to this client.
The browser origin and API's CORS policy determine browser access; this package does not bypass CORS.

## Development

`npm test` uses unfunded, offline fixtures. Requires Node.js 22+.

Sanctions checks are not full AML screening. Privacy and funded mainnet operation are not guaranteed by this package.
Contact: hello@duskmoth.xyz.
