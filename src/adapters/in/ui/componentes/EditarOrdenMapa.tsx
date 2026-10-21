import { useEffect, useId, useRef, useState } from 'react';
import type { ParadaDeRuta } from '../../../../application/modelos';
import { Aviso, Boton, Campo } from './ui';

export const EditarOrdenMapa = ({ parada, total, manual, guardar, cancelar }: {
  readonly parada: ParadaDeRuta; readonly total: number; readonly manual: boolean;
  readonly guardar: (puesto: number) => Promise<boolean>; readonly cancelar: () => void;
}) => {
  const dialogo = useRef<HTMLDialogElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const titulo = useId();
  const [puesto, setPuesto] = useState(String(parada.posicion + 1));
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialogo.current?.showModal(); campo.current?.select(); }, []);
  return <dialog ref={dialogo} className="editor-orden-mapa" aria-labelledby={titulo} onCancel={e => { e.preventDefault(); if (!ocupado) cancelar(); }}>
    <form className="pagina" onSubmit={e => {
      e.preventDefault();
      const n = Number(puesto);
      if (!/^\d+$/.test(puesto) || !Number.isInteger(n) || n < 1 || n > total) { setError(`Elige un puesto entre 1 y ${total}.`); return; }
      setOcupado(true); setError('');
      void guardar(n - 1).then(ok => { if (ok) cancelar(); else { setOcupado(false); setError('No se confirmó el cambio. Revisa el aviso de la ruta.'); } }).catch(() => { setOcupado(false); setError('No se guardó. Comprueba la conexión y reintenta.'); });
    }} noValidate>
      <h2 id={titulo}>Cambiar orden</h2>
      <strong>{parada.direccion}, {parada.comuna}</strong>
      <Campo ref={campo} etiqueta="Mover al puesto" ayuda={`Ahora está en el puesto ${parada.posicion + 1} de ${total}.`} inputMode="numeric" pattern="[0-9]*" value={puesto} onChange={e => { setPuesto(e.target.value); }} disabled={ocupado} />
      <p className="ayuda">{manual ? 'Se conserva el orden del resto de las entregas.' : 'Se respeta el orden hasta este puesto y se reorganiza por cercanía lo que queda debajo.'}</p>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <Boton type="submit" disabled={ocupado}>{ocupado ? 'GUARDANDO…' : 'MOVER'}</Boton>
      <Boton variante="secundario" disabled={ocupado} onClick={cancelar}>CANCELAR</Boton>
    </form>
  </dialog>;
};
