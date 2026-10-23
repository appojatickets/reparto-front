import { describirOrigenPin } from '../../../../domain/origen-pin';
import { useEffect, useRef, useState } from 'react';
import { Map, Marker, NavigationControl, Popup, LngLatBounds, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { VistaRuta } from '../../../../application/modelos';
import type { Posicion, Ubicacion, ErrorUbicacion } from '../../../../application/ports/ubicacion';
import { Boton } from './ui';
import { enlaceNavegar } from '../../../../domain/enlaces';

setWorkerUrl(workerUrl);
export const COLORES = ['#1d4ed8', '#b45309', '#7e22ce', '#047857', '#be123c', '#0e7490'];
const color = (i: number): string => COLORES[i % COLORES.length] ?? '#1d4ed8';

export default function MapaInteractivo({ vista, seleccionar, ocupado = false, ubicacion }: { readonly ubicacion?: Ubicacion | undefined; readonly vista: VistaRuta; readonly seleccionar?: ((id: string) => void) | undefined; readonly ocupado?: boolean }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const mapaActual = useRef<Map | undefined>(undefined);
  const encuadrada = useRef('');
  const miPosicion = useRef<Posicion | undefined>(undefined);
  const [gps, setGps] = useState<{ punto?: Posicion; error?: ErrorUbicacion }>({});
  useEffect(() => {
    if (!contenedor.current) return;
    let mapa: Map;
    try {
      mapa = new Map({ container: contenedor.current, style: 'https://tiles.openfreemap.org/styles/liberty', center: [-70.65, -33.5], zoom: 10, attributionControl: { compact: true } });
    } catch { return; }
    mapaActual.current = mapa;
    mapa.addControl(new NavigationControl(), 'top-right');
    mapa.on('error', () => { setError('Algunas calles no están disponibles. Sin conexión solo se ven las zonas abiertas anteriormente.'); });
    return () => { mapaActual.current = undefined; encuadrada.current = ''; mapa.remove(); };
  }, []);
  useEffect(() => {
    const mapa = mapaActual.current;
    if (!mapa || !ubicacion?.disponible) return;
    let vigente = true;
    let ultimaLectura = 0;
    let marcador: Marker | undefined;
    let caducidad: ReturnType<typeof setTimeout> | undefined;
    const fallo = (error: ErrorUbicacion) => {
      if (!vigente) return;
      clearTimeout(caducidad);
      marcador?.remove(); marcador = undefined; miPosicion.current = undefined;
      setGps({ error });
    };
    const recibir = (punto: Posicion) => {
      if (!vigente) return;
      if (!Number.isFinite(punto.lat) || !Number.isFinite(punto.lng) || Math.abs(punto.lat) > 90 || Math.abs(punto.lng) > 180 || !Number.isFinite(punto.precisionM) || punto.precisionM < 0) { fallo('NO_DISPONIBLE'); return; }
      if (!marcador) {
        const icono = document.createElement('button');
        icono.type = 'button'; icono.className = 'mapa-mi-ubicacion';
        icono.textContent = 'Tú'; icono.setAttribute('aria-label', 'Tu ubicación actual');
        const detalle = document.createElement('p'); detalle.textContent = 'Tu ubicación actual';
        marcador = new Marker({ element: icono }).setPopup(new Popup({ offset: 20 }).setDOMContent(detalle));
      }
      marcador.setLngLat([punto.lng, punto.lat]).addTo(mapa);
      ultimaLectura = Date.now();
      miPosicion.current = punto;
      setGps({ punto });
      clearTimeout(caducidad);
      // Una lectura antigua no se presenta como ubicación en tiempo real.
      caducidad = setTimeout(() => { fallo('TIEMPO'); }, 60_000);
    };
    let leyendo = false;
    const leer = async () => {
      if (leyendo || !vigente) return;
      leyendo = true;
      try {
        const r = await ubicacion.actual();
        if (r.ok) recibir(r.value); else fallo(r.error);
      } catch { fallo('NO_DISPONIBLE'); }
      finally { leyendo = false; }
    };
    // Web entrega cada lectura del GPS; Android y otros puertos sin seguir
    // consultan el GPS local cada cinco segundos, sin llamadas al servidor.
    const detener = ubicacion.seguir?.(recibir, fallo);
    if (!detener) void leer();
    const intervalo = setInterval(() => {
      if (!detener || Date.now() - ultimaLectura >= 20_000) void leer();
    }, 5_000);
    return () => {
      vigente = false; detener?.(); clearInterval(intervalo); clearTimeout(caducidad);
      marcador?.remove(); miPosicion.current = undefined;
    };
  }, [ubicacion]);
  useEffect(() => {
    const mapa = mapaActual.current;
    if (!mapa) return;
    const marcadores: Marker[] = [];
    const limites = new LngLatBounds();
    const agregar = (lng: number, lat: number, numero: string, titulo: string, detalle: string, tono: string, destino?: Parameters<typeof enlaceNavegar>[0], id?: string) => {
      const boton = document.createElement('button');
      boton.type = 'button'; boton.className = 'mapa-pin'; boton.style.backgroundColor = tono;
      boton.textContent = numero; boton.setAttribute('aria-label', `${numero}. ${titulo}`);
      const contenido = document.createElement('div');
      const nombre = document.createElement('strong'); nombre.textContent = titulo;
      const direccion = document.createElement('p'); direccion.textContent = detalle;
      contenido.append(nombre, direccion);
      if (destino) {
        const enlace = document.createElement('a'); enlace.textContent = 'Abrir navegación';
        enlace.href = enlaceNavegar(destino, 'google'); enlace.target = '_blank'; enlace.rel = 'noreferrer'; contenido.append(enlace);
      }
      marcadores.push(new Marker({ element: boton }).setLngLat([lng, lat]).setPopup(new Popup({ offset: 20 }).setDOMContent(contenido)).addTo(mapa));
      if (id && seleccionar) { boton.disabled = ocupado; boton.setAttribute('aria-label', `${numero}. ${titulo}. Cambiar orden`); boton.addEventListener('click', () => { seleccionar(id); }); }
      limites.extend([lng, lat]);
    };
    if (vista.deposito) agregar(vista.deposito.lng, vista.deposito.lat, 'D', vista.deposito.nombre ?? 'Depósito', 'Salida y regreso', '#111827');
    vista.paradas.forEach((p, i) => {
      if (p.lng === undefined || p.lat === undefined) return;
      agregar(p.lng, p.lat, String(i + 1), p.cliente, `${p.direccion}, ${p.comuna}${describirOrigenPin(p) ? ` · ${describirOrigenPin(p)}` : ''}`, p.ubicacionAproximada ? '#9a3412' : color(i), p, p.facturaId);
    });
    const clave = `${vista.camionId}:${vista.fecha}`;
    if (!limites.isEmpty() && encuadrada.current !== clave) {
      mapa.fitBounds(limites, { padding: 65, maxZoom: 15, duration: 0 });
      encuadrada.current = clave;
    }
    return () => { marcadores.forEach((marcador) => { marcador.remove(); }); };
  }, [vista, seleccionar, ocupado]);
  const estadoGps = !ubicacion?.disponible ? 'Ubicación no disponible en este dispositivo.'
    : gps.error === 'PERMISO' ? 'Permite el acceso a tu ubicación en los ajustes del teléfono o navegador para verte en el mapa.'
    : gps.error ? 'Sin señal GPS reciente. Esperando tu ubicación…'
    : gps.punto ? `● Tú · ubicación actual · precisión aproximada de ${Math.round(gps.punto.precisionM)} m.` : 'Buscando tu ubicación GPS…';
  return <><Boton variante="secundario" disabled={!gps.punto || !ubicacion?.disponible} onClick={() => {
    const punto = miPosicion.current;
    if (punto) mapaActual.current?.easeTo({ center: [punto.lng, punto.lat], zoom: 16 });
  }}>MI UBICACIÓN</Boton><p className="ayuda" role="status">{estadoGps}</p><p className="ayuda" role="status">Mapa actualizado · {vista.paradas.length} paradas en el mismo orden que la lista.</p><div ref={contenedor} className="mapa-ruta" role="region" aria-label="Mapa interactivo de las entregas en orden" />{error ? <p role="status" className="ayuda">{error}</p> : null}</>;
}
