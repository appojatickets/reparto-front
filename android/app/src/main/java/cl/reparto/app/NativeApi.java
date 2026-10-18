package cl.reparto.app;

import android.content.Context;
import android.content.Intent;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;

/** One native session for foreground requests and background uploads; refresh is serialized. */
final class NativeApi {
    static final Object NETWORK_LOCK = new Object();
    static final class Reply {
        final int status; final String body;
        Reply(int status, String body) { this.status = status; this.body = body; }
    }
    private final Context context; private final SecureStore store;
    NativeApi(Context context) { this.context = context.getApplicationContext(); store = new SecureStore(context); }
    void configure(String url) throws Exception {
        URI uri = URI.create(url);
        if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getRawUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null) throw new IllegalArgumentException("La API Android necesita HTTPS");
        synchronized (NETWORK_LOCK) {
            String base = url.replaceAll("/+$", "");
            String old = store.get("api");
            if (old != null && !old.equals(base)) clear();
            store.put("api", base);
        }
    }
    JSONObject session() throws Exception {
        String raw = store.get("session"); return raw == null ? null : new JSONObject(raw);
    }
    void clear() throws Exception {
        synchronized (NETWORK_LOCK) {
            store.put("session", null); store.put("queue", null); store.put("tracking", null);
            context.stopService(new Intent(context, TrackingService.class));
        }
    }
    Reply request(String method, String path, String body, boolean authenticated) throws Exception {
        synchronized (NETWORK_LOCK) {
            if (!path.startsWith("/v1/") || path.contains("..") || path.startsWith("//") || path.contains("\\")) throw new IllegalArgumentException("Ruta no permitida");
            JSONObject tokens = session();
            if (path.equals("/v1/auth/refresh") && tokens != null) body = new JSONObject().put("refreshToken", tokens.getString("refreshToken")).toString();
            Reply result = raw(method, path, body, authenticated && tokens != null ? tokens.optString("accessToken") : null);
            if (result.status == 401 && authenticated && tokens != null) {
                Reply refreshed = raw("POST", "/v1/auth/refresh", new JSONObject().put("refreshToken", tokens.getString("refreshToken")).toString(), null);
                if (refreshed.status == 200) {
                    tokens = new JSONObject(refreshed.body); saveSession(tokens);
                    result = raw(method, path, body, tokens.getString("accessToken"));
                } else if (refreshed.status == 401 || refreshed.status == 403) { clear(); return refreshed; }
                else return new Reply(503, "{\"mensaje\":\"No se pudo renovar la conexión\"}");
            }
            if (result.status >= 200 && result.status < 300) {
                if (path.equals("/v1/auth/login") || path.equals("/v1/auth/refresh")) saveSession(new JSONObject(result.body));
                if (path.equals("/v1/jornada/terminar") || (path.equals("/v1/jornada") && (method.equals("DELETE") || method.equals("POST")))) {
                    store.put("tracking", null); store.put("queue", null); context.stopService(new Intent(context, TrackingService.class));
                }
            } else if (authenticated && (result.status == 401 || result.status == 403)) clear();
            return result;
        }
    }
    private void saveSession(JSONObject json) throws Exception {
        JSONObject tokens = new JSONObject().put("accessToken", json.getString("accessToken")).put("refreshToken", json.getString("refreshToken")).put("expiraEnSegundos", json.optInt("expiraEnSegundos", 3600));
        store.put("session", tokens.toString());
    }
    private Reply raw(String method, String path, String body, String token) throws Exception {
        String base = store.get("api");
        if (base == null) throw new IllegalStateException("Falta configurar la API");
        HttpURLConnection connection = (HttpURLConnection) URI.create(base + path).toURL().openConnection();
        try {
            connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(15000); connection.setReadTimeout(20000); connection.setRequestMethod(method);
            connection.setRequestProperty("Accept", "application/json");
            if (token != null) connection.setRequestProperty("Authorization", "Bearer " + token);
            if (body != null && !body.isEmpty() && !method.equals("GET") && !method.equals("HEAD")) {
                connection.setDoOutput(true); connection.setRequestProperty("Content-Type", "application/json");
                try (java.io.OutputStream output = connection.getOutputStream()) { output.write(body.getBytes(StandardCharsets.UTF_8)); }
            }
            int status = connection.getResponseCode();
            InputStream source = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            if (source == null) return new Reply(status, "");
            try (InputStream input = source; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192]; int n;
                while ((n = input.read(buffer)) != -1) { if (output.size() + n > 4_000_000) throw new IllegalStateException("Respuesta demasiado grande"); output.write(buffer, 0, n); }
                return new Reply(status, output.toString(StandardCharsets.UTF_8.name()));
            }
        } finally { connection.disconnect(); }
    }
}
