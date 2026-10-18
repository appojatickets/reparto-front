# ADR 0034 — Android con Capacitor, icono y GPS de jornada

## Decisión

Conservar React/Vite como interfaz web y empaquetarla localmente en Android con Capacitor 8. App `cl.reparto.app`, nombre Reparto, icono adaptativo negro/amarillo derivado del pin existente y permiso de notificación. No se carga una página remota dentro del APK ni se agrega un proveedor de pago.

El botón ACTIVAR GPS DE JORNADA comprueba la jornada en el servidor y pide ubicación precisa y notificación. Un servicio Android de tipo `location` mantiene la captura al abrir Waze/Maps o bloquear la pantalla. Muestreo de al menos 15 segundos y desplazamiento mínimo; envío cada minuto en lotes de 30. Se usa LocationManager, sin servicio de geolocalización de pago ni dependencia de Google Play Services para el seguimiento continuo.

Los temporizadores JS no participan en el GPS nativo. La web conserva su seguimiento anterior mientras está visible. Las lecturas puntuales al entregar usan el plugin oficial Geolocation en Android.

## Sesión y datos

El puente HTTP nativo solo recibe rutas `/v1/` de la API HTTPS configurada. Ni sigue redirecciones ni copia credenciales a otros dominios. La misma sesión se comparte entre peticiones de la interfaz y envíos del servicio, con renovación serializada; así no hay dos mecanismos que roten el refresh token al mismo tiempo. Los tokens JS están en memoria, y tokens/cola nativos quedan cifrados con AES-GCM y clave en Android Keystore. Se deshabilita Android backup. Fotografías y ficheros externos siguen su flujo separado.

Cola de hasta 600 puntos, conservando solo los últimos 6 h compatibles con el backend. Antes de subir verifica que siga la misma jornada; no reutiliza puntos en otro camión. Nunca registra posiciones ni credenciales en logs.

## Detención

Se detiene desde el botón, la acción de la notificación, terminar jornada, cambiar camión, cerrar sesión o retirar la app de recientes. Sin reinicio al encender el teléfono ni reinicio automático después de cierre forzado. Tiene límite máximo de 14 h por activación, incluso sin red. Android puede interrumpir el servicio por batería, permisos o restricciones del fabricante; hace falta una prueba real con los teléfonos de los choferes. No se promete ejecución indefinida ni captura después de Forzar detención.

## Compilación

`npm run android:sync` construye y copia los assets; `npm run android:open` abre Android Studio. `npm run android:apk` ejecuta pruebas Java y compila APK debug. Se requiere JDK 21 y Android SDK 36. La URL pública por defecto es la misma usada por la web desplegada: `https://reparto-back.onrender.com`; puede sustituirse con VITE_API_URL HTTPS.

El workflow Android APK de pruebas compila al publicar en main y deja `app-debug.apk` como artefacto durante 14 días. No publica en Play Store ni contiene claves de firma de producción. Una compilación debug sirve para el piloto; para distribuir actualizaciones sin desinstalar hará falta conservar una firma estable fuera del repositorio.

Las zonas de mapa sin conexión dependen de los recursos guardados en cada entorno. El service worker se usa solo en navegador; en Android no se promete descarga de toda la región. La copia local de la ruta sigue disponible.

## Validación

Pruebas de separación de dominios HTTP, restauración y cierre de sesión, cancelación y controles de activación/detención. Pruebas Java de límites de jornada y antigüedad del GPS. Check, build y cap sync locales. Compilación completa y prueba Java en GitHub Actions porque el entorno local no puede descargar Gradle y no tiene SDK/JDK 21. Prueba física pendiente: pantalla apagada, Waze abierto, pérdida de red, cierre de sesión y fin de jornada.
