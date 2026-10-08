import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { ResultadoBusqueda } from '../../../../application/modelos';
import { mensajeDeError } from '../../../../application/mensajes';
import { LARGO_MINIMO_BUSQUEDA, puedeBuscar } from '../../../../application/use-cases/buscar';
import { useCasos } from '../contexto';
import { useDebounced } from '../hooks';
import { InsigniasDeVerificacion } from '../componentes/InsigniasDeVerificacion';
import { Aviso, Campo, Cargando, Insignia, Pagina } from '../componentes/ui';

export const ETIQUETA_PIN = { pendiente: 'SIN PIN', sugerido: 'PIN POR REVISAR', validado: 'PIN VALIDADO' } as const;

type Respuesta = { readonly consulta: string; readonly resultados: readonly ResultadoBusqueda[]; readonly error?: string };

export const PaginaClientes = () => {
  const { api } = useCasos();
  const [texto, setTexto] = useState('');
  const consulta = useDebounced(texto, 250);
  const [respuesta, setRespuesta] = useState<Respuesta | undefined>();

  useEffect(() => {
    if (!puedeBuscar(consulta)) return;
    const control = new AbortController();
    void api.buscarClientes(consulta, { signal: control.signal }).then((r) => {
      if (control.signal.aborted) return;
      setRespuesta(r.ok ? { consulta, resultados: r.value } : { consulta, resultados: [], error: mensajeDeError(r.error) });
    });
    return () => {
      control.abort();
    };
  }, [api, consulta]);

  const listo = puedeBuscar(consulta);
  const actual = listo && respuesta?.consulta === consulta ? respuesta : undefined;

  return (
    <Pagina titulo="Buscar cliente">
      <Campo etiqueta="Nombre o dirección" ayuda={`Escribe al menos ${LARGO_MINIMO_BUSQUEDA} letras. Sirve dictar con el micrófono del teclado.`} type="search" value={texto} onChange={(e) => { setTexto(e.target.value); }} autoComplete="off" autoCapitalize="none" spellCheck={false} autoFocus />
      {!listo ? <Aviso>Los resultados aparecen al escribir.</Aviso> : null}
      {listo && !actual ? <Cargando texto="Buscando…" /> : null}
      {actual?.error ? <Aviso tipo="error">{actual.error}</Aviso> : null}
      {actual && !actual.error && actual.resultados.length === 0 ? <Aviso>No hay clientes con ese texto. Prueba con menos letras.</Aviso> : null}
      {actual && actual.resultados.length > 0 ? (
        <>
          <p role="status">{actual.resultados.length} {actual.resultados.length === 1 ? 'resultado' : 'resultados'}</p>
          <ul className="tarjetas">
            {actual.resultados.map((r) => (
              <li key={r.localId} className="tarjeta">
                <Link className="tarjeta-enlace" to={`/clientes/${r.localId}`}>{r.razonSocial}</Link>
                <span>{r.direccion}</span>
                <span><strong>{r.comuna}</strong></span>
                <Insignia>{ETIQUETA_PIN[r.pinEstado]}</Insignia>
                <InsigniasDeVerificacion pin={r.pinVerificado} foto={r.fotoVerificada} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Pagina>
  );
};
