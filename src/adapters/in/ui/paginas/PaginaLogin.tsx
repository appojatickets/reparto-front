import { useState, type SyntheticEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useSesion } from '../sesion';
import { Aviso, Boton, Campo, Pagina } from '../componentes/ui';

export const PaginaLogin = () => {
  const { estado, entrar } = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/';

  if (estado.tipo === 'sesion') return <Navigate to={destino} replace />;

  const enviar = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    setEnviando(true);
    setError(undefined);
    const r = await entrar(username, pin);
    setEnviando(false);
    if (r.ok) void navegar(destino, { replace: true });
    else setError(r.error);
  };

  return (
    <main className="screen">
      <Pagina titulo="Entrar">
        <form className="pagina" onSubmit={(e) => void enviar(e)} noValidate>
          <Campo etiqueta="Usuario" value={username} onChange={(e) => { setUsername(e.target.value); }} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus />
          <Campo etiqueta="Clave (6 números)" value={pin} onChange={(e) => { setPin(e.target.value); }} type="password" inputMode="numeric" autoComplete="current-password" />
          {error ? <Aviso tipo="error">{error}</Aviso> : null}
          <Boton type="submit" disabled={enviando}>{enviando ? 'ENTRANDO…' : 'ENTRAR'}</Boton>
        </form>
      </Pagina>
    </main>
  );
};
