# ADR 0036 · Seguimiento diario y visitas sin confirmar

El panel de analítica muestra el resumen GPS por camión/día del backend: inicio/fin registrados, primero/último GPS, salida/regreso observados al depósito, cobertura, distancia parcial y resultados confirmados. Los huecos de señal no se cuentan como tiempo observado. La llegada sin resultado queda sin confirmar.

La comparación experimental GPS/botón deja de decir «solo el GPS dice cerrado»: ninguna visita de menos de cinco minutos ni volver posteriormente demuestra un cierre. La UI distingue visitas breves sin resultado y cierres confirmados con permanencia larga. Los resultados aprendidos proceden de los botones confirmados; la duración solo ayuda a medir y revisar.

Android solicita puntos aun estando detenido (distancia mínima cero), conservando los intervalos, permisos, cola cifrada y límite de jornada existentes. Es necesario instalar el APK nuevo sobre el anterior para recibir este ajuste nativo. La firma permanece estable y el workflow publica la nueva descarga automáticamente. La web y la PWA se actualizan por su despliegue habitual.

El resumen corresponde al último análisis (cada tres horas y después de terminar una ruta); no afirma seguimiento en tiempo real. Contrato OpenAPI sincronizado con ADR 0054 del backend; el campo nuevo es opcional para soportar despliegues desfasados.
