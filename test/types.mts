import { DuskmothClient, DuskmothError, type PassProof, type Payment,
  type ConfigResponse, type HealthResponse, type RelayerConfigResponse } from '../src/index.js';
const client = new DuskmothClient({ baseUrl: 'https://example.com', timeouts: { aiPlan: 90000 } });
declare const pass: PassProof;
declare const payments: Payment[];
const info = await client.passInfo();
const price: number = info.price;
const planned = await client.aiPlan({ prompt: 'Prepared request', pass });
const token: 'SOL' | 'USDC' = planned.result.payments[0].token;
const authorized = await client.authorizePayroll({ payments, pass });
const binding: string = authorized.binding;
await client.redeemPass({ ...pass, feature: 'split-withdraw' });
// @ts-expect-error Payroll must use its bound authorization endpoint.
await client.redeemPass({ ...pass, feature: 'private-payroll' });
// @ts-expect-error Recovery requestId is mandatory.
await client.aiPlan({ prompt: 'Prepared request', pass: { kid: '', msg: '', sig: '' } });
const error = new DuskmothError('safe', 429, { retryAfter: 5 });
const delay: number | undefined = error.retryAfter;
void [price, token, binding, delay];

const health = await client.health();
const config = await client.config();
const relayer = await client.relayerConfig();
const reachable: boolean | undefined = health.ok;
const live: boolean | undefined = config.liveSend;
const block: string | null | undefined = config.transferBlockReason;
const limit: number | undefined = config.limits?.SOL;
const fee: number | undefined = relayer.withdraw_fee_rate;
const minimum: number | undefined = relayer.minimum_withdrawal?.usdc;
const decimals: number | undefined = info.token?.decimals;
const unknownField: unknown = config.futureField;
const partial: ConfigResponse = {};
const enabled: ConfigResponse = {
  mode: 'production', network: 'mainnet-beta', ai: 'claude',
  screening: 'scorechain', screeningScope: 'sanctions-only', data: 'helius',
  liveSend: true, transferStatus: 'wallet-approval-required', transferBlockReason: null,
  demoWallet: false, relayerProxy: true, limits: { SOL: 5, USDC: 500 },
  futureField: { value: 'unknown extension' },
};
const unavailable: ConfigResponse = {
  liveSend: false, transferStatus: 'unavailable', transferBlockReason: 'RPC unavailable',
};
const healthy: HealthResponse = { ok: true, ...enabled };
const fees: RelayerConfigResponse = {
  withdraw_fee_rate: 0.0035, minimum_withdrawal: { sol: 0.01 },
  prices: { future_asset: 1 }, unknownUpstreamField: null,
};
// @ts-expect-error An optional availability flag is not a definite boolean.
const definiteReady: boolean = config.liveSend;
// @ts-expect-error Configuration flags are read-only.
config.liveSend = true;
// @ts-expect-error Nested limits are read-only.
if (config.limits) config.limits.SOL = 10;
// @ts-expect-error A string is not a readiness flag.
const wrongHealth: HealthResponse = { ok: 'true' };
// @ts-expect-error Limits use numeric amounts.
const wrongLimit: ConfigResponse = { limits: { SOL: '5' } };
// @ts-expect-error A successful payment is not a transfer availability status.
const wrongStatus: ConfigResponse = { transferStatus: 'completed' };
// @ts-expect-error Relayer fee rates are numeric.
const wrongFee: RelayerConfigResponse = { withdraw_fee_rate: '0.0035' };
// @ts-expect-error Unknown server fields need a runtime check before use.
const assumedExtension: string = config.futureField;
void [reachable, live, block, limit, fee, minimum, decimals, unknownField, partial,
  enabled, unavailable, healthy, fees, definiteReady, wrongHealth, wrongLimit,
  wrongStatus, wrongFee, assumedExtension];
