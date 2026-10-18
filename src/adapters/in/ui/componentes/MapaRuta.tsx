import { lazy, Suspense, useState } from 'react';
import type { VistaRuta } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useUsuario } from '../sesion';
import { guardarMapa, leerMapa, type MapaGuardado } from './mapa-cache';
import { Aviso, Boton, Cargando } from './ui';

const Mapa = lazy(() => import('./MapaInteractivo'));

export const MapaGuardadoOffline = () => {
  const [datos] = useState<MapaGuardado | undefined>(() => leerMapa());
  if (!datos) return <Aviso>No hay un mapa guardado en este dispositivo.</Aviso>;
  return <section className="tarjeta"><h2>Ruta guardada · {datos.vista.fecha}</h2><Aviso>Consulta sin conexión. Guardada el {new Date(datos.guardadoEn).toLocaleString('es-CL')}. El estado de las entregas puede haber cambiado.</Aviso><Suspense fallback={<Cargando />}><Mapa vista={datos.vista} /></Suspense><ol>{datos.vista.paradas.map((p) => <li key={p.facturaId}>{p.cliente} · {p.direccion}, {p.comuna}</li>)}</ol></section>;
};

export const MapaRuta = ({ vista }: { readonly vista: VistaRuta }) => {
  const { ahora } = useCasos();
  const usuario = useUsuario();
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState('');
  return <section className="tarjeta" aria-label="Mapa de la ruta">
    <Boton variante="secundario" aria-expanded={abierto} onClick={() => { setAbierto(!abierto); }}>{abierto ? 'OCULTAR MAPA' : 'VER MAPA DE MI RUTA'}</Boton>
    {abierto ? <>
      <p className="ayuda">Puntos numerados en tu orden de entrega, sin líneas de recorrido. Toca un punto para ver el cliente y navegar.</p>
      <Suspense fallback={<Cargando />}><Mapa vista={vista} /></Suspense>
      {vista.paradas.some((p) => p.ubicacionAproximada || p.lat === undefined) ? <Aviso>Hay ubicaciones pendientes de confirmar.</Aviso> : null}
      <Boton variante="secundario" onClick={() => { const ok = guardarMapa({ usuarioId: usuario.id, vista, trazado: { perfil: 'puntos', tramos: [] }, guardadoEn: ahora().toISOString() }); setAviso(ok ? 'Ruta guardada en este dispositivo. Acerca el mapa a las zonas que necesitas: solo las calles que abras quedan en caché.' : 'No se pudo guardar: revisa el espacio disponible del dispositivo.'); }}>GUARDAR RUTA EN ESTE DISPOSITIVO</Boton>
      <p className="ayuda">El mapa y las calles que abras se guardan temporalmente. Las zonas que no hayas abierto necesitan conexión. El navegador puede liberar el almacenamiento.</p>
      {aviso ? <Aviso>{aviso}</Aviso> : null}
    </> : null}
  </section>;
};
