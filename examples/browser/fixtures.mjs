// Synthetic public configuration only. Never copy real proofs into a fixture.
export const scenarios = Object.freeze(['ready', 'disabled', 'partial', 'unavailable', 'invalid-json']);
export const endpoints = Object.freeze(['health', 'config', 'pass/info']);

export function fixture(scenario, endpoint) {
  if (!scenarios.includes(scenario) || !endpoints.includes(endpoint)) return null;
  if (scenario === 'unavailable') return { status: 503, body: { error: 'Offline fixture: service unavailable.' } };
  if (scenario === 'invalid-json') return { status: 200, raw: 'Offline fixture: not JSON' };
  if (scenario === 'partial') return { status: 200, body: {} };
  const enabled = scenario === 'ready';
  const status = {
    mode: 'development', network: 'mainnet-beta', ai: 'rules',
    screening: 'off', screeningScope: 'sanctions-only', data: 'public-rpc',
    liveSend: enabled,
    transferStatus: enabled ? 'wallet-approval-required' : 'disabled',
    transferBlockReason: enabled ? null : 'Offline fixture: transfers disabled.',
    demoWallet: false, relayerProxy: false,
  };
  if (endpoint === 'health') return { status: 200, body: { ok: true, ...status } };
  if (endpoint === 'config') return { status: 200, body: { ...status, limits: { SOL: 5, USDC: 500 } } };
  return { status: 200, body: {
    enabled, reason: enabled ? null : 'Offline fixture: passes unavailable.',
    mint: '', token: null, price: 50000, maxPerBurn: 50, demo: true,
    storage: 'file', durable: false, kid: null, publicKey: null,
    suite: 'RSABSSA-SHA384-PSS-Randomized',
    features: {
      'split-withdraw': { cost: 1, label: 'Split withdraw' },
      'ai-pack': { cost: 1, label: 'AI Pack', enabled },
      'private-payroll': { cost: 1, label: 'Private payroll', enabled },
    },
  } };
}
