package cl.reparto.app

/** Avoid HttpURLConnection's implicit form body for empty JSON API actions. */
internal object RequestBodyPolicy {
    fun payload(method: String, body: String?): String? {
        if (method == "GET" || method == "HEAD") return null
        if (!body.isNullOrBlank()) return body
        return if (method in listOf("POST", "PUT", "PATCH")) "{}" else null
    }
}
