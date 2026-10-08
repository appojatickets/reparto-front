# 0021 — Paradas sin ubicación precisa: se notan y se explican

Estado: aceptada (2026-10-08). Complementa el ADR 0034 del back.

## Decisión
- Una parada con `ubicacionAproximada` (sin pin, o con pin aproximado del buscador) se ve distinta en la lista: borde y fondo **naranja** (tokens `--aprox-bg` y `--aprox-borde` por tema: claro, oscuro y suave) y la insignia de texto **SIN UBICACIÓN PRECISA**, para no depender solo del color.
- Sobre la lista, un aviso cuenta cuántas son: «N paradas sin ubicación precisa: la ruta las ubica por estimación».
- En el detalle de la parada se explica según el caso: **«No se encontró esta dirección en el mapa y no tiene pin»** (`noEncontradaEnMapa`), «Todavía no tiene pin: se está buscando en el mapa» o «Ubicación aproximada». Se recomienda ajustarla: **UBICACIÓN DEL VENDEDOR** para el chofer, o **Fijar el pin** si puede abrir la ficha (admin, despachador, chofer editor). Si no, el pin se fija solo al marcar ENTREGADO en la puerta.
- Al marcar ENTREGADO, si el servidor fijó el pin con el GPS (`pinFijado`), la ruta avisa «La ubicación de … quedó guardada con tu GPS».

## Consecuencias
El chofer sabe cuáles paradas están ordenadas por estimación y cómo mejorarlas, y ve la confirmación cuando su entrega deja el pin fijado. El enlace a la ficha ya no se ofrece a quien no puede abrirla.
