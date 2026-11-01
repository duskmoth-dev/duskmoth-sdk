import test from 'node:test';
import assert from 'node:assert/strict';
import { DuskmothClient, DuskmothError } from '../src/index.js';
const fixture = body => async () => new Response(JSON.stringify(body));
test('fetches real API contracts without credentials', async () => {
  const calls=[];
  const client = new DuskmothClient({baseUrl:'https://example.com',fetch:async(url,opts)=>{calls.push({url,opts});return new Response(JSON.stringify({ok:true}));}});
  assert.deepEqual(await client.config(), {ok:true});
  assert.equal(calls[0].url,'https://example.com/api/config');
  assert.equal(calls[0].opts.credentials,'omit');
  await client.intent('Show my balance');
  assert.deepEqual(JSON.parse(calls[1].opts.body),{message:'Show my balance'});
  assert.ok(calls[1].opts.signal instanceof AbortSignal);
});
test('validates origin and ownership proof', () => {
  for(const baseUrl of ['http://example.com','https://user:password@example.com','https://example.com?token=example']) assert.throws(()=>new DuskmothClient({baseUrl}));
  const c=new DuskmothClient({baseUrl:'http://localhost:8787',fetch:fixture({})});
  assert.throws(()=>c.score({address:'test'}),/ownership/);
  assert.throws(()=>c.intent(''),/Message/);
  assert.throws(()=>c.screen({}),/Recipient/);
});
test('network, JSON and HTTP errors never fabricate success or expose response contents', async () => {
  for(const transport of [async()=>{throw Error('internal details');},async()=>new Response('not json'),async()=>new Response(JSON.stringify({error:'sensitive details'}),{status:503})]) {
    await assert.rejects(new DuskmothClient({baseUrl:'https://example.com',fetch:transport}).health(),error=>error instanceof DuskmothError && !/sensitive|internal/.test(error.message));
  }
});
test('read-only and proof endpoints use exact payloads', async () => {
  const calls=[],c=new DuskmothClient({baseUrl:'https://example.com',fetch:async(url,opts)=>{calls.push([url,opts.body]);return new Response('{}');}});
  await c.health();await c.activity('public-address');await c.screen({sender:'sender',recipient:'recipient'});await c.score({address:'address',ts:1,signature:'proof'});await c.relayerConfig();
  assert.deepEqual(calls.map(([url])=>url.split('/api')[1]),['/health','/activity','/screen','/score','/relayer/config']);
  assert.deepEqual(JSON.parse(calls[3][1]),{address:'address',ts:1,signature:'proof'});
});
