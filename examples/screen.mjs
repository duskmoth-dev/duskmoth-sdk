import { pathToFileURL } from 'node:url';
import { DuskmothClient } from '../src/index.js';
import { safeDiagnostic } from './premium.mjs';

// Submits the chosen address for sanctions screening. Not a privacy/AML clearance.
export async function screenRecipient(client, recipient) {
  if (typeof recipient !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(recipient)) {
    throw new TypeError('Provide a Solana public address, never a private key.');
  }
  return client.screen({ recipient });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const recipient = process.argv[2];
  if (!recipient || process.argv[3] !== '--allow-address-screening') {
    console.error('Usage: node examples/screen.mjs PUBLIC_ADDRESS --allow-address-screening');
    console.error('This sends the public address to the configured service and its screening provider.');
    process.exitCode = 1;
  } else {
    try {
      const client = new DuskmothClient({ baseUrl: process.env.DUSKMOTH_BASE_URL || 'https://duskmoth.xyz' });
      const result = await screenRecipient(client, recipient);
      // Print only coarse status, not the submitted address or provider payload.
      console.log(JSON.stringify({
        allowed: result?.allowed === true,
        status: result?.status ?? 'unknown',
        scope: 'Sanctions screening only; not a privacy or full-risk assessment.',
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify(safeDiagnostic(error)));
      process.exitCode = 1;
    }
  }
}
