# 0027 — Interruptor AUTOMÁTICO / MANUAL, días del chofer en ANALÍTICA y «entregado, sin fijar el pin»

Estado: aceptada. Pedido del dueño, 2026-10-10 (contrato y razones: ADR 0040 del back).

## Decisión
- **Orden de la ruta** (reemplaza el selector «Cómo se arma la ruta»): dos botones con `aria-pressed`, **AUTOMÁTICO** y **MANUAL**, bajo el resumen de la ruta.
  - **MANUAL** es un solo toque y no pide confirmar: manda `fijar`, la ruta queda tal como se ve y nada se reordena solo. Recuerda `carga` como preferencia del chofer.
  - **AUTOMÁTICO** pide confirmar (cambia el orden que la persona dejó) y manda `ordenar`. Recuerda `calcular`.
  - En manual se ofrece **VOLVER AL ORDEN EN QUE CARGUÉ** (con confirmación), que rehace la ruta en el orden de carga.
  - Etiquetas: `ORDEN AUTOMÁTICO`, `ORDEN MANUAL` y `AUTOMÁTICO · ACOMODADA A MANO` (ruta calculada en que alguien movió paradas y lo de abajo se ordena solo).
  - La primera vez se sigue preguntando: **CALCULAR MI RUTA** (automática) o **LAS AGREGO EN ORDEN** (manual).
- **ENTREGADO, SIN FIJAR EL PIN** en el detalle de la parada: manda `entregado` con `sinPin: true`, no lee el GPS ni manda posición. La parada pasa a «Hechas hoy».
- **ANALÍTICA**: la comparación «sugerida frente a manejada» solo cuenta los días que ordenó el sistema; los días en orden manual salen aparte, con km manejados frente a
  los que habría sugerido el sistema, cuántos días fueron sin tocar nada y en cuántos el chofer igualó o mejoró al sistema.
