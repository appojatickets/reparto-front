# 0018 — Chofer editor, corregir la ficha y CERRADO en la fila

Estado: aceptada (2026-10-08). Complementa el ADR 0031 del back.

## Decisión
- **Permiso de editor**: el admin lo da o quita en USUARIOS (botón **DAR / QUITAR PERMISO DE EDITOR**, solo para chofer y ayudante; insignia **EDITOR**). La sesión trae `editor`; `puedeEditar(rol, editor)` y `accionesDe(rol, editor)` (dominio) deciden qué se muestra. Sigue siendo solo presentación: la API manda y responde 403.
- El editor gana **BUSCAR CLIENTE** y, en cada parada, **CORREGIR ESTA DIRECCIÓN** (lleva a la ficha). En la ficha ve QUITAR FOTO, **Razón social (corrige un error de tipeo)** y **ELIMINAR ESTA DIRECCIÓN** (confirmación en el mismo lugar; si la API responde 409 por entregas hechas se explica y no se borra).
- **Dirección nueva del chofer** (CARGAR → NO ESTÁ): «Nombre del local (opcional)» pasa a **Razón social**; ya se guardaba como razón social, solo cambia el texto y el dictado.
- **CERRADO en la fila** (junto a MOVER, ENTREGADO e IR): un toque anota «cerrado» (con GPS) y despliega la lista habitual: avisar al vendedor por WhatsApp, ESPERAR 10 MIN, VOLVER MÁS TARDE. **MÁS OPCIONES** suma ESPERAR 15/20 y DEJAR PARA OTRO DÍA. Un segundo toque cierra la lista sin anotar otro aviso. Los atajos miden 64 px de alto (objetivo táctil de la vista grande) y se acomodan en varias líneas.

## Alternativas descartadas
- Un permiso más fino por acción (foto / nombre / eliminar por separado): más pantallas para el admin sin un caso real que lo pida.
- Abrir el panel de CERRADO sin anotar el evento: se pierde la señal de «local cerrado» cuando el chofer decide después.
