# 0007 — La ruta del chofer es una lista numerada que se despliega al tocarla

Estado: aceptada. Pedido del dueño, 2026-10-05: el chofer debe estar pendiente del tránsito y de la ruta; la pantalla tiene que ser simple y no confundir.

## Decisión
- La ruta es **una lista numerada** con, por parada, solo lo esencial: número, **nombre**, **comuna** y la hora a la que llega (más marcas cortas: SIGUIENTE, URGENTE, LLEGA N MIN TARDE).
- **Al tocar una fila se despliega** su detalle (dirección, horario, nota, navegar con Waze o Google Maps, ENTREGADO, ESTÁ CERRADO, NO LA ENCUENTRO, UBICACIÓN DEL VENDEDOR, SUBIR/BAJAR/MÁS). Solo hay una abierta a la vez y la **siguiente viene abierta**: al entregar, la siguiente se abre sola.
- Lo que ya se hizo **queda en la lista con el nombre tachado** y su resultado en texto (✓ ENTREGADA / ✗ NO ENTREGADA, nunca solo color); al tocarlo se puede deshacer.
- La lista **se mantiene al día sola**: se vuelve a pedir cada 3 minutos y al volver a la app (por ejemplo desde Waze), y dice «Actualizada a las HH:MM». Las horas se recalculan desde ahora y desde donde quedó el camión (última entrega).
- Una parada con **ubicación aproximada** (sin pin exacto, ADR 0019 del back) lo dice en su detalle y enlaza a fijar el pin; el GPS de la entrega la mejora.
- Accesibilidad: botones de al menos 4,5 rem en vista grande, estado con texto y no solo color, `aria-expanded`/`aria-controls` en cada fila y foco visible; funciona en los tres modos de color.

## Pendiente
- Enviar la posición del camión en forma periódica para recalcular mientras se mueve (hoy solo se conoce al registrar una entrega); requiere un aviso de posición en la API y el aviso de privacidad (B4).

## Actualización 2026-10-05: atajos en la fila, sin tiempos
- Cada fila trae los atajos **SUBIR** y **BAJAR** (mover), **ENTREGADO** (con el GPS; queda en «Hechas hoy» y se deshace) e **IR** (abre Waze), siempre con **texto, sin símbolos** (más claro para quien maneja); ENTREGADO e IR solo para el chofer y el ayudante. El detalle conserva Waze/Google Maps, cerrado, no la encuentro, foto y MÁS.
- La pantalla **no muestra tiempos calculados** (llegada, regreso, atraso, espera, hora de salida): las estimaciones no son confiables todavía y confundían. La ruta se explica por el orden y por los motivos («Queda cerca de la anterior», «Cierra pronto», «Urgente»). Siguen visibles las restricciones del cliente (ANTES DE hh:mm).
- **Primera entrega**: un selector fija por cuál se empieza y el resto se vuelve a ordenar desde ahí (si la ruta estaba acomodada a mano, se reordena igual al elegirla).
- Las entregas nuevas del chofer se integran solas: se reordena lo que queda (ruta sugerida) o se insertan sin mover lo demás (ruta acomodada a mano).

## Actualización 2026-10-05 (2): terminar la ruta
- **TERMINAR RUTA** va siempre **abajo de la lista** (chofer y ayudante). Si quedan entregas sin hacer pide confirmar («quedan N… mañana empiezas con la lista limpia»); si no, termina directo. Al terminar muestra el resumen del día (entregadas, no entregadas, sin hacer) y **VOLVER AL INICIO**. El servidor registra la hora de término (ADR 0020 del back).
- **Llegada al depósito:** con la pantalla abierta y **después de haber entregado algo**, la app lee el GPS cada 90 s solo para compararlo con el depósito (a menos de 150 m y con precisión de 100 m o mejor). La posición **no se envía ni se guarda**; al salir del depósito, sin entregas hechas, ni siquiera se lee. Si llegó y **no queda nada pendiente**, la ruta termina sola; si quedan pendientes, pregunta («¿Terminaste la ruta?», «No, sigo» deja de preguntar).
- Las pendientes no se marcan como no entregadas: quedan en su día. El día siguiente parte limpio porque todo va por fecha.

