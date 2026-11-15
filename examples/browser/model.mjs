import { DuskmothClient, DuskmothError } from '../../src/index.js';

// Reject remote origins even if this helper is called outside the demo page.
export function createFixtureClient(origin, scenario) {
  const url = new URL(origin);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/'
    || url.username || url.password || url.search || url.hash) {
    throw new TypeError('Use the loopback fixture server origin.');
  }
  if (!['ready', 'disabled', 'partial', 'unavailable', 'invalid-json'].includes(scenario)) {
    throw new TypeError('Unknown offline scenario.');
  }
  return new DuskmothClient({ baseUrl: `${url.origin}/fixtures/${scenario}` });
}

export async function readAvailability(client) {
  const results = await Promise.allSettled([client.health(), client.config(), client.passInfo()]);
  const names = ['Health', 'Configuration', 'Moth Pass'];
  const rows = results.map((result, index) => {
    if (result.status === 'rejected') {
      const error = result.reason;
      return { endpoint: names[index], state: 'Unavailable',
        detail: error instanceof DuskmothError
          ? `SDK ${error.code}; HTTP ${error.status || 'unknown'}. No retry was sent.`
          : 'Could not read fixture data. No action was taken.' };
    }
    const value = result.value;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { endpoint: names[index], state: 'Unknown', detail: 'Missing or unexpected fixture fields.' };
    }
    const flag = index === 0 ? value.ok : index === 1 ? value.liveSend : value.enabled;
    return { endpoint: names[index],
      state: flag === true ? 'Simulated available' : flag === false ? 'Simulated unavailable' : 'Unknown',
      detail: index === 0 ? 'Reachability only, not proof of a payment.'
        : index === 1 ? 'Configuration flag only, not a live provider check.'
          : 'Issuer availability only, not your pass balance.' };
  });
  return rows;
}
