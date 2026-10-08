# 0017 — Qué tan firme es un pin (ficha del local)

Estado: propuesta (rama `claude/relaxed-allen-xpaz4l`, sin mergear a `main`). Va con el ADR 0030 del back.

## Qué cambia
La ficha del local (con pin) muestra, en vez del genérico «PIN POR VERIFICAR», **qué tan firme es el pin según las entregas**, con una frase que lo explica:
- **PIN VERIFICADO ✓**: una persona lo confirmó («no se mueve solo»; si hay entregas que coinciden con él, lo dice).
- **PIN RESPALDADO POR ENTREGAS**: «3 entregas, en 2 días, coinciden junto a este pin. Puedes verificarlo con confianza.»
- **PIN EN CONFLICTO**: «Las entregas coinciden a 445 m de este pin. Revisa dónde está el local.» (o «se avisaron desde lugares distintos»).
- **PIN SIN RESPALDO**: todavía no hay entregas suficientes; dice cuánta evidencia hay y qué falta.

Los botones no cambian (VERIFICAR PIN / QUITAR VERIFICACIÓN). Si el servidor no manda el nivel (versión anterior o no pudo calcularlo), la ficha se ve como antes. El texto es aritmética pura en `domain/respaldo-pin.ts`, con pruebas.
