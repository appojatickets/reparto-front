# 0010 — Importar listas de «dirección + enlace de Google Maps»

Estado: aceptada. Pedido del dueño, 2026-10-05: cargar cientos de clientes pegando listas donde cada dirección trae su enlace de Google Maps («es extremadamente útil porque así se puede modelar grandes cantidades de datos»).

## Formato
```
Avenida Portales 4180, San Bernardo
https://maps.app.goo.gl/Unz8sebYG5ooFVh66

Los Suspiros 16463 San Bernardo
https://www.google.com/maps/search/?api=1&query=Los+Suspiros+16463+San+Bernardo%2C+Chile
```
La comuna va al final de la dirección (con o sin coma). La línea en blanco es opcional; una dirección sin enlace también entra; un enlace de búsqueda sin línea de dirección usa la dirección que lleva dentro.

## Qué hace cada enlace
- **Corto** (`maps.app.goo.gl`) o con coordenadas: el servidor lo resuelve (ADR 0018 del back) y el pin queda **validado, fuente enlace**. Si el local ya tenía un pin validado por una persona, queda como propuesta (nada se pisa solo).
- **De búsqueda** (`google.com/maps/search/?api=1&query=…`): solo repite la dirección, no trae lugar. El cliente queda cargado y el pin lo busca el sistema por la dirección (geocodificador, ADR 0019 del back; botón «BUSCAR LOS PINES POR DIRECCIÓN»).

## Decisiones
- Cada línea crea el cliente con la **dirección como razón social** (igual que cuando el chofer registra uno nuevo); el RUT y el nombre se cruzan después. Las pantallas no repiten el texto cuando nombre y dirección son lo mismo.
- Se procesa **desde la app**, de a 3 a la vez, con la API que ya existe (crear cliente + fijar pin desde enlace): no se tocó el servidor. Reimportar es seguro: lo existente se completa, no se duplica.
- La misma dirección repetida entra una vez, con el mejor enlace (el que trae el lugar exacto).
- Las líneas sin comuna reconocible quedan «para revisar» y no se importan hasta corregirlas en el texto.
- No se envía nada fuera de la app y del servidor propio: los enlaces los lee el servidor con la lista de hosts permitidos.

## Actualización: columna «enlace» en la planilla
La planilla de Importar clientes acepta una columna opcional **enlace** (también «enlace google», «url», «link»…). Si la fila trae un enlace de Google Maps **con el lugar** (corto `maps.app.goo.gl` o largo) y **no** trae latitud y longitud, se importa la fila normal (sin esa columna) y después la app lee el enlace y fija el pin, con el mismo camino que usa el chofer al pegar un enlace. Un enlace de búsqueda (`/maps/search/?api=1&query=…`) no trae lugar y no sirve para esto. Una planilla con sus columnas manda sobre la lista de «dirección + enlace», aunque contenga URLs.

Formatos de enlace que el servidor sabe leer: corto (`maps.app.goo.gl`, se abre y se sigue la redirección), largo con `!3d…!4d…` (lugar exacto) o `@lat,lng`, y `?q=`/`ll=`/`query=`/`destination=` con coordenadas. También se acepta pegar solo las coordenadas («-33.5973, -70.7033»). El pin debe caer dentro de la caja de la Región Metropolitana.

