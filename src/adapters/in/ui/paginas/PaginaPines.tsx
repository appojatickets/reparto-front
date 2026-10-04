import { useCallback, useMemo, useState } from 'react';
import { mapearPines, parsearTabla } from '../../../../domain/tabla';
import { mensajeDeError } from '../../../../application/mensajes';
import type { PropuestaPin, ResultadoPines } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { AreaTexto, Aviso, Boton, Cargando, ErrorCarga, Insignia, Pagina } from '../componentes/ui';

const Propuestas = ({ estado }: { readonly estado: 'pendiente' | 'sin_local' }) => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.listarPropuestas(estado), [api, estado]);
  const { estado: carga, recargar } = useCarga(cargar);
  const [error, setError] = useState<string | undefined>();

  const resolver = async (id: string, accion: 'aceptar' | 'rechazar'): Promise<void> => {
    setError(undefined);
    const r = await api.resolverPropuesta(id, accion);
    if (r.ok) recargar();
    else setError(mensajeDeError(r.error));
  };

  if (carga.tipo === 'cargando') return <Cargando />;
  if (carga.tipo === 'error') return <ErrorCarga error={carga.error} alReintentar={recargar} />;
  if (carga.datos.length === 0) return <Aviso>No hay propuestas {estado === 'pendiente' ? 'pendientes' : 'sin local'}.</Aviso>;
  return (
    <>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <ul className="tarjetas">
        {carga.datos.map((p: PropuestaPin) => (
          <li key={p.id} className="tarjeta">
            <strong>{p.razonSocial ?? 'Dirección sin cliente'}</strong>
            <span>{p.direccion}{p.comuna ? `, ${p.comuna}` : ''}</span>
            <span>Pin propuesto: {p.lat}, {p.lng}</span>
            {p.distanciaActualM !== undefined ? <Insignia>{Math.round(p.distanciaActualM)} m del pin actual</Insignia> : null}
            <div className="fila-botones">
              {estado === 'pendiente' ? <Boton onClick={() => void resolver(p.id, 'aceptar')}>ACEPTAR</Boton> : null}
              <Boton variante="secundario" onClick={() => void resolver(p.id, 'rechazar')}>RECHAZAR</Boton>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
};

export const PaginaPines = () => {
  const { api } = useCasos();
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<ResultadoPines | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const [vista, setVista] = useState<'pendiente' | 'sin_local'>('pendiente');
  const [version, setVersion] = useState(0);
  const mapeo = useMemo(() => mapearPines(parsearTabla(texto)), [texto]);
  const lista = mapeo.pines.length > 0 && mapeo.faltantes.length === 0;

  const proponer = async (): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    const r = await api.importarPines(mapeo.pines);
    setOcupado(false);
    if (r.ok) {
      setResultado(r.value);
      setVersion((v) => v + 1);
    } else setError(mensajeDeError(r.error));
  };

  return (
    <Pagina titulo="Pines de locales">
      <h2>Proponer pines</h2>
      <p>Pega la planilla con RUT (opcional), dirección, latitud y longitud. Nada cambia solo: cada pin queda pendiente para revisar.</p>
      <AreaTexto etiqueta="Planilla de pines" value={texto} onChange={(e) => { setTexto(e.target.value); setResultado(undefined); }} rows={5} />
      {texto.trim() !== '' && mapeo.faltantes.length > 0 ? <Aviso tipo="error">Faltan columnas: {mapeo.faltantes.join(', ')}.</Aviso> : null}
      {lista ? <Aviso tipo="exito">{mapeo.pines.length} pines listos.</Aviso> : null}
      <Boton disabled={!lista || ocupado} onClick={() => void proponer()}>{ocupado ? 'ENVIANDO…' : 'PROPONER PINES'}</Boton>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      {resultado ? <Aviso tipo="exito">Recibidos: {resultado.recibidas} · para revisar: {resultado.pendientes} · sin local: {resultado.sinLocal} · con errores: {resultado.errores.length}.</Aviso> : null}

      <h2>Revisión</h2>
      <div className="fila-botones" role="group" aria-label="Estado">
        <Boton variante={vista === 'pendiente' ? 'primario' : 'secundario'} aria-pressed={vista === 'pendiente'} onClick={() => { setVista('pendiente'); }}>PENDIENTES</Boton>
        <Boton variante={vista === 'sin_local' ? 'primario' : 'secundario'} aria-pressed={vista === 'sin_local'} onClick={() => { setVista('sin_local'); }}>SIN LOCAL</Boton>
      </div>
      <Propuestas key={`${vista}-${version}`} estado={vista} />
    </Pagina>
  );
};
