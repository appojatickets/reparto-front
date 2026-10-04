# ADR 0001: Arquitectura hexagonal estricta, verificada en CI

Fecha: 2026-10-04 · Estado: aceptada

`domain ← application ← adapters ← main`. `domain` y `application` no importan librerías; React solo en
`adapters/in/ui` y `main.tsx`; los adaptadores no se importan entre sí (la UI recibe sus casos de uso inyectados
desde `main`). Se verifica con ESLint (`no-restricted-imports`) y dependency-cruiser (`npm run arch`).
