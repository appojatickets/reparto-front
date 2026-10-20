# 0040. Cajas opcionales al terminar la ruta

Fecha: 2026-10-20

El cierre mostraba una carga editable sin permitir guardarla: confirmar estaba deshabilitado cuando la jornada todavía no tenía una cuenta de cajas.

Al confirmar una carga escrita durante el cierre, se guarda primero y después se confirman los rebajes. Un rebaje vacío equivale a cero. Si no se escribió carga ni rebajes, se termina sin registrar cajas. Hay una acción explícita para omitir el control, también si su consulta falla.

El backend permite terminar sin cerrar cajas. No se crea un cierre financiero ni una ganancia confirmada al omitirlas; el historial conserva «Cajas sin cerrar». Los errores al guardar conservan la entrada y permiten reintentar u omitir.
