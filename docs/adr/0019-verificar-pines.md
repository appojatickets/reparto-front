# 0019 — Verificar pines: pantalla de revisión y verificación por entregas

Estado: aceptada. Pedido del dueño, 2026-10-08: «validar pines como verificar la foto, con porcentajes: si una o más veces dice entregado y el pin está similar, ya no se toque, con una insignia de verificado; sin hacerlo engorroso; el chofer editor podrá ir verificando». Va con los ADR 0032 (verificación automática y lista) del back.

## Qué cambia
- **Pantalla VERIFICAR PINES** (`/pines/verificar`, en el inicio de admin, despachador y chofer editor): dos listas, **POR VERIFICAR** y **VERIFICADOS**, como la de fotos. Cada pin muestra el cliente, la dirección, la comuna, qué tan firme es (PIN RESPALDADO POR ENTREGAS / EN CONFLICTO / SIN RESPALDO) y tres botones: VERIFICAR PIN (o QUITAR VERIFICACIÓN), VER EN EL MAPA y FICHA. Al verificar, la lista se recarga.
- **Orden de «por verificar»:** primero los que las entregas ya respaldan (se verifican con confianza), después los en conflicto y al final los sin respaldo. Hasta 100; dice cuántos hay.
- **Insignia ✓ VERIFICADO** en la lista de verificados y en la ficha, con quién lo verificó: «Lo verificaron las entregas: coinciden con el pin» o «Lo verificó una persona». Un pin que verifican las entregas (una entrega a ≤60 m de un pin del buscador, de un enlace o de una planilla; dos en días distintos si el pin nació de una entrega) queda así sin que nadie lo mire.
- **Chofer editor:** la acción `verificar-pines` se suma a las del editor (el servidor aplica el permiso `pines:verificar`). No incluye aceptar propuestas ni buscar pines.

## Pendiente
La insignia en la fila de la ruta y en la búsqueda de clientes (hoy está en la ficha y en las listas); necesita que esas respuestas del servidor traigan si el pin está verificado.
