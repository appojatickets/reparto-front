import { useEffect, useRef, useState } from 'react';
import { Map, Marker, NavigationControl, Popup, LngLatBounds, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { VistaRuta } from '../../../../application/modelos';
import { enlaceNavegar } from '../../../../domain/enlaces';

setWorkerUrl(workerUrl);
export const COLORES = ['#1d4ed8', '#b45309', '#7e22ce', '#047857', '#be123c', '#0e7490'];
const color = (i: number): string => COLORES[i % COLORES.length] ?? '#1d4ed8';

export default function MapaInteractivo({ vista }: { readonly vista: VistaRuta }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const mapaActual = useRef<Map | undefined>(undefined);
  const encuadrada = useRef('');
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
    if (!mapa) return;
    const marcadores: Marker[] = [];
    const limites = new LngLatBounds();
    const agregar = (lng: number, lat: number, numero: string, titulo: string, detalle: string, tono: string, destino?: Parameters<typeof enlaceNavegar>[0]) => {
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
      limites.extend([lng, lat]);
    };
    if (vista.deposito) agregar(vista.deposito.lng, vista.deposito.lat, 'D', vista.deposito.nombre ?? 'Depósito', 'Salida y regreso', '#111827');
    vista.paradas.forEach((p, i) => {
      if (p.lng === undefined || p.lat === undefined) return;
      agregar(p.lng, p.lat, String(i + 1), p.cliente, `${p.direccion}, ${p.comuna}${p.ubicacionAproximada ? ' · Ubicación aproximada' : ''}`, p.ubicacionAproximada ? '#9a3412' : color(i), p);
    });
    const clave = `${vista.camionId}:${vista.fecha}`;
    if (!limites.isEmpty() && encuadrada.current !== clave) {
      mapa.fitBounds(limites, { padding: 65, maxZoom: 15, duration: 0 });
      encuadrada.current = clave;
    }
    return () => { marcadores.forEach((marcador) => { marcador.remove(); }); };
  }, [vista]);
  return <><p className="ayuda" role="status">Mapa actualizado · {vista.paradas.length} paradas en el mismo orden que la lista.</p><div ref={contenedor} className="mapa-ruta" role="region" aria-label="Mapa interactivo de las entregas en orden" />{error ? <p role="status" className="ayuda">{error}</p> : null}</>;
}
