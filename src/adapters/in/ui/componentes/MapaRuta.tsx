import { lazy, Suspense, useCallback, useState } from 'react';
import type { VistaRuta } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useUsuario } from '../sesion';
import { guardarMapa, leerMapa, type MapaGuardado } from './mapa-cache';
import { EditarOrdenMapa } from './EditarOrdenMapa';
import { Aviso, Boton, Cargando } from './ui';

const Mapa = lazy(() => import('./MapaInteractivo'));

export const MapaGuardadoOffline = () => {
  const [datos] = useState<MapaGuardado | undefined>(() => leerMapa());
  if (!datos) return <Aviso>No hay un mapa guardado en este dispositivo.</Aviso>;
  return <section className="tarjeta"><h2>Ruta guardada · {datos.vista.fecha}</h2><Aviso>Consulta sin conexión. Guardada el {new Date(datos.guardadoEn).toLocaleString('es-CL')}. El estado de las entregas puede haber cambiado.</Aviso><Suspense fallback={<Cargando />}><Mapa vista={datos.vista} /></Suspense><ol>{datos.vista.paradas.map((p) => <li key={p.facturaId}>{p.cliente} · {p.direccion}, {p.comuna}</li>)}</ol></section>;
};

export const MapaRuta = ({ vista, mover, ocupado = false }: { readonly vista: VistaRuta; readonly mover?: ((id: string, puesto: number) => Promise<boolean>) | undefined; readonly ocupado?: boolean }) => {
  const { ahora } = useCasos();
  const usuario = useUsuario();
  const [elegida, setElegida] = useState<{ id: string; version: number | undefined }>();
  const seleccionar = useCallback((id: string) => { setElegida({ id, version: vista.version }); }, [vista.version]);
  const parada = vista.paradas.find(p => p.facturaId === elegida?.id);
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState('');
  return <section className="tarjeta" aria-label="Mapa de la ruta">
    <Boton variante="secundario" aria-expanded={abierto} onClick={() => { setAbierto(!abierto); }}>{abierto ? 'OCULTAR MAPA' : 'VER MAPA DE MI RUTA'}</Boton>
    {abierto ? <>
      <p className="ayuda">Puntos numerados en tu orden de entrega, sin líneas de recorrido. Toca un número para cambiar su puesto o ver el cliente y navegar.</p>
      <Suspense fallback={<Cargando />}><Mapa vista={vista} ocupado={ocupado} seleccionar={mover ? seleccionar : undefined} /></Suspense>
      {parada && elegida && mover ? <EditarOrdenMapa key={parada.facturaId} parada={parada} total={vista.paradas.length} manual={vista.modo === 'carga'} cancelar={() => { setElegida(undefined); }} guardar={async puesto => {
        if (elegida.version !== vista.version || ocupado) { setAviso('La ruta cambió. Cierra el editor y selecciona de nuevo la entrega.'); return false; }
        return mover(parada.facturaId, puesto);
      }} /> : null}
      {vista.paradas.some((p) => p.ubicacionAproximada || p.lat === undefined) ? <Aviso>Hay ubicaciones pendientes de confirmar.</Aviso> : null}
      <Boton variante="secundario" onClick={() => { const ok = guardarMapa({ usuarioId: usuario.id, vista, trazado: { perfil: 'puntos', tramos: [] }, guardadoEn: ahora().toISOString() }); setAviso(ok ? 'Ruta guardada en este dispositivo. Acerca el mapa a las zonas que necesitas: solo las calles que abras quedan en caché.' : 'No se pudo guardar: revisa el espacio disponible del dispositivo.'); }}>GUARDAR RUTA EN ESTE DISPOSITIVO</Boton>
      <p className="ayuda">El mapa y las calles que abras se guardan temporalmente. Las zonas que no hayas abierto necesitan conexión. El navegador puede liberar el almacenamiento.</p>
      {aviso ? <Aviso>{aviso}</Aviso> : null}
    </> : null}
  </section>;
};
