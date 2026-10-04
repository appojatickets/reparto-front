import { useCallback, useEffect, useState } from 'react';
import type { ServerStatus } from '../../../domain/server-status';

export type CheckServer = (signal: AbortSignal, onStatus: (s: ServerStatus) => void) => Promise<ServerStatus>;

export const useServerStatus = (check: CheckServer) => {
  const [status, setStatus] = useState<ServerStatus>({ kind: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void check(controller.signal, setStatus);
    return () => {
      controller.abort();
    };
  }, [check, attempt]);

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  return { status, retry };
};
