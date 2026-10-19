# Vista simple para choferes y ayudantes sin permiso de editor

Se aplica automáticamente según rol y permiso existente. La API sigue siendo la autoridad de permisos.

La lista presenta dirección, estado y una sola acción de entregar, cerrado e ir. El detalle se abre a demanda con foto y reportes (nombre, ubicación, foto o no encontrar el local). No encontrar una dirección y encontrar cerrado conservan motivos distintos. Entregar confirma el guardado y permite deshacer.

Ordenar ruta reúne automático, manual y comenzar por. En manual se ofrecen subir, bajar y poner primero; usa las operaciones y versiones existentes, sin sustituir el motor ni alterar el aprendizaje. El mapa conserva sus puntos numerados.

Mi cuenta y emergencia agrupan controles secundarios. El micrófono se pide al dictar; no se monta el aviso global de permisos en la vista simple. GPS nativo sigue siendo voluntario y visible. El cierre desde inicio lleva a la ruta, donde se presenta el resumen y se confirma incluso sin pendientes.

Las pruebas de los controles completos corresponden al chofer editor; hay pruebas adicionales de entrega sin GPS, cierre, reordenación manual y primera parada para el usuario simple. La web se actualiza mediante Vercel; el APK incorpora el frontend y necesita una nueva instalación sobre la anterior.
