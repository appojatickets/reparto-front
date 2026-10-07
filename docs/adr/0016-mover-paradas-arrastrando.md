# 0016 — Mover una parada arrastrándola

Estado: aceptada. Pedido del dueño, 2026-10-07: «presionar el botón y que pueda subir y bajar como un scroll y, cuando lo suelte, se posicione en la lista». Va con el ADR 0027 del back (operación `mover`).

## Qué cambia en la ruta
- **SUBIR y BAJAR se reemplazan por un asa «↕ MOVER»** en cada fila de la lista de paradas. Se apoya el dedo en el asa, se arrastra hacia arriba o abajo y al soltar la parada queda en ese lugar.
- **Mientras se arrastra:** la fila sigue al dedo, las demás se corren para abrir el hueco donde caería y el celular vibra un instante al agarrarla. **Cerca del borde de arriba o de abajo la pantalla se desplaza sola** (más rápido mientras más cerca del borde), así se puede llevar una parada lejos en una lista larga sin soltarla. **Escape cancela**; apoyar y soltar sin moverse no cambia nada.
- **Al soltar, la parada queda en su lugar de inmediato**, sin esperar al servidor; el servidor lo confirma y recalcula lo de abajo (ADR 0029 del back: lo que se cambia a mano manda y lo de abajo se ordena solo). Si falla, la parada vuelve a donde estaba y se avisa. Si otra persona cambió la ruta mientras tanto (409), se avisa y se recarga.
- **Una sola operación por arrastre** (`mover` con la posición final), no una por cada lugar que se cruza.
- **Sin dedo:** las flechas ↑ ↓ con el asa enfocada hacen lo mismo, de a un lugar. Se anuncia «Local X quedó en el lugar N» (también para lectores de pantalla).
- El asa es un botón grande como los demás (mismo alto táctil) y es la única zona que no desplaza la página al tocarla; el resto de la fila sigue desplazándose normal.

## Cómo está hecho
- La cuenta (a qué lugar corresponde la posición del dedo, cuánto desplazar en los bordes, cómo queda la lista) es aritmética pura en `domain/arrastre.ts`, con pruebas.
- El gesto usa eventos de puntero (`touch-action: none` solo en el asa, captura del puntero) en `adapters/in/ui/arrastre.ts`; sin librerías nuevas.
- Probado en Chromium con tamaño de celular: dedo táctil real, mouse, cancelar con Escape, teclado y desplazamiento automático (`e2e/arrastre.spec.ts`).
