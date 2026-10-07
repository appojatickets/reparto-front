# ADR 0015 — El pin se ajusta con las entregas hasta que una persona lo verifica

Estado: aceptada. Complementa el ADR 0024 del back.

- Al avisar ENTREGADO con buen GPS (≤ 50 m), el servidor deja el pin del local donde se entregó, por sobre el que había en la base. Con varias entregas queda donde coinciden las demás.
- En la ficha del local (admin y despachador) el pin aparece **POR VERIFICAR** (se va ajustando solo) o **VERIFICADO ✓** (no se mueve). VERIFICAR PIN lo deja fijo; QUITAR VERIFICACIÓN vuelve a ajustarlo.
- Un local sin pin muestra SIN PIN y no ofrece verificar.
- El panel de analítica cuenta pines verificados, por verificar y sin pin.
- Mientras nada esté verificado, incluso un pin exacto pegado desde un enlace de Google Maps se ajusta con la posición del camión.
