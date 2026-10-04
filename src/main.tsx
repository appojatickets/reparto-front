import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { checkServer } from './application/use-cases/check-server';
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
  subirFotoLocal: crearSubirFotoLocal({ api, imagenes: imagenesCanvas, subida: subidaHttp() }),
  ahora: () => new Date(),
  voz: crearVozWeb(),
  vista: crearVistaStore(),
};
const deps = { api, timer: browserTimer, wakingAfterMs: 3000 };

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
