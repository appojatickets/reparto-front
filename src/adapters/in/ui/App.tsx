import { describeServerStatus } from '../../../domain/server-status';
import { useServerStatus, type CheckServer } from './use-server-status';

export type AppProps = { readonly checkServer: CheckServer };

export const App = ({ checkServer }: AppProps) => {
  const { status, retry } = useServerStatus(checkServer);
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
