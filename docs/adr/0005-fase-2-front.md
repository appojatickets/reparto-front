# ADR 0005: Front de la fase 2 (auth, router, planillas)

Fecha: 2026-10-04 · Estado: aceptada

- **Autenticación mediada por la API** (`POST /v1/auth/login`), no por el SDK de Supabase en el navegador: el front no
  necesita `@supabase/supabase-js`, el correo sintético vive solo en el servidor y el bloqueo por intentos lo decide la API.
  La sesión (access + refresh token) se guarda en `localStorage` (sesión larga para el chofer) y se renueva sola ante un 401
  con una única renovación compartida entre llamadas simultáneas.
- **Sin señal no se cierra la sesión:** solo un 401/403 del servidor la descarta.
- **`react-router` (dependencia nueva):** rutas por rol (cada ruta declara la acción que exige; la API vuelve a comprobar
  con 403). Es la librería estándar y evita un enrutador propio. `vercel.json` agrega el fallback a `index.html` (sigue siendo
  una SPA estática portable a otro host con la misma regla).
- **Planillas:** CSV/TSV/Excel pegado se lee en el navegador con un parser propio (sin dependencias) y las columnas se
  reconocen por sinónimos; el servidor valida cada fila y reporta las inválidas sin detener el lote. Importación por lotes de
  500 filas (Render Free tiene poca CPU); reimportar es seguro.
- **Fotos:** el navegador comprime a ~120 KB (WebP, o JPEG si el navegador no codifica WebP) y sube directo a Storage con una
  URL firmada que entrega la API.
- Las pantallas de pines usan una lista y no un mapa: MapLibre llega en la fase 3 (spike S2 pendiente).
