export type Token = 'SOL' | 'USDC';
export type PremiumFeature = 'split-withdraw' | 'ai-pack' | 'private-payroll';
export interface WalletProof { address: string; ts: number; signature: string; }
/** Finalized bearer proof. Keep this and its requestId private and durable. */
export interface PassProof { kid: string; msg: string; sig: string; requestId: string; }
export interface Payment { recipient: string; amount: number; token: Token; }
export interface PassFeature { cost: number; label: string; enabled?: boolean; }
export interface PassInfo {
  enabled: boolean; reason: string | null; mint: string; token: Record<string, unknown> | null;
  price: number; maxPerBurn: number; demo: boolean; storage: string; durable: boolean;
  kid: string | null; publicKey: string | null; suite: string;
  features: Record<PremiumFeature, PassFeature>;
}
export interface PassIssueRequest { burnSignature: string; blinded: string[]; proof: WalletProof; }
export interface PassIssueResult { kid: string; count: number; signatures: string[]; demo: boolean; recovered: boolean; }
export interface PassReceipt {
  ok: true; feature: PremiumFeature; grant: string; binding?: string; recovered?: boolean;
}
export interface AIPlan {
  payments: Payment[]; engine: 'claude'; createdAt: string; expiresAt: string; summary: string;
}
export interface AIReceipt extends PassReceipt { feature: 'ai-pack'; result: AIPlan; }
export interface PayrollReceipt extends PassReceipt { feature: 'private-payroll'; binding: string; }
export interface OperationTimeouts {
  default: number; screen: number; passIssue: number; passRedeem: number; aiPlan: number; payrollAuthorize: number;
}
export interface ClientOptions {
  baseUrl: string; fetch?: typeof fetch; timeout?: number; timeouts?: Partial<OperationTimeouts>;
}
export interface ErrorDetails { code?: string; requestId?: string; retryAfter?: number; }
export class DuskmothError extends Error {
  constructor(message: string, status?: number, details?: ErrorDetails);
  status: number; code: string; requestId?: string; retryAfter?: number;
}
export class DuskmothClient {
  constructor(options: ClientOptions);
  readonly timeouts: Readonly<OperationTimeouts>;
  request(route: string, body?: unknown, options?: { timeout?: number }): Promise<unknown>;
  config(): Promise<unknown>;
  health(): Promise<unknown>;
  intent(message: string): Promise<unknown>;
  screen(payload: {sender?: string; recipient: string}): Promise<unknown>;
  activity(address: string): Promise<unknown>;
  score(proof: WalletProof): Promise<unknown>;
  relayerConfig(): Promise<unknown>;
  passInfo(): Promise<PassInfo>;
  issuePasses(payload: PassIssueRequest): Promise<PassIssueResult>;
  redeemPass(payload: PassProof & {feature: 'split-withdraw'}): Promise<PassReceipt>;
  aiPlan(payload: {prompt: string; pass: PassProof}): Promise<AIReceipt>;
  authorizePayroll(payload: {payments: Payment[]; pass: PassProof}): Promise<PayrollReceipt>;
}
