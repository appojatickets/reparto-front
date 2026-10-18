# ADR 0037 · Cerrar ruta sin error de formato y tiempos de atención reales

Las peticiones API nativas sin cuerpo POST/PUT/PATCH se convierten a JSON {}. El puente JS y RequestBodyPolicy Kotlin evitan el formato form implícito de HttpURLConnection. Se preservan los cuerpos existentes y los GET/HEAD sin cuerpo. La API incorpora compatibilidad acotada para acciones vacías de APK anteriores (ADR 0055 backend).

El motor usa permanencias GPS ligadas a entregas confirmadas: tiempo local respaldado, camión y general con mínimos de muestras y valores acotados. La analítica identifica el promedio GPS cuando está disponible. No se fuerza una hora fija de término. El análisis ahora se actualiza cada hora y al terminar una ruta; las ETAs se recalculan al refrescar.

La actualización nativa requiere instalar el APK nuevo sobre el anterior con su firma permanente. No se desinstala ni se cambia el identificador de la app.
