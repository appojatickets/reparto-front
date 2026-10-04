# reparto-web

PWA de reparto (Vite + React + TypeScript estricto, arquitectura hexagonal). Despliegue: Vercel (SPA estática, portable).

## Comandos
`npm run check` (lint, typecheck, tests, arquitectura) · `npm run e2e` (Playwright + axe; en este entorno: `CHROMIUM_PATH=/opt/pw-browsers/chromium`)
· `npm run api:generate` regenera el cliente desde `openapi/openapi.json`. Variables en `.env.example`.

## Estructura
`src/domain` ← `src/application` (casos de uso + puertos) ← `src/adapters/{in/ui,out/*}` ← `src/main.tsx`. Decisiones en `docs/adr/`, spikes en `docs/spikes/`.
