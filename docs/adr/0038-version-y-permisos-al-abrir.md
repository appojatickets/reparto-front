# 0038. Versión Android y permisos al abrir

## Decisión

Consultar la versión real instalada mediante PackageManager, no mediante el código web. Comparar versionCode con la etiqueta estable android-vN publicada por el workflow existente. La consulta inicial, al recuperar conexión y al volver a la app usa el puerto de descargas que valida el APK firmado y su URL. Las consultas normales se limitan a una cada 15 minutos; se revisa también cada 30 minutos mientras la app es visible. Sin conexión no se inventa una versión ni se bloquea el reparto. El APK piloto no se compara con la distribución porque tiene otro identificador.

Si existe una versión posterior, ofrecer Descargar actualización y Más tarde. Descartar solo la etiqueta actual durante esa sesión; una publicación posterior vuelve a avisar. Descargar no equivale a instalar: Android confirma la instalación, sobre la app existente y con la misma firma. Los APK anteriores necesitan instalar una vez esta versión para incorporar el aviso. La PWA conserva su mecanismo de actualización existente.

Cada apertura autenticada consulta y solicita los permisos pendientes de ubicación y micrófono. Una marca local de consulta anterior nunca evita revisar permisos reales. Los adaptadores evitan repetir solicitudes concedidas o bloqueadas; los permisos denegados muestran instrucciones de Ajustes. Al volver a la app y periódicamente se comprueba si fueron revocados. Si falla la consulta, mostrar la revisión pendiente, sin simular autorización.

Android solicita además notificaciones pendientes sin iniciar seguimiento. El estado del servicio comprueba notificaciones habilitadas, ubicación precisa y GPS del teléfono, al abrir, volver y cada 15 segundos. El usuario activa el GPS de jornada después de elegir camión. El servicio de ubicación en primer plano con notificación puede continuar con Waze o pantalla bloqueada: no se añade ACCESS_BACKGROUND_LOCATION ni se inicia captura oculta al pedir permisos. Se avisa si está detenido o si falta algún ajuste. El reparto manual sigue disponible.

## Verificación

Pruebas de comparación numérica, actualización real frente a versión instalada, aplazamiento, reconexión, piloto, errores, solicitudes por apertura, revocación y notificaciones deshabilitadas. Compilación Android firmada y pruebas web en CI.

## Captura de fachada en Android

El input de fachada mantiene `accept="image/*" capture="environment"` para todos los roles. Capacitor comprueba ACTION_IMAGE_CAPTURE con resolveActivity antes de abrir la cámara; sin visibilidad de ese intent en Android 11+ puede obtener null y abrir la galería como fallback. Se declara únicamente IMAGE_CAPTURE en queries del manifest, sin QUERY_ALL_PACKAGES ni permisos de almacenamiento. La cámara externa escribe mediante el FileProvider ya existente. La foto de perfil sigue utilizando selección de imagen. Esta corrección requiere actualizar el APK; no cambia al desplegar solo la web. La compilación Android valida el manifest, pero la apertura y devolución de una foto requieren comprobación en teléfono.
