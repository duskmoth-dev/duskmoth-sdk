# Premium HTTP API and recovery

All paths are relative to `/api`. Responses are the server's actual JSON, not synthetic approvals.
The SDK transports existing proofs; wallet authorization, pass cryptography and transaction execution remain outside this package.

## Issuance: `issuePasses(request)`

POST `/pass/issue`:

```ts
interface Request {
  burnSignature: string; // Existing confirmed burn transaction, base58.
  blinded: string[];    // Saved 256-byte blinded messages, canonical base64.
  proof: { address: string; ts: number; signature: string };
}
```

`ts` is a millisecond Unix timestamp. The ownership proof is a wallet-signed message, not a private key.
The signed text is exactly:

```text
Duskmoth Moth Pass
Burn: <burnSignature>
Batch: <sha256 of JSON.stringify(blinded), lowercase hex>
Timestamp: <ts>
This signs a pass claim only. It does not move funds.
```

Use the existing wallet's signing flow. The server checks proof freshness, burn authority, mint, network,
amount and claim window. Check `passInfo().maxPerBurn` before preparing a purchase.
The response is `{kid, count, signatures, demo, recovered}`.
The caller must unblind and cryptographically verify the returned signatures before treating them as usable passes.

On connection loss, keep the same burn and blinded messages. Refresh an expired ownership proof with the same wallet;
do not burn again or generate a different blinded batch. Recovery remains subject to server validation.
Production integrations must not request demo issuance.

## Finalized proof

Premium requests contain:

```ts
interface PassProof {
  kid: string;       // Issuer key identifier from passInfo().
  msg: string;       // Finalized 32–128-byte message, canonical base64.
  sig: string;       // Finalized 256-byte signature, canonical base64.
  requestId: string; // 16 random bytes encoded as 32 lowercase hex characters.
}
```

The proof is a bearer secret. Never put it in URLs, analytics, issue reports, screenshots, or console logs.
This SDK intentionally provides no automatic localStorage backup.
Store recovery requests in appropriately protected storage controlled by your application.

## Split-withdraw access: `redeemPass(request)`

POST `/pass/redeem` with `{...passProof, feature:'split-withdraw'}`.
This spends one pass for access; it does not perform a withdrawal.
The response contains `{ok:true, feature, grant}` and may include `recovered:true`.
Use the dedicated methods below for AI Pack and Payroll; their binding cannot be established by this generic endpoint.

## AI Pack: `aiPlan({prompt, pass})`

POST `/ai-pack/plan` with a complete request of 10–6000 characters.
Each recipient needs an explicit adjacent amount and token, for example `0.02 SOL to ADDRESS`.
One token per plan; ambiguous requests must be corrected rather than inventing recipients or amounts.
The server returns:

```ts
{
  ok: true;
  feature: 'ai-pack';
  grant: string;
  binding: string;
  recovered?: boolean;
  result: {
    payments: {recipient: string; amount: number; token: 'SOL' | 'USDC'}[];
    engine: 'claude';
    createdAt: string;
    expiresAt: string;
    summary: string;
  };
}
```

One pass is spent for a successfully prepared plan, not for each recipient.
No blockchain payment is submitted. AI result recovery is currently limited to seven days;
HTTP 410 means the recovery result expired, not that the pass is available again.

## Payroll: `authorizePayroll({payments, pass})`

POST `/payroll/authorize` with 1–20 unique recipients and one token per batch.
The response is `{ok:true, feature:'private-payroll', grant, binding, recovered?}`.
This spends one pass per authorized batch, not per recipient. It is a separate charge from AI Pack.

**Authorization is not payment execution.** The executing app must review current relayer fees,
screen all applicable addresses, verify enough existing private balance and obtain user approval before requesting authorization.
The authorization endpoint alone cannot establish any of these checks.
There is no automatic deposit; public-wallet funds and pass credits do not equal private funds.
Journal each transfer before submission, retain transaction signatures, skip confirmed payments,
and reconcile uncertain submissions rather than resending them.

## Handling errors without spending a second pass

1. Save the original proof, requestId and payload securely before any pass-consuming request.
2. If a response is lost, repeat only the exact same saved request after the service is available.
3. Do not generate a new requestId, substitute another pass, change the feature or modify a bound plan during recovery.
4. A recovered success returns the existing grant; it does not mean a new charge.
5. A 409 can mean a conflicting request or previously spent pass. A 410 can mean expired AI recovery.
   Neither means the pass was refunded.
6. A 429 provides optional numeric `retryAfter`. Wait before a manual retry using the same saved request.
7. For 503, timeout, connection loss or invalid JSON, do not assume the server failed before recording the action.

The SDK does not retry, rotate passes, broadcast transactions, suppress failed sanctions checks, or fabricate private balances.
Error bodies are intentionally omitted; `status`, `code`, sanitized `requestId` and `retryAfter` are safe diagnostic fields.
Do not send pass proofs or recipient lists with an issue report.
