import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { checkServer } from './application/use-cases/check-server';
import { createHttpApiClient } from './adapters/out/api/http-api-client';
import { browserTimer } from './adapters/out/timer/browser-timer';
import { App } from './adapters/in/ui/App';
import './adapters/in/ui/styles.css';

const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) throw new Error('Falta VITE_API_URL');

const api = createHttpApiClient({ baseUrl: apiUrl });
const deps = { api, timer: browserTimer, wakingAfterMs: 3000 };

const root = document.getElementById('root');
if (!root) throw new Error('Falta #root');

createRoot(root).render(
  <StrictMode>
    <App checkServer={(signal, onStatus) => checkServer(deps, signal, onStatus)} />
  </StrictMode>,
);
