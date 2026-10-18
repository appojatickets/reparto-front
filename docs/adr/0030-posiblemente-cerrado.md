# 0030 — «Posiblemente cerrado»: el horario no saca paradas de la ruta

Estado: aceptada. Pedido del dueño, 2026-10-11 (razones y contrato: ADR 0042 del back).

## Decisión
- Una parada que según su horario ya cerró (o no atiende hoy) llega de la API dentro de la ruta, al final, y su explicación en `enRiesgo` empieza con «Según su horario…».
- En la fila lleva la marca **POSIBLEMENTE CERRADO**; al abrirla dice la explicación y «Sigue en tu ruta, al final: si está abierto, entrégalo igual». Tiene sus botones de siempre (ENTREGADO, CERRADO, MOVER…).
- «No se pueden atender» queda solo por compatibilidad: la API ya no manda nada ahí.
