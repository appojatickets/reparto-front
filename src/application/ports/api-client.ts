import type { Result } from '../../domain/result';

export type HealthReport = {
  readonly status: 'ok' | 'degraded';
  readonly database: 'ok' | 'error';
  readonly timestamp: string;
};

export type ApiError = { readonly kind: 'NETWORK' | 'TIMEOUT' | 'UNEXPECTED'; readonly detail?: string };

export interface ApiClient {
  getHealth(signal: AbortSignal): Promise<Result<HealthReport, ApiError>>;
}
