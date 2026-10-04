import { isFinal, type ServerStatus } from '../../domain/server-status';
import type { SaludApi } from '../ports/api-client';
import type { Timer } from '../ports/timer';

export type CheckServerDeps = {
  readonly api: SaludApi;
  readonly timer: Timer;
  /** Pasado este tiempo sin respuesta se asume que Render está despertando. */
  readonly wakingAfterMs: number;
};

/** Consulta /health y notifica cada estado. Devuelve el estado final. */
export const checkServer = async (
  { api, timer, wakingAfterMs }: CheckServerDeps,
  signal: AbortSignal,
  onStatus: (status: ServerStatus) => void,
): Promise<ServerStatus> => {
  onStatus({ kind: 'checking' });
  const cancelWaking = timer.after(wakingAfterMs, () => {
    onStatus({ kind: 'waking' });
  });
  const result = await api.getHealth(signal);
  cancelWaking();

  const final: ServerStatus = !result.ok
    ? { kind: 'unreachable' }
    : result.value.status === 'ok'
      ? { kind: 'ok' }
      : { kind: 'degraded' };
  if (isFinal(final)) onStatus(final);
  return final;
};
