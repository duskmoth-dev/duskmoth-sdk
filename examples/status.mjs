import { pathToFileURL } from 'node:url';
import { DuskmothClient } from '../src/index.js';
import { safeDiagnostic } from './premium.mjs';

// Reads public availability only. Never signs, broadcasts, or spends a pass.
export async function readStatus(client) {
  const health = await client.health();
  const pass = await client.passInfo();
  return {
    reachable: health?.ok === true,
    network: health?.network ?? 'unknown',
    transfersEnabled: health?.liveSend === true,
    passesEnabled: pass?.enabled === true,
    features: pass?.features ?? {},
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const client = new DuskmothClient({ baseUrl: process.env.DUSKMOTH_BASE_URL || 'https://duskmoth.xyz' });
    console.log(JSON.stringify(await readStatus(client), null, 2));
  } catch (error) {
    console.error(JSON.stringify(safeDiagnostic(error)));
    process.exitCode = 1;
  }
}
