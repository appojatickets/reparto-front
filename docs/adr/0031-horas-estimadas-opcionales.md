# 0031 — Horas estimadas de llegada: se ven solo si se piden

Estado: aceptada. Pedido del dueño, 2026-10-11 («ahora la hora estimada es más real: añade las horas con un botón para habilitar o deshabilitar, y lo mismo con la de Ibiza»).

## Decisión
- Por defecto la ruta **no muestra horas** (como se había pedido: no eran confiables). Un botón bajo el resumen, **VER HORAS ESTIMADAS** / **OCULTAR HORAS ESTIMADAS** (`aria-pressed`), las enciende y apaga.
- Encendido: cada parada muestra **«~10:10»** a la derecha de su fila y la fila final **«Llegada aproximada 11:40»** (Ibiza). Apagado: ninguna de las dos.
- Las horas se redondean a los 5 minutos más cercanos (nunca decimales) y siempre se dicen aproximadas.
- La elección se recuerda en el teléfono (`reparto.horas.v1`, puerto `HorasStore`), por persona y dispositivo.
