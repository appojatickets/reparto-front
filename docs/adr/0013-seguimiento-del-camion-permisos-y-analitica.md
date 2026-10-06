# ADR 0013 — Seguimiento del camión, permisos al abrir y panel de analítica

Estado: aceptada. Complementa el ADR 0022 del back.

## Decisiones

- **Seguimiento del camión.** Mientras la app está abierta (en pantalla) y la persona es chofer o ayudante, se lee el GPS cada minuto y se manda al servidor (`POST /v1/jornada/posiciones`). Se sigue al camión, no a la persona. Sin señal los puntos se guardan (hasta 120) y se mandan juntos; si el servidor responde que no hay jornada o rechaza el punto, no se insiste. El servidor anota solo la llegada si el camión se queda junto al pin de una entrega.
- **Límite conocido.** Una app web no puede seguir el GPS con la pantalla apagada o mientras se navega con otra app: ahí quedan huecos. LLEGUÉ y ENTREGADO siguen siendo los puntos confiables.
- **Permisos al abrir.** Al entrar a la app se pregunta, de a uno, la ubicación y el micrófono (el dictado lo usa). Solo se pregunta lo que aún no se ha preguntado; si se rechaza, la app sigue y avisa qué se pierde y cómo activarlo. No cambia las pantallas de entrada, de elegir camión ni «Mi jornada» cuando todo está concedido.
- **Panel de analítica** (`/admin/analitica`, solo admin): qué datos se guardan y con qué cobertura, qué aprendió el sistema (ritmo, tiempo de atención, capacidad), cuánto se parece la ruta sugerida a la manejada y los locales encontrados cerrados. No muestra horas de llegada. ANALIZAR AHORA corre el análisis a pedido.
- **Cliente nuevo con enlace de Google Maps.** Si el enlace no trae el punto, el servidor lee la página del lugar; si aun así no hay punto, explica que hay que dejar un pin en Google Maps antes de compartir. El sistema además busca la dirección por su cuenta (cola del servidor) y la primera llegada completa el pin.
