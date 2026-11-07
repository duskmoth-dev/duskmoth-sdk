import { DuskmothClient, DuskmothError } from '../src/index.js';

// Importing this module performs no HTTP requests and consumes no passes.
export function createClient(baseUrl) {
  return new DuskmothClient({ baseUrl });
}

export async function readPremiumAvailability(client) {
  return client.passInfo(); // Read-only; not the user's pass balance.
}

// The host app owns secure persistence and explicit user approval.
// Both operations below can spend one EXISTING pass. Neither sends payments.
// After an uncertain response, call again with the SAME securely saved request.
export async function requestApprovedAIPlan(client, savedRequest, confirm) {
  if (typeof confirm !== 'function' || !await confirm('Use 1 Moth Pass to prepare this AI plan?')) return null;
  return client.aiPlan(savedRequest);
}

export async function authorizeApprovedPayroll(client, savedRequest, confirm) {
  if (typeof confirm !== 'function' || !await confirm('Use 1 Moth Pass to authorize this reviewed payroll batch?')) return null;
  // Perform current balance, fees, sanctions and ownership checks in the host app FIRST.
  return client.authorizePayroll(savedRequest);
}

export function safeDiagnostic(error) {
  if (!(error instanceof DuskmothError)) return { code: 'CLIENT_ERROR' };
  return { status: error.status, code: error.code, requestId: error.requestId, retryAfter: error.retryAfter };
}
