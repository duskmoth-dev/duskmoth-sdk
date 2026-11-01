export class DuskmothError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'DuskmothError'; this.status = status; }
}
export class DuskmothClient {
  constructor({ baseUrl, fetch: transport = globalThis.fetch, timeout = 15000 } = {}) {
    const url = new URL(baseUrl);
    if (url.username || url.password || url.search || url.hash) throw new TypeError('Use an origin without credentials, query, or fragment.');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))) throw new TypeError('HTTPS is required outside localhost.');
    if (typeof transport !== 'function' || !Number.isFinite(timeout) || timeout <= 0) throw new TypeError('Valid fetch and timeout are required.');
    this.baseUrl = url.href.replace(/\/$/, ''); this.fetch = transport; this.timeout = timeout;
  }
  async request(route, body) {
    try {
      const response = await this.fetch(this.baseUrl + '/api' + route, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout), cache: 'no-store', credentials: 'omit',
      });
      let result;
      try { result = await response.json(); } catch { throw new DuskmothError('The server returned invalid JSON.', response.status); }
      if (!response.ok) throw new DuskmothError('The API request failed.', response.status);
      return result;
    } catch (error) {
      if (error instanceof DuskmothError) throw error;
      throw new DuskmothError('The API request timed out or could not connect.');
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
    return this.request('/screen', { ...(sender ? { sender } : {}), recipient });
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
}
