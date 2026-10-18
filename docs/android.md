# Reparto Android y PWA

## Para el chofer

Abre https://reparto-front.vercel.app y toca **DESCARGAR APP ANDROID** (en el ingreso o al final de la aplicación). También puedes ir a https://reparto-front.vercel.app/android.

Cuando la descarga de distribución esté publicada:

1. Descarga **reparto.apk** directamente desde el botón de Reparto. No necesitas cuenta GitHub ni descomprimir un ZIP.
2. Abre el archivo y confirma la instalación. Android puede pedir permitir instalaciones desde el navegador que utilizaste.
3. Abre Reparto, inicia sesión y selecciona tu camión.
4. Para GPS en segundo plano, pulsa **ACTIVAR GPS DE JORNADA** y permite ubicación precisa y notificaciones.
5. Comprueba la notificación Reparto. Abre Waze y bloquea la pantalla unos minutos; vuelve y revisa el último envío y los puntos pendientes.

Requiere Android 8 o posterior. El GPS es opcional: no conceder permiso impide registrar coordenadas, pero no bloquea las entregas. **DETENER GPS DE JORNADA**, la notificación, terminar jornada y salir detienen el servicio. Los ajustes de batería pueden interrumpirlo: debe validarse en un teléfono real.

Para actualizar vuelve a la página de descarga e instala la nueva versión encima de la anterior, sin desinstalar. Las actualizaciones requieren la misma firma y applicationId. Si ya tenías el APK piloto antiguo y aparece un conflicto de firma, no desinstales sin conservar lo importante: desinstalar borra sesión y datos locales. El piloto nuevo usa un identificador separado `.piloto`.

## Activar la firma permanente (solo el dueño, una vez)

La descarga estable no se habilita hasta que exista un APK firmado con una clave permanente. El APK debug de Actions sirve para pruebas y no se publica como versión estable.

1. En tu PC Windows, con este repo y Android Studio/JDK instalados, ejecuta `npm run android:firma`. El script `scripts/preparar-firma-android.ps1` genera la firma en la carpeta privada `Reparto-firma-privada` de tu usuario y copia el paquete de firma al portapapeles. Si ya existe reutiliza esa firma.
2. Se abre la página de secretos de Actions. En **Name** escribe `ANDROID_SIGNING_BUNDLE`, pega el portapapeles en **Secret** y guarda. Nunca pegues ese contenido en un chat, issue o archivo del repositorio.
3. En Actions → **Android APK de pruebas** → **Run workflow**, selecciona **main** y ejecútalo. Al terminar se publica automáticamente la versión firmada y se habilita el botón de la web. También ocurrirá con los siguientes pushes de código Android/web.

Conserva una copia privada y segura de la carpeta de firma. No regeneres la clave para actualizar. El secreto solo se descifra en el runner temporal; las releases contienen únicamente el APK y su checksum público. La configuración actual del conector no permite crear secretos de Actions, por eso este paso lo hace el dueño en su panel.

Firmar no elimina los avisos por instalar fuera de Google Play ni la confirmación del usuario. No es una publicación en Google Play y no se contrata ningún servicio pago.

## iPhone y uso sin APK

Abre la misma web en Safari y elige Compartir → Añadir a pantalla de inicio para instalar la PWA. También funciona en navegadores Android. Mapa, puntos numerados, entregas y enlaces de navegación siguen disponibles sin cargar el puente nativo Android.

La ubicación web requiere permiso y la aplicación visible. Al cambiar a Waze/Maps o bloquear la pantalla, iOS puede suspenderla; no se promete GPS continuo en segundo plano. Las copias locales guardan datos de ruta, sin garantizar todas las calles sin conexión.

## Desarrollo

La capa Android propia está en Kotlin; la interfaz compartida permanece en React/TypeScript con Capacitor. Android Studio compatible con SDK 36 y JDK 21; Node >=22. Ejecuta `npm ci`, `npm run android:sync` y `npm run android:open`. Para compilar el piloto: `npm run android:apk`.

El APK usa por defecto la API de producción. Para otra API define VITE_API_URL con HTTPS antes de construir. No incluyas credenciales de Supabase ni claves ORS en el APK.
