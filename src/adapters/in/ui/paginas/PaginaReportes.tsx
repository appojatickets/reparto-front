import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { fechaYHoraEnChile, textoDeMotivo, type IdMotivoFoto } from '../../../../domain/foto-reporte';
import { enlaceGoogleMaps } from '../../../../domain/enlaces';
import { mensajeDeError } from '../../../../application/mensajes';
import type { ApiError } from '../../../../application/ports/api-client';
import type { Result } from '../../../../domain/result';
import type { ReporteDelLocal } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { ImagenFoto } from '../componentes/ImagenFoto';
import { Aviso, Boton, Cargando, ErrorCarga, Insignia, Pagina } from '../componentes/ui';

const ETIQUETA = { foto: 'FOTO', nombre: 'NOMBRE', ubicacion: 'UBICACIÓN' } as const;

const quienYCuando = (r: ReporteDelLocal): string => `Reportó ${r.reportadoPor ?? 'alguien'}${fechaYHoraEnChile(r.reportadoEn) !== '' ? ` el ${fechaYHoraEnChile(r.reportadoEn)}` : ''}.`;

const Fila = ({ r, alCambiar }: { readonly r: ReporteDelLocal; readonly alCambiar: () => void }) => {
  const { api } = useCasos();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [confirmando, setConfirmando] = useState(false);
  const ejecutar = async (accion: () => Promise<Result<void, ApiError>>): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    const x = await accion();
    setOcupado(false);
    if (x.ok) alCambiar();
    else setError(mensajeDeError(x.error));
  };
  const local = (accion: 'verificar_pin' | 'corregido' | 'descartar') => ejecutar(() => api.resolverReporteLocal(r.id, accion));
  const foto = (accion: 'eliminar' | 'descartar') => ejecutar(() => api.resolverReporteFoto(r.id, accion));
  const ficha = <Link className="big-button big-button--secundario" to={`/clientes/${r.localId}`}>ABRIR LA FICHA</Link>;

  return (
    <li className="tarjeta" aria-label={`Reporte de ${ETIQUETA[r.tipo].toLowerCase()} de ${r.razonSocial}`}>
      <Insignia>REPORTE DE {ETIQUETA[r.tipo]}</Insignia>
      {r.tipo === 'foto' && !r.yaCambio ? <ImagenFoto localId={r.localId} cliente={r.razonSocial} /> : null}
      <strong>{r.razonSocial}</strong>
      <span>{r.direccion}, <strong className="comuna">{r.comuna}</strong></span>
      {r.tipo === 'foto' ? <span>Motivo: <strong>{textoDeMotivo((r.motivo ?? 'otra') as IdMotivoFoto)}</strong></span> : null}
      {r.tipo === 'nombre' && r.sugerido ? <span>Debería llamarse: <strong>{r.sugerido}</strong></span> : null}
      {r.detalle ? <span>«{r.detalle}»</span> : null}
      <span className="ayuda">{quienYCuando(r)}</span>
      {r.yaCambio ? <Aviso>{r.tipo === 'foto' ? 'Esta foto ya fue reemplazada o eliminada.' : r.tipo === 'nombre' ? 'El nombre ya cambió desde que lo reportaron.' : 'El pin ya se movió desde que lo reportaron.'} Si está bien, cierra el reporte.</Aviso> : null}

      {r.tipo === 'foto' ? (
        r.yaCambio ? (
          <div className="fila-botones"><Boton variante="secundario" disabled={ocupado} onClick={() => void foto('descartar')}>CERRAR EL REPORTE</Boton></div>
        ) : confirmando ? (
          <div className="fila-botones">
            <Boton variante="peligro" disabled={ocupado} aria-label={`SÍ, ELIMINAR LA FOTO DE ${r.razonSocial}`} onClick={() => void foto('eliminar')}>SÍ, ELIMINAR</Boton>
            <Boton variante="secundario" onClick={() => { setConfirmando(false); }}>NO</Boton>
          </div>
        ) : (
          <div className="fila-botones">
            <Boton variante="peligro" disabled={ocupado} aria-label={`ELIMINAR LA FOTO DE ${r.razonSocial}`} onClick={() => { setConfirmando(true); }}>ELIMINAR LA FOTO</Boton>
            <Boton variante="secundario" disabled={ocupado} aria-label={`LA FOTO DE ${r.razonSocial} ESTÁ BIEN`} onClick={() => void foto('descartar')}>LA FOTO ESTÁ BIEN</Boton>
          </div>
        )
      ) : null}

      {r.tipo === 'nombre' ? (
        <div className="fila-botones">
          {ficha}
          <Boton disabled={ocupado} aria-label={`YA CORREGÍ EL NOMBRE DE ${r.razonSocial}`} onClick={() => void local('corregido')}>YA ESTÁ CORREGIDO</Boton>
          <Boton variante="secundario" disabled={ocupado} aria-label={`DESCARTAR EL REPORTE DEL NOMBRE DE ${r.razonSocial}`} onClick={() => void local('descartar')}>DESCARTAR</Boton>
        </div>
      ) : null}

      {r.tipo === 'ubicacion' ? (
        <>
          {r.lat !== undefined && r.lng !== undefined ? <a className="big-button big-button--secundario" href={enlaceGoogleMaps(r.lat, r.lng)} target="_blank" rel="noreferrer" aria-label={`VER EL PIN DE ${r.razonSocial} EN GOOGLE MAPS`}>VER EL PIN EN EL MAPA</a> : null}
          <div className="fila-botones">
            <Boton disabled={ocupado} aria-label={`EL PIN DE ${r.razonSocial} ESTÁ BIEN`} onClick={() => void local('verificar_pin')}>EL PIN ESTÁ BIEN</Boton>
            {ficha}
            <Boton variante="secundario" disabled={ocupado} aria-label={`YA CORREGÍ EL PIN DE ${r.razonSocial}`} onClick={() => void local('corregido')}>YA ESTÁ CORREGIDO</Boton>
            <Boton variante="secundario" disabled={ocupado} aria-label={`DESCARTAR EL REPORTE DEL PIN DE ${r.razonSocial}`} onClick={() => void local('descartar')}>DESCARTAR</Boton>
          </div>
        </>
      ) : null}
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </li>
  );
};

/** Todo lo que el equipo reportó de un local —su foto, su nombre o su ubicación— en una sola lista, del más nuevo al más antiguo. */
export const PaginaReportes = () => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.verReportes(), [api]);
  const { estado, recargar } = useCarga(cargar);
  return (
    <Pagina titulo="Reportes">
      <p>Aquí llega lo que el equipo marca como mal: la foto, el nombre o la ubicación de un local. Decide qué hacer con cada uno.</p>
      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' ? (
        estado.datos.reportes.length === 0 ? (
          <Aviso tipo="exito">No hay reportes pendientes.</Aviso>
        ) : (
          <>
            <p role="status">{estado.datos.total} {estado.datos.total === 1 ? 'reporte pendiente' : 'reportes pendientes'}.</p>
            <ul className="tarjetas">
              {estado.datos.reportes.map((r) => <Fila key={`${r.tipo}:${r.id}`} r={r} alCambiar={recargar} />)}
            </ul>
          </>
        )
      ) : null}
    </Pagina>
  );
};
