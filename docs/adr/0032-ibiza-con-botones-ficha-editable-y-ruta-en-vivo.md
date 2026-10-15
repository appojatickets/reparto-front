# 0032 — «Volver a la empresa» con hora y botones, ficha de cliente editable y ruta compartida en vivo

Estado: aceptada. Pedido del dueño, 2026-10-13/15. Reemplaza lo que decía el ADR 0030/0031 de que la fila de la empresa «solo dice la hora» y la esconde tras VER HORAS ESTIMADAS.

- **Última parada (la empresa, p. ej. Ibiza)**: vuelve a mostrar **siempre la hora aproximada de llegada** y los botones **IR CON WAZE / IR CON GOOGLE MAPS** hacia el depósito configurado. Las horas de las demás paradas siguen tras VER HORAS ESTIMADAS.
- **Ficha del cliente**: en «Corregir esta ficha» ahora también se corrigen la **dirección y la comuna** (el servidor vuelve a buscar el pin si lo había puesto el buscador y nadie lo verificó). El **borrado rápido** (ELIMINAR, con confirmación) está en cada resultado de «Buscar cliente» para quien puede corregir; si la dirección ya tiene entregas la API lo rechaza y se explica, para no perder el historial.
- **Ruta compartida**: el camión es dueño de la ruta y varias personas (chofer, ayudante, despacho) la ven a la vez. La app consulta cada 8 s la marca liviana `GET /v1/rutas/marca` (solo con la app a la vista) y recarga la ruta completa si alguien más la movió, cargó una factura o entregó. Al terminar con un compañero aún en el camión, el aviso lo dice y la ruta queda para él (ADR 0045 del back).
- **Analítica**: nueva sección «Lo entregado frente a la ruta con que salió el camión» (entregadas, pares fuera de orden y si salió como sugería el sistema).
- **Analítica, cierre por GPS**: sección «Cerrado: lo que dice el GPS frente al botón» con coincidencias, cierres solo del GPS o solo del botón, cobertura del GPS y casos para revisar a mano (ADR 0046 del back). Solo mide; no cambia rutas.
