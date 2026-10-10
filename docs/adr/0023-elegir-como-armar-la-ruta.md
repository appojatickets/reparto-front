# 0023 — Elegir cómo se arma la ruta: «calcular mi ruta» o «las agrego en orden»

Estado: aceptada. Pedido del dueño, 2026-10-07 (ver ADR 0037 del back).

## Decisión
- El chofer y el ayudante eligen cómo se arma su ruta: **CALCULAR MI RUTA** (el sistema la ordena) o **LAS AGREGO EN ORDEN** (van en el orden
  en que cargaron las facturas; sirve cuando se saben el recorrido de memoria).
- **La primera vez se pregunta** (no se calcula sola); la elección se recuerda en el teléfono (`reparto.armado.v1`) y desde entonces la ruta
  se arma sola como prefiera.
- Con la ruta armada, un selector «Cómo se arma la ruta» muestra la forma actual (`aria-pressed`) y permite cambiarla en cualquier momento.
  Pasar a «en orden» una ruta acomodada a mano pide confirmar.
- En «en orden» no se ofrece ORDENAR LO QUE QUEDA, VOLVER A CALCULAR ni «primera entrega»; lo que carga después entra al final y lo que
  arrastra se queda donde lo soltó.
- El despachador y el admin ven los dos botones al armar la ruta de un camión (no guardan preferencia).
