# 0008 — Cargar entregas: autocompletar y «buscar y registrar» una dirección nueva

Estado: aceptada. Pedido del dueño, 2026-10-05 (flujo del chofer: login → elegir camión → mi jornada → cargar → ruta).

## Flujo
1. El chofer tiene 30 a 40 facturas impresas. Por cada una **escribe o dicta el RUT, la razón social o la dirección** y el sistema **autocompleta** desde la base (ya existía). Toca el cliente correcto y la entrega queda cargada.
2. Si no está, **NO ESTÁ: BUSCAR Y REGISTRAR**: solo la dirección que dice la factura (y la comuna); el nombre y el RUT son opcionales y se cruzan después.
3. **Ubicación del cliente nuevo**, en este orden:
   - **BUSCAR LA DIRECCIÓN EN EL MAPA** (OpenStreetMap, gratis): una consulta por toque (el servicio prohíbe autocompletar letra por letra), con la dirección limpia (sin «parcela», «sitio», «S/N») y acotada a la Región Metropolitana. Muestra hasta 5 lugares («Con el número» primero) y el chofer toca el correcto.
   - Si el mapa no la halla (típico de parcelas y caminos rurales): **BUSCAR EN GOOGLE MAPS** abre la app con la dirección escrita; el chofer elige el lugar, toca *Compartir → Copiar enlace*, vuelve y toca **PEGAR LO QUE COPIÉ**. El servidor lee el enlace corto de Google (ADR 0018 del back) y fija el pin.
4. El lugar elegido queda como **pin del cliente para todos y para los días siguientes**; Waze y Google Maps lo usan por igual para navegar.
5. Si el pin no se puede leer, el cliente **igual queda cargado** y el aviso lo dice: el pin se completa después (búsqueda automática del servidor, GPS de la primera entrega o enlace del vendedor).

## Decisiones
- **Solo Google Maps** sirve para traer un lugar de vuelta: compartir desde Waze entrega un viaje en vivo, no una ubicación (probado por el dueño). Waze se usa únicamente para navegar.
- Autocompletar con calles reales como Google exigiría Places (de pago, con tarjeta): descartado por la regla «todo gratis».
- Privacidad: al buscar una dirección nueva se envía a OpenStreetMap solo el texto de la dirección (calle, número, comuna), nunca el nombre ni el RUT del cliente.

## Pendiente (siguientes pasos del flujo)
- Pantalla aparte de la ruta como **lista compacta** (filas, no tarjetas) con atajos ⬆ ⬇ ✓ IR.
- Al mover una parada, el resto se reordena solo alrededor de esa decisión.
- Probar el enlace corto de Google Maps con un caso real (no se pudo desde el entorno del agente).
