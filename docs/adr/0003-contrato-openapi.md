# ADR 0003: Contrato por OpenAPI, sin paquetes compartidos

Fecha: 2026-10-04 · Estado: aceptada

La API publica `openapi.json` (verificado en su CI). El front guarda una copia en `openapi/openapi.json`,
genera tipos con `openapi-typescript` y su CI falla si `schema.d.ts` difiere (`npm run api:check`).
Sincronizar: copiar `openapi.json` de reparto-api a `openapi/openapi.json` y correr `npm run api:generate`.
Pendiente: automatizar la copia (descarga desde la API desplegada o desde el repo con token).
