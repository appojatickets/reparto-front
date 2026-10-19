# Vista simple para choferes y ayudantes sin permiso de editor

Se aplica automáticamente según rol y permiso existente. La API sigue siendo la autoridad de permisos.

La lista presenta dirección, estado y una sola acción de entregar, cerrado e ir. El detalle se abre a demanda con foto y reportes (nombre, ubicación, foto o no encontrar el local). No encontrar una dirección y encontrar cerrado conservan motivos distintos. Entregar confirma el guardado y permite deshacer.

Ordenar ruta reúne automático, manual y comenzar por. En manual se ofrecen subir, bajar y poner primero; usa las operaciones y versiones existentes, sin sustituir el motor ni alterar el aprendizaje. El mapa conserva sus puntos numerados.

Mi cuenta y emergencia agrupan controles secundarios. El micrófono se pide al dictar; no se monta el aviso global de permisos en la vista simple. GPS nativo sigue siendo voluntario y visible. El cierre desde inicio lleva a la ruta, donde se presenta el resumen y se confirma incluso sin pendientes.

Las pruebas de los controles completos corresponden al chofer editor; hay pruebas adicionales de entrega sin GPS, cierre, reordenación manual y primera parada para el usuario simple. La web se actualiza mediante Vercel; el APK incorpora el frontend y necesita una nueva instalación sobre la anterior.


## Extensión al editor y actualización del recorrido

A petición del dueño, el editor del camión usa también la presentación compacta. Conserva todas sus acciones en Foto y reportes, Editar local y más opciones y Ordenar ruta. Mi cuenta queda desplegable arriba.

Mantener Subir/Bajar previsualiza posiciones cada vez más rápido, desplaza la lista y actualiza los números del mapa. Soltar guarda una sola operación con la versión original. Cancelar restaura la vista; un conflicto recarga la ruta actual del servidor. MapLibre conserva la instancia y el zoom al cambiar el orden, y reemplaza únicamente los marcadores.

Se solicitan ubicación y micrófono al abrir por primera vez. Se recuerda haber preguntado por usuario, y se vuelve a consultar el permiso real al regresar a la app y cada 15 segundos. Android consulta sus permisos nativos para ubicación. La comprobación de estado del servicio distingue permiso y ubicación del teléfono encendida; se avisa si se apaga o se revoca. El GPS continuo se activa explícitamente y el teléfono conserva los permisos.

El último camión se recuerda por usuario en el dispositivo. Cada jornada nueva exige confirmar el camión propuesto; una jornada ya abierta en el servidor prevalece y actualiza ese recuerdo.


## Restauración del botón Mover en todas las vistas

El dueño prefiere el arrastre original: se retiran Subir/Bajar y su pulsación repetida. Mover queda siempre visible para usuarios comunes, ayudantes, editores y administración, incluso con Ordenar ruta cerrado. Mantener y arrastrar cerca del borde conserva el desplazamiento automático original. Al soltar se guarda una sola operación; Escape o cancelar restaura la posición.

## Recorrido externo de Google Maps

Se corrige el límite incoherente del botón (8) frente al generador (9 entregas). El editor tiene un acceso compacto independiente de Ordenar ruta, con lista de las próximas entregas que se enviarán. El enlace se recalcula desde las paradas pendientes visibles tras reordenar o entregar. Google recibe una copia: hay que abrir otra vez el enlace para que una sesión externa use el orden nuevo.

Google documenta hasta 3 paradas intermedias en navegador móvil y hasta 9 en otras plataformas, además del destino, con enlaces de hasta 2048 caracteres. Se conserva el tramo principal de hasta 9 entregas y se ofrece uno corto de hasta 4 (3 intermedias más destino), sin intentar detectar de forma poco fiable si el teléfono abrirá la app o el navegador. Si la longitud obliga a reducir el tramo, se informa la cantidad exacta; nunca se saltan paradas dentro del prefijo. Un punto marcado como aproximado se envía por dirección y comuna, no como coordenada precisa.

Referencia: https://developers.google.com/maps/documentation/urls/get-started
