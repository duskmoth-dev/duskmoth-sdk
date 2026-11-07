const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Bytes(value, length) {
  if (typeof value !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(value) || value.length > length * 2) return false;
  let n = 0n;
  for (const char of value) n = n * 58n + BigInt(alphabet.indexOf(char));
  let size = 0;
  while (n) { size++; n >>= 8n; }
  return size + (value.match(/^1*/)?.[0].length || 0) === length;
}

function base64Bytes(value, min, max = min) {
  if (typeof value !== 'string' || value.length > Math.ceil(max / 3) * 4
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return false;
  const bytes = value.length / 4 * 3 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0);
  // Padding bits must be zero, as required by the server's canonical encoding.
  const last = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(value[value.length - (value.endsWith('==') ? 3 : 2)]);
  return bytes >= min && bytes <= max && (!value.endsWith('=') || last % (value.endsWith('==') ? 16 : 4) === 0);
}

export function passProof(value) {
  if (!value || typeof value.kid !== 'string' || !/^[a-f0-9]{16}$/.test(value.kid)
    || !base64Bytes(value.msg, 32, 128) || !base64Bytes(value.sig, 256)
    || !/^[a-f0-9]{32}$/.test(value.requestId || '')) {
    throw new TypeError('Provide a finalized Moth Pass and its saved 32-character hexadecimal requestId.');
  }
  return { kid: value.kid, msg: value.msg, sig: value.sig, requestId: value.requestId };
}

export function passIssue(value) {
  if (!value || !base58Bytes(value.burnSignature, 64) || !Array.isArray(value.blinded)
    || value.blinded.length < 1 || !value.blinded.every(item => base64Bytes(item, 256))) {
    throw new TypeError('Provide the existing burn signature and saved blinded messages. Check passInfo() for the server purchase limit.');
  }
  const proof = value.proof;
  if (!proof || !base58Bytes(proof.address, 32) || !Number.isSafeInteger(proof.ts) || !base58Bytes(proof.signature, 64)) {
    throw new TypeError('A wallet-signed burn ownership proof is required.');
  }
  return { burnSignature: value.burnSignature, blinded: [...value.blinded],
    proof: { address: proof.address, ts: proof.ts, signature: proof.signature } };
}

export function payrollPayments(rows) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 20) throw new TypeError('Provide 1–20 payroll recipients.');
  const seen = new Set();
  const token = rows[0]?.token;
  return rows.map(row => {
    if (!row || !base58Bytes(row.recipient, 32) || seen.has(row.recipient)) throw new TypeError('Use valid, unique Solana recipient addresses.');
    seen.add(row.recipient);
    if (!['SOL', 'USDC'].includes(row.token) || row.token !== token) throw new TypeError('Use one token per batch: SOL or USDC.');
    const scale = row.token === 'SOL' ? 1e9 : 1e6;
    const units = row.amount * scale;
    if (typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount <= 0
      || !Number.isSafeInteger(Math.round(units)) || Math.round(units) < 1 || Math.abs(units - Math.round(units)) > 0.000001) {
      throw new TypeError('Use positive amounts with at most 9 SOL or 6 USDC decimal places.');
    }
    return { recipient: row.recipient, amount: row.amount, token: row.token };
  });
}
