# 0006 — Importar la lista de Google Maps tal como se copia

Estado: aceptada. Pedido del dueño, 2026-10-05 (ADR 0018 del repo back: la base se nutre con pines puestos en el lugar, ubicaciones de WhatsApp y enlaces de Google Maps).

## Contexto
El equipo ya juntó cientos de clientes como lista de Google Maps: pines puestos estando en el lugar («Pin colocado»), ubicaciones que mandó el vendedor por WhatsApp («Ubicación compartida») y fichas de Google, cada uno con una nota (nombre del cliente, dirección escrita, horario, teléfono). Copiada como texto, esa lista viene desordenada: el orden de las líneas cambia, hay bloques partidos, nombres en minúsculas, comunas pegadas a la dirección o ausentes, y solo ~1 de cada 4 entradas trae coordenadas (el resto trae «Cerca de …»).

## Decisión
- En IMPORTAR CLIENTES se detecta sola una lista de Google Maps (líneas «Pin colocado» o «Ubicación compartida») y se interpreta en el navegador (`domain/lista-maps.ts`, función pura con pruebas); no hay cambios en la API: las filas ordenadas entran por la misma importación de la planilla (reimportar es seguro).
- Cada entrada se ordena en razón social, dirección, comuna, pin, giro (la categoría de Google) y nota:
  - **Pin:** coordenadas decimales o en grados-minutos-segundos; si caen fuera de la Región Metropolitana no se usan.
  - **Dirección:** la escrita por el equipo; si falta, la calle de la ficha de Google; si falta, la referencia «Cerca de …» (queda como «aproximada»).
  - **Comuna:** la escrita al final de la dirección o suelta (también sectores como Chicureo o Batuco), la de la ficha de Google o la de la referencia «Cerca de …».
  - **Nombre:** la primera línea que parece nombre; si no hay, el título de Google (se avisa en la nota). El título de Google, cuando hay otro nombre, queda como «Nombre comercial» en la nota (los vendedores conocen al cliente por ese nombre).
  - **Nota:** horario, teléfono, observaciones y la referencia «Cerca de …»; «este lugar ya no existe» se anota. «Cerrado permanentemente» descarta la entrada.
  - **Limpieza:** mayúsculas en nombres y calles, `spa → SpA`, `eirl → EIRL`, sin espacios repetidos.
- Lo que no se puede entender (sin nombre, sin comuna, sin dirección, fuera de la RM, nombre de prueba) queda **para revisar** con el motivo. La pantalla deja completarlo ahí mismo (razón social, dirección, comuna) y, al completarse, pasa a «listo». Nada se inventa.
- El pin con coordenadas entra como «sugerido» de fuente «importado» (como cualquier importación) y no pisa un pin validado; se afirma con las entregas o con el enlace del vendedor (ADR 0018).

## Pines sin comuna y repetidos
- Con las coordenadas basta: sin dirección escrita, la dirección es «Ubicación en el mapa (lat, lng)» y se navega con el pin. La comuna se estima por el centro más cercano solo si es claro (el segundo queda al doble de distancia); si no, se ofrecen las dos más cercanas.
- El botón **BUSCAR LA COMUNA DE N PINES (OPENSTREETMAP)** consulta a Nominatim (geocodificación inversa, gratuita, 1 consulta por segundo) la comuna real de cada pin. Solo se envían coordenadas, nunca nombres ni direcciones. Es una salida por un puerto (`Geocodificador`) y se detiene con aviso si el servicio no responde o llega al límite.
- Los repetidos (mismo nombre y misma dirección escrita, o pines a menos de 150 m, o una ficha sin dirección propia) se unen en una sola entrada; el mismo nombre con direcciones distintas son locales distintos.
- Las entradas sin nombre se pueden omitir (de a una o todas a la vez).

## Límites conocidos
- El texto copiado **no trae las coordenadas** de los pines que Google describe como «Cerca de …». Para traerlas todas hay que exportar la lista con coordenadas (por ejemplo Google Takeout o compartir cada lugar); mientras tanto el pin se completa con la primera entrega o pegando el enlace.
- Distinguir nombre de dirección es heurístico (dígitos, palabras como «parcela», «camino», siglas de empresa); los casos dudosos van a revisar o se corrigen a mano.
- El horario queda como texto en la nota; convertirlo al horario estructurado del local es un paso aparte.
