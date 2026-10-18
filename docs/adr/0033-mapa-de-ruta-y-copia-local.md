# ADR 0033 — Mapa interactivo y copia local de la ruta

## Decisión

MapLibre GL con mapa de calles OpenFreeMap. Se abre bajo demanda en la ruta del camión: marcadores numerados, popup con nombre/dirección y navegación, depósito y colores por tramo. La numeración sigue la lista del chofer; mover entregas actualiza el trazado. Una versión distinta recibida durante la consulta se rechaza para no mezclar trazado y marcadores. Respaldo discontinuo y aviso de ubicaciones aproximadas.

La geometría proviene del backend, con la clave de ORS protegida. No usa Nominatim ni autocompletado externo.

## Sin conexión

El botón GUARDAR RUTA EN ESTE DISPOSITIVO persiste una sola copia de la ruta y su trazado, con usuario y fecha de guardado, sin tokens ni fotos. Se puede consultar en la pantalla Sin conexión cuando no se logra verificar la sesión. Es lectura solamente; no autoriza cambios ni sustituye la autenticación del servidor. Se elimina al salir, al expirar la sesión o al entrar con otra cuenta.

El service worker conserva solo recursos de OpenFreeMap que se cargan al navegar: estilo, fuentes, sprites y teselas. Caché acotada a 250 recursos y 30 días. No hay descargas masivas ni promesa de toda una región sin conexión. Para ver calles sin señal hay que haber abierto antes el área y nivel de zoom necesarios. El navegador puede liberar espacio. MapLibre, estilos propios y worker se incluyen en el precache de la app.

No se guardan ni descargan teselas de tile.openstreetmap.org. No se recalculan calles sin conexión. La copia muestra explícitamente cuándo se guardó y que las entregas pueden haber cambiado.

## Proveedores

https://openfreemap.org/quick_start/ — estilo liberty, con atribución visible en el mapa.
https://openrouteservice.org/restrictions/ — hasta 50 puntos por Directions y 3.500 pares por Matrix.

Los recursos públicos de calles no contienen datos de clientes; la ruta guardada es privada del dispositivo. La cuenta autorizada por el servidor sigue siendo necesaria para pedir geometría nueva.

## Validación

Pruebas de apertura bajo demanda, cambio de versión, guardado y consulta de la copia sin red; caché aislada por usuario y tolerancia a datos corruptos. Check y build. La prueba visual WebGL requiere un navegador compatible; la descarga de Chromium falló en el entorno de trabajo, por lo que no se declara validación visual real del mapa.

## Ajuste solicitado: solo puntos numerados

El mapa deja de dibujar líneas de recorrido y de consultar `/v1/rutas/trazado`. Muestra directamente los puntos y números del orden actual, con colores y popup de navegación. Se mantiene compatibilidad de lectura con las copias guardadas anteriores, pero sus geometrías no se dibujan. El backend conserva el endpoint por compatibilidad; el mapa no lo consume ni necesita una clave ORS para ver los puntos.
