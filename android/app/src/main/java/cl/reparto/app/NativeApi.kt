package cl.reparto.app

import android.content.Context
import android.content.Intent
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URI

/** Foreground and background requests share one serialized, encrypted session. */
internal class NativeApi(context: Context) {
    private val context = context.applicationContext
    private val store = SecureStore(context)
    data class Reply(val status: Int, val body: String)

    fun configure(url: String) {
        val uri = URI.create(url)
        require(uri.scheme == "https" && uri.host != null && uri.rawUserInfo == null &&
            uri.query == null && uri.fragment == null) { "La API Android necesita HTTPS" }
        synchronized(NETWORK_LOCK) {
            val base = url.trimEnd('/')
            val old = store.get("api")
            if (old != null && old != base) clear()
            store.put("api", base)
        }
    }

    fun session(): JSONObject? = store.get("session")?.let(::JSONObject)

    fun clear() = synchronized(NETWORK_LOCK) {
        store.put("session", null)
        store.put("queue", null)
        store.put("tracking", null)
        context.stopService(Intent(context, TrackingService::class.java))
        Unit
    }

    fun request(method: String, path: String, body: String?, authenticated: Boolean): Reply = synchronized(NETWORK_LOCK) {
        require(path.startsWith("/v1/") && !path.contains("..") && !path.contains('\\')) { "Ruta no permitida" }
        var tokens = session()
        val requestBody = if (path == "/v1/auth/refresh" && tokens != null)
            JSONObject().put("refreshToken", tokens.getString("refreshToken")).toString() else body
        var result = raw(method, path, requestBody, if (authenticated) tokens?.optString("accessToken") else null)
        if (result.status == 401 && authenticated && tokens != null) {
            val refreshed = raw("POST", "/v1/auth/refresh",
                JSONObject().put("refreshToken", tokens.getString("refreshToken")).toString(), null)
            if (refreshed.status == 200) {
                tokens = JSONObject(refreshed.body)
                saveSession(tokens)
                result = raw(method, path, requestBody, tokens.getString("accessToken"))
            } else if (refreshed.status == 401 || refreshed.status == 403) {
                clear()
                return@synchronized refreshed
            } else return@synchronized Reply(503, "{\"mensaje\":\"No se pudo renovar la conexión\"}")
        }
        if (result.status in 200..299) {
            if (path == "/v1/auth/login" || path == "/v1/auth/refresh") saveSession(JSONObject(result.body))
            if (path == "/v1/jornada/terminar" || (path == "/v1/jornada" && method in listOf("DELETE", "POST"))) {
                store.put("tracking", null)
                store.put("queue", null)
                context.stopService(Intent(context, TrackingService::class.java))
            }
        } else if (authenticated && result.status in listOf(401, 403)) clear()
        result
    }

    private fun saveSession(json: JSONObject) {
        store.put("session", JSONObject().put("accessToken", json.getString("accessToken"))
            .put("refreshToken", json.getString("refreshToken"))
            .put("expiraEnSegundos", json.optInt("expiraEnSegundos", 3600)).toString())
    }

    private fun raw(method: String, path: String, body: String?, token: String?): Reply {
        val base = checkNotNull(store.get("api")) { "Falta configurar la API" }
        val payload = RequestBodyPolicy.payload(method, body)
        val connection = URI.create(base + path).toURL().openConnection() as HttpURLConnection
        try {
            connection.instanceFollowRedirects = false
            connection.connectTimeout = 15_000
            connection.readTimeout = 20_000
            connection.requestMethod = method
            connection.setRequestProperty("Accept", "application/json")
            if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
            if (payload != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(payload.toByteArray(Charsets.UTF_8)) }
            }
            val status = connection.responseCode
            val source = (if (status >= 400) connection.errorStream else connection.inputStream) ?: return Reply(status, "")
            source.use { input ->
                ByteArrayOutputStream().use { output ->
                    val buffer = ByteArray(8192)
                    while (true) {
                        val size = input.read(buffer)
                        if (size == -1) break
                        check(output.size() + size <= 4_000_000) { "Respuesta demasiado grande" }
                        output.write(buffer, 0, size)
                    }
                    return Reply(status, output.toString(Charsets.UTF_8.name()))
                }
            }
        } finally { connection.disconnect() }
    }

    companion object { val NETWORK_LOCK = Any() }
}
