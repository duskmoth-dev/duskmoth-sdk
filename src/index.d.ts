export class DuskmothError extends Error { status: number; }
export class DuskmothClient {
  constructor(options: {baseUrl: string; fetch?: typeof fetch; timeout?: number});
  config(): Promise<unknown>;
  health(): Promise<unknown>;
  intent(message: string): Promise<unknown>;
  screen(payload: {sender?: string; recipient: string}): Promise<unknown>;
  activity(address: string): Promise<unknown>;
  score(proof: {address: string; ts: number; signature: string}): Promise<unknown>;
  relayerConfig(): Promise<unknown>;
}
