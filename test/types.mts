import { DuskmothClient, DuskmothError, type PassProof, type Payment } from '../src/index.js';
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
