# 0011 — Horarios de atención desde las notas

Estado: aceptada. Pedido del dueño, 2026-10-05: convertir los horarios que vienen escritos en las notas de los clientes en horarios de atención.

## Qué hace
- En **Importar clientes** (admin), «Horarios desde las notas»: **REVISAR LAS NOTAS CON HORARIOS** lee las notas de todos los locales, muestra cuántas se entendieron, cómo quedarían las primeras y cuáles parecen horario pero no quedaron claras. Recién con **APLICAR** se guarda.
- Cada horario entendido se guarda de **lunes a sábado** (el domingo queda sin dato: la nota no lo dice). **Nunca pisa** un horario que el local ya tenía cargado.
- La nota se conserva tal cual (sigue informando al chofer).

## Cómo lee (domain/horario-nota.ts)
Formatos reconocidos: «De 7 AM a 10 pm», «8:30 AM a 5 PM», «Desde las 9 am hasta las 2:30 pm», dos tramos («7 AM a 1 pm y 4 pm a 7:30 pm», «De 9am a 2pm y de | 3pm a 9pm»), «Desde 9 am» / «en adelante» / «Abre a las 11:30» (abre y no se sabe cuándo cierra: hasta 23:59), «Cierra a las 2 pm» / «Recibe hasta las 2:30 pm» (desde el comienzo del día), «Cierra de 2 a 4 pm» (colación: atiende antes y después) y «11:30 apertura | 13 a 15 cierre». Se ignoran «Feriado…», «Después de las 4 pm no», teléfonos y textos sin horas.
- **Conservador:** si no queda claro (horas sueltas sin am/pm como «De 2 a 4», cruces de medianoche, «24 horas»), **no adivina**: un horario mal leído se vuelve una restricción dura de la ruta.
- Probado con las 77 notas del archivo real: las 41 que traían horario se entendieron bien.
