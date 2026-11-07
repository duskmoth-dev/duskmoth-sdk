import { passProof, passIssue, payrollPayments } from './validation.js';

const defaults = Object.freeze({ default: 15000, screen: 30000, passIssue: 60000, passRedeem: 30000, aiPlan: 90000, payrollAuthorize: 90000 });
function validTimeout(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= 2147483647;
}
export class DuskmothError extends Error {
  constructor(message, status = 0, { code = 'HTTP_ERROR', requestId, retryAfter } = {}) {
    super(message); this.name = 'DuskmothError'; this.status = status; this.code = code;
    this.requestId = requestId; this.retryAfter = retryAfter;
  }
}
export class DuskmothClient {
  constructor({ baseUrl, fetch: transport = globalThis.fetch, timeout, timeouts = {} } = {}) {
    const url = new URL(baseUrl);
    if (url.username || url.password || url.search || url.hash) throw new TypeError('Use an origin without credentials, query, or fragment.');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))) throw new TypeError('HTTPS is required outside localhost.');
    if (typeof transport !== 'function' || (timeout !== undefined && !validTimeout(timeout))
      || !timeouts || typeof timeouts !== 'object' || Array.isArray(timeouts)
      || Object.entries(timeouts).some(([key, value]) => !Object.hasOwn(defaults, key) || !validTimeout(value))) throw new TypeError('Valid fetch and positive integer timeouts are required.');
    this.baseUrl = url.href.replace(/\/$/, ''); this.fetch = transport; this.timeout = timeout ?? defaults.default;
    this.timeouts = Object.freeze(Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, timeouts[key] ?? timeout ?? value])));
  }
  async request(route, body, { timeout = this.timeouts.default } = {}) {
    if (typeof route !== 'string' || !/^\/[a-z0-9/-]+$/.test(route) || !validTimeout(timeout)) throw new TypeError('Use a relative API route and a valid timeout.');
    const signal = AbortSignal.timeout(timeout);
    try {
      const response = await this.fetch(this.baseUrl + '/api' + route, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal, cache: 'no-store', credentials: 'omit', redirect: 'error',
      });
      const ref = response.headers.get('X-Request-ID') || '';
      const requestId = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(ref) ? ref : undefined;
      const wait = response.headers.get('Retry-After') || '';
      const retryAfter = /^\d{1,8}$/.test(wait) ? Number(wait) : undefined;
      if (!response.ok) {
        // Never expose the response body: it can contain bearer proofs or recipient data.
        try { await response.body?.cancel(); } catch { /* Do not expose transport details. */ }
        throw new DuskmothError('The API request failed. For pass-consuming requests, keep the same saved payload and requestId; do not switch to another pass.', response.status,
          { code: 'HTTP_ERROR', requestId, retryAfter });
      }
      let result;
      try { result = await response.json(); }
      catch (error) {
        if (signal.aborted) throw error;
        throw new DuskmothError('The server returned invalid JSON. A pass-consuming request may have completed; recover only with its saved payload and requestId.', response.status,
          { code: 'INVALID_JSON', requestId });
      }
      return result;
    } catch (error) {
      if (error instanceof DuskmothError) throw error;
      const timedOut = signal.aborted || error?.name === 'TimeoutError';
      throw new DuskmothError('The API response was not received. A pass-consuming request may have completed; recover only with its saved payload and requestId.', 0,
        { code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR' });
    }
  }
  config() { return this.request('/config'); }
  health() { return this.request('/health'); }
  intent(message) {
    if (typeof message !== 'string' || !message.trim() || message.length > 500) throw new TypeError('Message must contain 1–500 characters.');
    return this.request('/intent', { message });
  }
  screen({ sender, recipient }) {
    if (!recipient) throw new TypeError('Recipient is required.');
    return this.request('/screen', { ...(sender ? { sender } : {}), recipient }, { timeout: this.timeouts.screen });
  }
  activity(address) {
    if (typeof address !== 'string' || !address) throw new TypeError('Address is required.');
    return this.request('/activity', { address });
  }
  score({ address, ts, signature }) {
    if (!address || !Number.isFinite(ts) || !signature) throw new TypeError('A wallet ownership proof is required.');
    return this.request('/score', { address, ts, signature });
  }
  relayerConfig() { return this.request('/relayer/config'); }
  passInfo() { return this.request('/pass/info'); }
  issuePasses(payload) {
    return this.request('/pass/issue', passIssue(payload), { timeout: this.timeouts.passIssue });
  }
  redeemPass(payload) {
    if (payload?.feature !== 'split-withdraw') throw new TypeError('Use redeemPass only for split-withdraw; use aiPlan or authorizePayroll for other features.');
    return this.request('/pass/redeem', { ...passProof(payload), feature: 'split-withdraw' }, { timeout: this.timeouts.passRedeem });
  }
  aiPlan({ prompt, pass } = {}) {
    if (typeof prompt !== 'string' || prompt.trim().length < 10 || prompt.length > 6000) throw new TypeError('Use a complete AI request of 10–6000 characters.');
    return this.request('/ai-pack/plan', { prompt: prompt.trim(), pass: passProof(pass) }, { timeout: this.timeouts.aiPlan });
  }
  authorizePayroll({ payments, pass } = {}) {
    return this.request('/payroll/authorize', { payments: payrollPayments(payments), pass: passProof(pass) }, { timeout: this.timeouts.payrollAuthorize });
  }
}
