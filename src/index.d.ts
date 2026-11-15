export type Token = 'SOL' | 'USDC';
export type PremiumFeature = 'split-withdraw' | 'ai-pack' | 'private-payroll';
/**
 * Public, read-only configuration flags, not live provider probes.
 * Fields are optional for older/partial deployments. Missing means unknown,
 * never ready. Unknown fields may be added by the server.
 * Declarations do not validate untrusted JSON at runtime.
 */
export interface ServiceStatus {
  readonly mode?: 'production' | 'development';
  readonly network?: 'mainnet-beta';
  readonly ai?: 'claude' | 'rules';
  readonly screening?: 'scorechain' | 'off';
  readonly screeningScope?: 'sanctions-only';
  readonly data?: 'helius' | 'public-rpc';
  readonly liveSend?: boolean;
  readonly transferStatus?: 'disabled' | 'unavailable' | 'wallet-approval-required';
  readonly transferBlockReason?: string | null;
  readonly demoWallet?: boolean;
  readonly relayerProxy?: boolean;
  readonly [field: string]: unknown;
}
/** HTTP reachability does not establish provider health or a completed payment. */
export interface HealthResponse extends ServiceStatus { readonly ok?: boolean; }
export interface ConfigResponse extends ServiceStatus {
  readonly limits?: Readonly<Partial<Record<Token, number>>>;
}
/**
 * Proxied upstream configuration. Fees, assets and minimums can change.
 * This is not a transaction-specific fee quote or a guarantee of availability.
 */
export interface RelayerConfigResponse {
  readonly withdraw_fee_rate?: number;
  readonly withdraw_rent_fee?: number;
  readonly deposit_fee_rate?: number;
  readonly usdc_withdraw_rent_fee?: number;
  readonly rent_fees?: Readonly<Partial<Record<string, number>>>;
  readonly minimum_withdrawal?: Readonly<Partial<Record<string, number>>>;
  readonly prices?: Readonly<Partial<Record<string, number>>>;
  readonly [field: string]: unknown;
}
export interface PassTokenInfo {
  readonly decimals: number;
  readonly program: string;
  readonly name: string | null;
  readonly symbol: string | null;
  readonly verified: boolean;
  readonly network: 'solana-mainnet';
  /** Base-unit integer string; do not convert large values to Number. */
  readonly priceRaw: string;
  readonly [field: string]: unknown;
}
export interface WalletProof { address: string; ts: number; signature: string; }
/** Finalized bearer proof. Keep this and its requestId private and durable. */
export interface PassProof { kid: string; msg: string; sig: string; requestId: string; }
export interface Payment { recipient: string; amount: number; token: Token; }
export interface PassFeature { cost: number; label: string; enabled?: boolean; }
export interface PassInfo {
  enabled: boolean; reason: string | null; mint: string; token: PassTokenInfo | null;
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
  config(): Promise<ConfigResponse>;
  health(): Promise<HealthResponse>;
  intent(message: string): Promise<unknown>;
  screen(payload: {sender?: string; recipient: string}): Promise<unknown>;
  activity(address: string): Promise<unknown>;
  score(proof: WalletProof): Promise<unknown>;
  relayerConfig(): Promise<RelayerConfigResponse>;
  passInfo(): Promise<PassInfo>;
  issuePasses(payload: PassIssueRequest): Promise<PassIssueResult>;
  redeemPass(payload: PassProof & {feature: 'split-withdraw'}): Promise<PassReceipt>;
  aiPlan(payload: {prompt: string; pass: PassProof}): Promise<AIReceipt>;
  authorizePayroll(payload: {payments: Payment[]; pass: PassProof}): Promise<PayrollReceipt>;
}
