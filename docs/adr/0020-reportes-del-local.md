# 0020 — Reportes: foto, nombre y ubicación en una sola sección; insignias ✓

Estado: aceptada. Pedido del dueño, 2026-10-08: «en el panel admin nunca llegó lo de las fotos reportadas; debe haber una sección con pines e imágenes o nombres, donde aparezca reportar imagen, nombre o ubicación», y «las insignias de fotos y de pines». Va con el ADR 0033 del back.

## Qué cambia
- **Sección REPORTES** (admin y despachador, `/admin/reportes`): una sola lista con lo reportado, del más nuevo al más antiguo. Cada reporte dice de qué es (REPORTE DE FOTO / NOMBRE / UBICACIÓN), del local, quién reportó y cuándo, y trae sus acciones:
  - **Foto:** se ve la foto; ELIMINAR LA FOTO o LA FOTO ESTÁ BIEN. Si ya la reemplazaron, solo CERRAR EL REPORTE.
  - **Nombre:** dice cómo debería llamarse (si quien reportó lo escribió); ABRIR LA FICHA, YA ESTÁ CORREGIDO o DESCARTAR.
  - **Ubicación:** VER EL PIN EN EL MAPA; EL PIN ESTÁ BIEN (queda verificado y se cierra), ABRIR LA FICHA, YA ESTÁ CORREGIDO o DESCARTAR.
  - Si el nombre o el pin ya cambió desde el reporte, lo dice.
- **El inicio del admin muestra cuántos reportes hay** («REPORTES (3)»), para que no pasen inadvertidos. «REVISAR FOTOS» sigue igual.
- **Reportar desde donde se ve el local:** en el detalle de cada parada de la ruta y en la ficha hay REPORTAR EL NOMBRE y REPORTAR LA UBICACIÓN (sin pin no se ofrece la ubicación), junto al REPORTAR ESTA FOTO de siempre. Reportar la ubicación saca al pin de «verificado» y lo avisa.
- **Insignias ✓ PIN y ✓ FOTO** en cada parada de la ruta, en los resultados de BUSCAR CLIENTE y en la ficha, solo cuando el pin está verificado (por una persona o por las entregas) y cuando la foto fue dada por buena.
