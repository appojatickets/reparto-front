# ADR 0035 · Kotlin y descarga Android desde Reparto

## Decisión

La capa propia de Android (actividad, plugin, sesión, almacenamiento, política y servicio GPS) se migra a Kotlin 2.3.0, compatible con AGP 8.13 y Gradle 8.14.3. La interfaz continúa siendo React dentro de Capacitor y la PWA conserva sus adaptadores web. No se reescribe toda la interfaz en Kotlin.

La web ofrece `/android`, accesible sin sesión, desde el ingreso y el pie de la aplicación. Consulta la última publicación pública de este repositorio, sin credenciales ni caché persistente. Solo habilita la descarga si existe una release estable `android-vN` con `reparto.apk` subido en el repositorio oficial. Ante ausencia o error, mantiene disponible la PWA y explica que la descarga está pendiente. Nunca promociona un artefacto debug como distribución estable.

## Firma y publicación

Una clave privada permanente del dueño se guarda únicamente como secreto Actions `ANDROID_SIGNING_BUNDLE` (JSON con keystore PKCS12 en base64, password y alias reparto). El script PowerShell permite generarla en Windows con Android Studio/JDK, conservarla fuera del repo y copiar el secreto al portapapeles sin imprimirlo. No se crea una nueva firma por compilación.

CI valida Kotlin y el APK debug, compila release y, cuando hay firma, recompila release firmado, verifica con apksigner, calcula SHA256 y publica APK+checksum en una release inmutable por número de ejecución. Solo el job publicador tiene permiso de escritura en contents; no recibe la clave. El archivo de firma temporal se elimina siempre del runner. Si falta el secreto se construye y prueba la app, pero no se publica una descarga estable.

El debug nuevo usa applicationId `.piloto` para separarlo de la app de distribución. Las builds de piloto anteriores a esta decisión usaban el identificador de producción: migrar de ellas requiere gestionar el conflicto de firma sin borrar datos por sorpresa.

## Límites

Firmar permite conservar identidad entre versiones; no elimina la confirmación para instalar desde el navegador ni garantiza que Play Protect deje de advertir. No se desactivan protecciones. No hay actualización silenciosa u OTA de código; el usuario instala la versión nueva desde la web conservando aplicación/datos si la firma y el identificador coinciden. Distribución gratuita fuera de Play; no se contratan cuentas ni servicios pagos.
