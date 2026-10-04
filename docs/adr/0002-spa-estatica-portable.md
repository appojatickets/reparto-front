# ADR 0002: SPA estática, sin funciones propias de Vercel

Fecha: 2026-10-04 · Estado: aceptada

Vercel Hobby limita el uso comercial; el dueño aceptó el riesgo. Plan B: mover `dist/` a otro host estático.
Por eso no se usan funciones de servidor ni APIs de Vercel. Cuando existan rutas del lado cliente (fase 3),
el fallback a `index.html` se configura por host (en Vercel con `vercel.json` de rewrites, sin código propio de Vercel).
