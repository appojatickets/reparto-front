import { lazy, Suspense, useEffect, useState } from 'react';
import type { VistaRuta, TrazadoMapa } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useUsuario } from '../sesion';
import { guardarMapa, leerMapa, type MapaGuardado } from './mapa-cache';
import { Aviso, Boton, Cargando } from './ui';

const Mapa = lazy(() => import('./MapaInteractivo'));
const firma = (v: VistaRuta): string => JSON.stringify([v.camionId, v.fecha, v.version, v.deposito, v.paradas.map((p) => [p.facturaId, p.lat, p.lng, p.ubicacionAproximada])]);

export const MapaGuardadoOffline = () => {
  const [datos] = useState<MapaGuardado | undefined>(() => leerMapa());
  if (!datos) return <Aviso>No hay un mapa guardado en este dispositivo.</Aviso>;
  return <section className="tarjeta"><h2>Ruta guardada · {datos.vista.fecha}</h2><Aviso>Consulta sin conexión. Guardada el {new Date(datos.guardadoEn).toLocaleString('es-CL')}. El estado de las entregas puede haber cambiado.</Aviso><Suspense fallback={<Cargando />}><Mapa vista={datos.vista} trazado={datos.trazado} /></Suspense><ol>{datos.vista.paradas.map((p) => <li key={p.facturaId}>{p.cliente} · {p.direccion}, {p.comuna}</li>)}</ol></section>;
};

export const MapaRuta = ({ vista }: { readonly vista: VistaRuta }) => {
  const { api, ahora } = useCasos();
  const usuario = useUsuario();
  const [abierto, setAbierto] = useState(false);
  const [respuesta, setRespuesta] = useState<{ firma: string; trazado: TrazadoMapa }>();
  const [aviso, setAviso] = useState('');
  const clave = firma(vista);
  const trazado = respuesta?.firma === clave ? respuesta.trazado : undefined;
  useEffect(() => {
    if (!abierto) return;
    const control = new AbortController();
    void api.verTrazado(vista.camionId, vista.fecha, control.signal).then((r) => {
      if (control.signal.aborted) return;
      if (r.ok) {
        if (r.value.version !== vista.version) { setRespuesta({ firma: clave, trazado: { perfil: 'ruta actualizada', tramos: [] } }); setAviso('La ruta cambió durante la consulta. Actualiza la lista para dibujar el orden vigente.'); }
        else setRespuesta({ firma: clave, trazado: r.value });
      }
      else {
        const guardado = leerMapa(usuario.id);
        if (guardado && firma(guardado.vista) === clave) setRespuesta({ firma: clave, trazado: guardado.trazado });
        else setRespuesta({ firma: clave, trazado: { perfil: 'sin conexión', tramos: [] } });
      }
    });
    return () => { control.abort(); };
  }, [api, abierto, clave, vista.camionId, vista.fecha, vista.version, usuario.id]);
  return <section className="tarjeta" aria-label="Mapa de la ruta">
    <Boton variante="secundario" aria-expanded={abierto} onClick={() => { setAbierto(!abierto); }}>{abierto ? 'OCULTAR MAPA' : 'VER MAPA DE MI RUTA'}</Boton>
    {abierto ? <>
      <p className="ayuda">Paradas numeradas en tu orden. Cada tramo tiene un color. Línea discontinua = aproximación, no recorrido por calles.</p>
      {trazado ? <>
        <Suspense fallback={<Cargando />}><Mapa vista={vista} trazado={trazado} /></Suspense>
        <p role="status">{trazado.tramos.filter((t) => t.porCalles).length} de {vista.paradas.length + 1} tramos por calles. {vista.paradas.some((p) => p.ubicacionAproximada || p.lat === undefined) ? 'Hay ubicaciones pendientes de confirmar.' : ''}</p>
        <Boton variante="secundario" onClick={() => { const ok = guardarMapa({ usuarioId: usuario.id, vista, trazado, guardadoEn: ahora().toISOString() }); setAviso(ok ? 'Ruta guardada en este dispositivo. Acerca el mapa a las zonas que necesitas: solo las calles que abras quedan en caché.' : 'No se pudo guardar: revisa el espacio disponible del dispositivo.'); }}>GUARDAR RUTA EN ESTE DISPOSITIVO</Boton>
        <p className="ayuda">El mapa y las calles que abras se guardan temporalmente. Las zonas que no hayas abierto necesitan conexión. El navegador puede liberar el almacenamiento.</p>
      </> : <Cargando texto="Dibujando recorrido…" />}
      {aviso ? <Aviso>{aviso}</Aviso> : null}
    </> : null}
  </section>;
};
