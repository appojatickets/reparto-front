import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { ResultadoBusqueda } from '../../../../application/modelos';
import { mensajeDeError } from '../../../../application/mensajes';
import { LARGO_MINIMO_BUSQUEDA, puedeBuscar } from '../../../../application/use-cases/buscar';
import { puedeEditar } from '../../../../domain/rol';
import { useCasos } from '../contexto';
import { useUsuario } from '../sesion';
import { useDebounced } from '../hooks';
import { InsigniasDeVerificacion } from '../componentes/InsigniasDeVerificacion';
import { Aviso, Boton, Campo, Cargando, Insignia, Pagina } from '../componentes/ui';

export const ETIQUETA_PIN = { pendiente: 'SIN PIN', sugerido: 'PIN POR REVISAR', validado: 'PIN VALIDADO' } as const;

/** Borrado rápido de una dirección mal escrita o repetida, desde el mismo resultado de la búsqueda (con confirmación). */
const EliminarRapido = ({ r, alEliminar }: { readonly r: ResultadoBusqueda; readonly alEliminar: () => void }) => {
  const { api } = useCasos();
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const eliminar = async (): Promise<void> => {
    setOcupado(true);
    const res = await api.eliminarLocal(r.localId);
    setOcupado(false);
    if (res.ok) alEliminar();
    else {
      setConfirmando(false);
      setError(mensajeDeError(res.error));
    }
  };
  return (
    <>
      {confirmando ? (
        <div className="pagina" role="group" aria-label={`Confirmar eliminación de ${r.razonSocial}`}>
          <Aviso tipo="error">¿Eliminar «{r.direccion}, {r.comuna}» de {r.razonSocial}? No se puede deshacer.</Aviso>
          <Boton variante="peligro" disabled={ocupado} onClick={() => void eliminar()}>SÍ, ELIMINAR</Boton>
          <Boton variante="secundario" disabled={ocupado} onClick={() => { setConfirmando(false); }}>NO, DEJARLA</Boton>
        </div>
      ) : <Boton variante="peligro" aria-label={`ELIMINAR LA DIRECCIÓN DE ${r.razonSocial}`} onClick={() => { setError(undefined); setConfirmando(true); }}>ELIMINAR</Boton>}
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </>
  );
};

type Respuesta = { readonly consulta: string; readonly resultados: readonly ResultadoBusqueda[]; readonly error?: string };

export const PaginaClientes = () => {
  const { api } = useCasos();
  const usuario = useUsuario();
  const editar = puedeEditar(usuario.rol, usuario.editor);
  const [quitados, setQuitados] = useState<ReadonlySet<string>>(new Set());
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
  const hallado = listo && respuesta?.consulta === consulta ? respuesta : undefined;
  const actual = hallado && { ...hallado, resultados: hallado.resultados.filter((r) => !quitados.has(r.localId)) };

  return (
    <Pagina titulo="Buscar cliente">
      <Campo etiqueta="Nombre o dirección" ayuda={`Escribe al menos ${LARGO_MINIMO_BUSQUEDA} caracteres del nombre o dirección, o un RUT. Sirve dictar con el micrófono del teclado.`} type="search" value={texto} onChange={(e) => { setTexto(e.target.value); }} autoComplete="off" autoCapitalize="none" spellCheck={false} autoFocus />
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
                {editar ? <EliminarRapido r={r} alEliminar={() => { setQuitados((q) => new Set(q).add(r.localId)); }} /> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Pagina>
  );
};
