# 0012 — Revisión de fotos (panel del admin)

Estado: aceptada. Pedido del dueño, 2026-10-05: reportar las fotos mal subidas y eliminarlas como admin desde su panel.

## Qué hay
- **Reportar** (chofer, ayudante, despachador, admin): en la tarjeta de la parada, bajo la foto de la fachada, **REPORTAR ESTA FOTO** → motivo (no es la fachada, se ven personas, borrosa u oscura, otro) y explicación opcional → **ENVIAR REPORTE**. Sin foto no hay nada que reportar.
- **Panel «REVISAR FOTOS»** (solo admin, `/admin/fotos`, en el menú del admin):
  - **Reportadas:** la foto, el local, el motivo y la explicación, quién reportó, quién la subió y cuándo. **ELIMINAR LA FOTO** (pide confirmar) la borra del local y del almacenamiento y cierra todos los reportes de esa foto; **LA FOTO ESTÁ BIEN** descarta el reporte.
  - **Subidas hace poco** (las últimas 30, con quién y cuándo): se pueden mirar y eliminar aunque nadie las haya reportado (con confirmación). Las fotos anteriores a este panel no tienen quién/cuándo y lo dicen.
- Eliminar no es reversible; el local queda sin foto y la próxima persona que pase la vuelve a tomar.
- Las URL de las fotos siguen siendo firmadas y de pocos minutos; el panel no las guarda.
