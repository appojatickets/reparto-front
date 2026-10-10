import { StrictMode } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { createRoot } from 'react-dom/client';
import { checkServer } from './application/use-cases/check-server';
import { crearBuscarDireccion } from './application/use-cases/buscar-direccion';
import { crearCompletarComunas } from './application/use-cases/completar-comunas';
import { crearNominatim } from './adapters/out/geocodificador/nominatim';
import { crearAplicarHorariosDeNotas } from './application/use-cases/horarios-de-notas';
import { crearImportarEnlaces } from './application/use-cases/importar-enlaces';
import { crearImportarClientesEnLotes } from './application/use-cases/importar-clientes';
import { crearCerrarSesion, crearIniciarSesion, crearRestaurarSesion } from './application/use-cases/sesion';
import { crearSubirFotoLocal } from './application/use-cases/subir-foto';
import { createHttpApiClient } from './adapters/out/api/http-api-client';
import { subidaHttp } from './adapters/out/almacen/subida-http';
import { imagenesCanvas } from './adapters/out/imagen/comprimir-canvas';
import { crearSesionStore } from './adapters/out/sesion/local-storage-store';
import { browserTimer } from './adapters/out/timer/browser-timer';
import { App } from './adapters/in/ui/App';
import { Aplicacion } from './adapters/in/ui/Aplicacion';
import { crearPermisosWeb } from './adapters/out/permisos/permisos-web';
import { crearUbicacionWeb } from './adapters/out/ubicacion/geolocalizacion';
import { crearDescargaNavegador } from './adapters/out/descarga/descarga-navegador';
import { crearExportacionStore } from './adapters/out/exportacion/local-storage-exportacion';
import { crearTemaStore } from './adapters/out/tema/local-storage-tema';
import { crearArmadoStore } from './adapters/out/armado/local-storage-armado';
import { crearVistaStore } from './adapters/out/vista/local-storage-vista';
import { crearVozWeb } from './adapters/out/voz/voz-web';
import { ProveedorCasos, type Casos } from './adapters/in/ui/contexto';
import { EVENTO_SERVIDOR_DESPERTANDO } from './adapters/in/ui/despertando';
import { EVENTO_SESION_EXPIRADA } from './adapters/in/ui/sesion';
import './adapters/in/ui/styles.css';

const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) throw new Error('Falta VITE_API_URL');

// Adaptadores de salida
const store = crearSesionStore();
const api = createHttpApiClient({
  baseUrl: apiUrl,
  store,
  alExpirarSesion: () => window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA)),
  alEsperarServidor: (activo) => window.dispatchEvent(new CustomEvent(EVENTO_SERVIDOR_DESPERTANDO, { detail: activo })),
});

// Casos de uso con sus puertos inyectados
const casos: Casos = {
  api,
  iniciarSesion: crearIniciarSesion({ api, store }),
  restaurarSesion: crearRestaurarSesion({ api, store }),
  cerrarSesion: crearCerrarSesion({ store }),
  importarClientesEnLotes: crearImportarClientesEnLotes({ api }),
  importarEnlaces: crearImportarEnlaces({ api }),
  aplicarHorariosDeNotas: crearAplicarHorariosDeNotas({ api }),
  completarComunas: crearCompletarComunas({ geocodificador: crearNominatim(), timer: browserTimer }),
  buscarDireccion: crearBuscarDireccion({ geocodificador: crearNominatim() }),
  subirFotoLocal: crearSubirFotoLocal({ api, imagenes: imagenesCanvas, subida: subidaHttp() }),
  descarga: crearDescargaNavegador(),
  exportacion: crearExportacionStore(),
  ahora: () => new Date(),
  voz: crearVozWeb(),
  ubicacion: crearUbicacionWeb(),
  permisos: crearPermisosWeb(),
  vista: crearVistaStore(),
  armado: crearArmadoStore(),
  tema: crearTemaStore(),
};
const deps = { api, timer: browserTimer, wakingAfterMs: 3000 };

// Si hay una versión nueva de la app, se baja y la página se recarga sola (con «autoUpdate»); además se busca al volver a la app y cada media hora.
registerSW({
  immediate: true,
  onRegisteredSW: (_url, registro) => {
    if (!registro) return;
    const buscar = (): void => { void registro.update(); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') buscar(); });
    setInterval(buscar, 30 * 60 * 1000);
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Falta #root');

createRoot(root).render(
  <StrictMode>
    <App checkServer={(signal, onStatus) => checkServer(deps, signal, onStatus)}>
      <ProveedorCasos casos={casos}>
        <Aplicacion />
      </ProveedorCasos>
    </App>
  </StrictMode>,
);
