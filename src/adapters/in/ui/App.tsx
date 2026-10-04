import type { ReactNode } from 'react';
import { describeServerStatus } from '../../../domain/server-status';
import { useServerStatus, type CheckServer } from './use-server-status';

export type AppProps = { readonly checkServer: CheckServer; /** Lo que se muestra cuando el servidor ya respondió. */ readonly children?: ReactNode };

export const App = ({ checkServer, children }: AppProps) => {
  const { status, retry } = useServerStatus(checkServer);
  // Con la base caída («degraded») igual se entra: el login informará el problema en lugar de bloquear todo.
  if ((status.kind === 'ok' || status.kind === 'degraded') && children) return <>{children}</>;
  const busy = status.kind === 'checking' || status.kind === 'waking';

  return (
    <main className="screen">
      <h1>Reparto</h1>
      <p role="status" aria-live="polite" className={`status status--${status.kind}`}>
        {describeServerStatus(status)}
      </p>
      {status.kind === 'unreachable' || status.kind === 'degraded' ? (
        <button type="button" className="big-button" onClick={retry}>
          REINTENTAR
        </button>
      ) : null}
      {busy ? <p className="hint">Espere, no cierre la aplicación.</p> : null}
    </main>
  );
};
