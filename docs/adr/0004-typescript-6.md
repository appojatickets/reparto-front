# ADR 0004: TypeScript 6.0 y override de openapi-typescript

Fecha: 2026-10-04 · Estado: aceptada

`typescript-eslint` exige `typescript <6.1`, por lo que se fija `~6.0.3`. `openapi-typescript` 7.x declara peer
`typescript ^5`; se acota con `overrides` solo para ese paquete (el generador funciona con 6.0; verificado en `api:generate`).
