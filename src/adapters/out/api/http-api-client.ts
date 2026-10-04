import createClient from 'openapi-fetch';
import { err, ok, type Result } from '../../../domain/result';
import type { ApiClient, ApiError, HealthReport } from '../../../application/ports/api-client';
import type { paths } from './schema';

export type HttpApiClientOptions = {
  readonly baseUrl: string;
  /** Render Free puede tardar ~1 min en despertar. */
  readonly timeoutMs?: number;
  readonly fetch?: typeof globalThis.fetch;
};

const pickBody = (data: HealthReport | undefined, error: HealthReport | undefined): Result<HealthReport, ApiError> => {
  const body = data ?? error;
  return body ? ok(body) : err({ kind: 'UNEXPECTED' });
};

export const createHttpApiClient = ({ baseUrl, timeoutMs = 90_000, fetch }: HttpApiClientOptions): ApiClient => {
  const client = createClient<paths>({ baseUrl, ...(fetch ? { fetch } : {}) });

  return {
    async getHealth(signal): Promise<Result<HealthReport, ApiError>> {
      try {
        const { data, error } = await client.GET('/v1/health', {
          signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
        });
        // 200 y 503 traen el mismo cuerpo: la API informa «degraded» con 503.
        return pickBody(data, error);
      } catch (e) {
        const name = e instanceof Error ? e.name : '';
        return err({ kind: name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK' });
      }
    },
  };
};
