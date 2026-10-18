# Instalar Reparto en Android para el piloto

Requiere Android 8.0 o posterior.

1. Abre https://github.com/appojatickets/reparto-front/actions y entra a **Android APK de pruebas** del último commit de main.
2. Cuando esté verde, baja el artefacto **reparto-android-pruebas**, descomprime el ZIP y abre **app-debug.apk** en el teléfono.
3. Android puede pedir permitir instalaciones desde el navegador o gestor de archivos. Autoriza ese origen para instalar tu APK de pruebas.
4. Abre Reparto, inicia sesión y elige tu camión. Pulsa **ACTIVAR GPS DE JORNADA** y concede ubicación precisa y notificaciones.
5. Comprueba que aparezca la notificación Reparto. Abre Waze y bloquea la pantalla durante unos minutos. Al volver, revisa el último envío y los puntos pendientes.
6. **DETENER GPS DE JORNADA**, la notificación, terminar jornada y salir detienen el servicio. No hace falta dejar la pantalla encendida.

Es una versión de pruebas, no una publicación en Google Play. Debe validarse en un teléfono real; Android y los ajustes de batería pueden interrumpir el GPS. Si una actualización debug indica que la firma es distinta, no desinstales sin guardar antes lo importante: la desinstalación borra sesión y datos locales. Para distribución estable se prepara una firma de producción privada.

## Compilar desde tu PC

Android Studio compatible con SDK 36 y JDK 21; Node >=22. Instala dependencias con `npm ci`, ejecuta `npm run android:sync` y abre con `npm run android:open`. El APK usa la misma API de producción que la web. Para otra API: define VITE_API_URL con HTTPS antes de construir. No pongas credenciales de Supabase ni claves ORS en el APK.

## iPhone y uso sin instalar el APK

La misma web se puede abrir en Safari y añadir a la pantalla de inicio del iPhone como PWA. También funciona en navegadores Android. En estas plataformas se usan los adaptadores web: no se carga el puente nativo de Android ni se exige instalar el APK. Mapa, puntos numerados, entregas y enlaces de navegación siguen disponibles. No conceder GPS impide registrar la ubicación, pero no impide consultar y gestionar la ruta.

La ubicación web requiere permiso y la aplicación visible. No se ofrece seguimiento continuo en segundo plano en iPhone: al cambiar a Waze/Maps o bloquear la pantalla, iOS puede suspenderlo. Las copias locales guardan los datos de ruta; no garantizan disponer de todas las calles del mapa sin conexión. El GPS en segundo plano de esta implementación es opcional y exclusivo del APK Android.
