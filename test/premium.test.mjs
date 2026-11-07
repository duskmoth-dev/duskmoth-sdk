import test from 'node:test';
import assert from 'node:assert/strict';
import { DuskmothClient } from '../src/index.js';
import { requestApprovedAIPlan, authorizeApprovedPayroll } from '../examples/premium.mjs';

// Deliberately unsigned offline fixtures: never submit these to a live server.
const address = '11111111111111111111111111111111';
const second = 'So11111111111111111111111111111111111111112';
const proof = () => ({ kid: 'a'.repeat(16), msg: Buffer.alloc(32).toString('base64'),
  sig: Buffer.alloc(256).toString('base64'), requestId: 'b'.repeat(32) });
const purchase = () => ({ burnSignature: '1'.repeat(64), blinded: [Buffer.alloc(256).toString('base64')],
  proof: { address, ts: 1, signature: '1'.repeat(64) } });
const payments = () => [{ recipient: address, amount: 0.03, token: 'SOL' }];
function fixture(response = {}) {
  const calls = [];
  const client = new DuskmothClient({ baseUrl: 'https://example.com',
    fetch: async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify(response)); } });
  return { client, calls };
}

test('premium HTTP methods match the exact backend routes and whitelisted payloads', async () => {
  const { client, calls } = fixture({ ok: true });
  const p = proof(), issue = purchase();
  await client.passInfo();
  await client.issuePasses({ ...issue, ignored: 'must not leave client' });
  await client.redeemPass({ ...p, feature: 'split-withdraw', ignored: 'must not leave client' });
  await client.aiPlan({ prompt: `  0.03 SOL to ${address}  `, pass: { ...p, ignored: 'must not leave client' } });
  await client.authorizePayroll({ payments: [{ ...payments()[0], ignored: true }], pass: p });
  assert.deepEqual(calls.map(c => new URL(c.url).pathname), [
    '/api/pass/info', '/api/pass/issue', '/api/pass/redeem', '/api/ai-pack/plan', '/api/payroll/authorize',
  ]);
  assert.deepEqual(calls.map(c => c.options.method), ['GET', 'POST', 'POST', 'POST', 'POST']);
  assert.deepEqual(JSON.parse(calls[1].options.body), issue);
  assert.deepEqual(JSON.parse(calls[2].options.body), { ...p, feature: 'split-withdraw' });
  assert.deepEqual(JSON.parse(calls[3].options.body), { prompt: `0.03 SOL to ${address}`, pass: p });
  assert.deepEqual(JSON.parse(calls[4].options.body), { payments: payments(), pass: p });
  for (const c of calls) {
    assert.equal(c.options.credentials, 'omit');
    assert.equal(c.options.cache, 'no-store');
    assert.equal(c.options.redirect, 'error');
    assert.deepEqual(c.options.headers, { 'Content-Type': 'application/json' });
  }
});

test('different methods never invent or flatten the server receipt', async () => {
  const expected = { ok: true, feature: 'ai-pack', grant: 'server-grant', binding: 'server-binding',
    recovered: true, result: { payments: payments(), engine: 'claude' } };
  const { client } = fixture(expected);
  assert.deepEqual(await client.aiPlan({ prompt: `0.03 SOL to ${address}`, pass: proof() }), expected);
});

test('premium timeouts follow provider budgets and preserve the global override', () => {
  const { client } = fixture();
  assert.deepEqual(client.timeouts, { default: 15000, screen: 30000, passIssue: 60000, passRedeem: 30000, aiPlan: 90000, payrollAuthorize: 90000 });
  const configured = new DuskmothClient({ baseUrl: 'https://example.com', timeout: 12000, timeouts: { screen: 31000 } });
  assert.equal(configured.timeouts.aiPlan, 12000);
  assert.equal(configured.timeouts.screen, 31000);
  assert.equal(Object.isFrozen(client.timeouts), true);
  for (const options of [{ timeout: 0 }, { timeout: 1.5 }, { timeouts: { aiPlan: -1 } }, { timeouts: { invented: 10 } }, { timeouts: null }]) {
    assert.throws(() => new DuskmothClient({ baseUrl: 'https://example.com', ...options }), TypeError);
  }
});

test('each named method passes its own configured timeout to the request layer', async () => {
  const { client } = fixture();
  const seen = [];
  client.request = async (route, body, options) => { seen.push([route, options?.timeout]); return {}; };
  await client.screen({ recipient: address });
  await client.issuePasses(purchase());
  await client.redeemPass({ ...proof(), feature: 'split-withdraw' });
  await client.aiPlan({ prompt: `0.03 SOL to ${address}`, pass: proof() });
  await client.authorizePayroll({ payments: payments(), pass: proof() });
  assert.deepEqual(seen.map(row => row[1]), [30000, 60000, 30000, 90000, 90000]);
});

test('all consuming methods require a saved recovery ID before making an HTTP request', () => {
  const { client, calls } = fixture();
  const noId = { ...proof(), requestId: undefined };
  for (const value of [noId, { ...proof(), requestId: 'B'.repeat(32) }, { ...proof(), kid: 'bad' },
    { ...proof(), sig: 'not base64' }, { ...proof(), msg: Buffer.alloc(31).toString('base64') },
    { ...proof(), msg: Buffer.alloc(129).toString('base64') }]) {
    assert.throws(() => client.aiPlan({ prompt: `0.03 SOL to ${address}`, pass: value }), TypeError);
    assert.throws(() => client.authorizePayroll({ payments: payments(), pass: value }), TypeError);
    assert.throws(() => client.redeemPass({ ...value, feature: 'split-withdraw' }), TypeError);
  }
  assert.equal(calls.length, 0);
});

test('canonical base64 padding bits are enforced like the server', () => {
  const { client, calls } = fixture();
  // 32-byte message has one padding character; changing the low padding bits is noncanonical.
  const noncanonical = Buffer.alloc(32).toString('base64').slice(0, -2) + 'B=';
  assert.throws(() => client.aiPlan({ prompt: `0.03 SOL to ${address}`, pass: { ...proof(), msg: noncanonical } }), TypeError);
  assert.equal(calls.length, 0);
});

test('issuance requires an existing burn and proof, never performs a burn', () => {
  const { client, calls } = fixture();
  const valid = purchase();
  for (const payload of [{}, { ...valid, blinded: [] }, { ...valid, burnSignature: 'bad' },
    { ...valid, proof: { ...valid.proof, ts: NaN } }, { ...valid, proof: { ...valid.proof, address: 'bad' } },
    { ...valid, blinded: [Buffer.alloc(255).toString('base64')] }]) {
    assert.throws(() => client.issuePasses(payload), TypeError);
  }
  assert.equal(calls.length, 0);
});

test('dedicated premium endpoints cannot be bypassed using generic redemption', () => {
  const { client, calls } = fixture();
  for (const feature of ['ai-pack', 'private-payroll', 'unknown']) assert.throws(() => client.redeemPass({ ...proof(), feature }), /only for split-withdraw/);
  assert.equal(calls.length, 0);
});

test('payroll rejects invalid, duplicate, mixed-token, empty and overlong lists locally', () => {
  const { client, calls } = fixture();
  for (const rows of [[], Array.from({ length: 21 }, () => payments()[0]), [payments()[0], payments()[0]],
    [{ ...payments()[0], recipient: 'not-an-address' }], [payments()[0], { recipient: second, token: 'USDC', amount: 1 }],
    [{ ...payments()[0], token: 'DMOTH' }]]) {
    assert.throws(() => client.authorizePayroll({ payments: rows, pass: proof() }), TypeError);
  }
  assert.equal(calls.length, 0);
});

test('payroll uses server precision rules and does not invent server amount caps', async () => {
  const { client, calls } = fixture();
  for (const amount of [0, -1, NaN, Infinity, '0.03', 0.0000000001, Number.MAX_VALUE]) {
    assert.throws(() => client.authorizePayroll({ payments: [{ ...payments()[0], amount }], pass: proof() }), TypeError);
  }
  assert.throws(() => client.authorizePayroll({ payments: [{ recipient: address, amount: 0.0000001, token: 'USDC' }], pass: proof() }), TypeError);
  await client.authorizePayroll({ payments: [{ recipient: address, amount: 5000, token: 'USDC' }], pass: proof() });
  assert.equal(JSON.parse(calls[0].options.body).payments[0].amount, 5000); // Server decides its configured cap.
});

test('requests retain the same pass, ID and bound batch on explicit manual recovery', async () => {
  let n = 0;
  const bodies = [];
  const client = new DuskmothClient({ baseUrl: 'https://example.com', fetch: async (_url, options) => {
    bodies.push(options.body);
    if (++n === 1) throw new Error('offline transport failure');
    return new Response(JSON.stringify({ ok: true, recovered: true, grant: 'same-grant' }));
  } });
  const request = { payments: payments(), pass: proof() }, snapshot = structuredClone(request);
  await assert.rejects(client.authorizePayroll(request));
  assert.equal(n, 1); // No background retry or pass substitution.
  const recovered = await client.authorizePayroll(request);
  assert.equal(recovered.recovered, true);
  assert.equal(bodies[0], bodies[1]);
  assert.deepEqual(request, snapshot);
});

test('unapproved examples make no HTTP calls and approved examples forward the saved request', async () => {
  const { client, calls } = fixture({ ok: true });
  const request = { prompt: `0.03 SOL to ${address}`, pass: proof() };
  assert.equal(await requestApprovedAIPlan(client, request, async () => false), null);
  assert.equal(await authorizeApprovedPayroll(client, { payments: payments(), pass: proof() }), null);
  assert.equal(calls.length, 0);
  await requestApprovedAIPlan(client, request, async () => true);
  assert.equal(calls.length, 1);
});
