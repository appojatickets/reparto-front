package cl.reparto.app;

import android.Manifest;
import android.os.Build;
import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONObject;
import org.json.JSONArray;

@CapacitorPlugin(name = "RepartoNative", permissions = {
    @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
    @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class RepartoNativePlugin extends Plugin {
    @PluginMethod public void configure(PluginCall call) {
        try { new NativeApi(getContext()).configure(call.getString("apiUrl", "")); call.resolve(); }
        catch (Exception failure) { call.reject("No se pudo configurar la API Android"); }
    }
    @PluginMethod public void session(PluginCall call) {
        try { JSONObject s = new NativeApi(getContext()).session(); JSObject result = new JSObject(); result.put("tokens", s == null ? JSONObject.NULL : s); call.resolve(result); }
        catch (Exception failure) { call.reject("No se pudo leer la sesión"); }
    }
    @PluginMethod public void clear(PluginCall call) {
        getBridge().execute(() -> { try { new NativeApi(getContext()).clear(); call.resolve(); } catch (Exception failure) { call.reject("No se pudo cerrar la sesión Android"); } });
    }
    @PluginMethod public void request(PluginCall call) {
        getBridge().execute(() -> {
            try {
                NativeApi api = new NativeApi(getContext());
                NativeApi.Reply reply = api.request(call.getString("method", "GET"), call.getString("path", ""), call.getString("body"), Boolean.TRUE.equals(call.getBoolean("authenticated", false)));
                JSObject result = new JSObject(); result.put("status", reply.status); result.put("body", reply.body);
                JSONObject tokens = api.session(); result.put("tokens", tokens == null ? JSONObject.NULL : tokens); call.resolve(result);
            } catch (Exception failure) { call.reject("No se pudo conectar con la API"); }
        });
    }
    @PluginMethod public void start(PluginCall call) {
        android.location.LocationManager locations = (android.location.LocationManager) getContext().getSystemService(android.content.Context.LOCATION_SERVICE);
        if (!locations.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER) && !locations.isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER)) { call.reject("Activa la ubicación del teléfono"); return; }
        if (getPermissionState("location") != PermissionState.GRANTED) { requestPermissionForAlias("location", call, "locationReady"); return; }
        locationReady(call);
    }
    @PermissionCallback private void locationReady(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) { call.reject("Permite ubicación precisa para registrar la ruta"); return; }
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) { requestPermissionForAlias("notifications", call, "notificationReady"); return; }
        notificationReady(call);
    }
    @PermissionCallback private void notificationReady(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) { call.reject("Permite la notificación del GPS durante la jornada"); return; }
        getBridge().execute(() -> {
            try {
                NativeApi api = new NativeApi(getContext());
                NativeApi.Reply reply = api.request("GET", "/v1/jornada", null, true);
                JSONObject day = reply.status == 200 ? new JSONObject(reply.body).optJSONObject("jornada") : null;
                if (day == null || !day.optString("id").equals(call.getString("jornadaId"))) { call.reject("Primero elige el camión de tu jornada actual"); return; }
                SecureStore store = new SecureStore(getContext());
                String oldTracking = store.get("tracking");
                if (oldTracking != null && !day.getString("id").equals(new JSONObject(oldTracking).optString("jornadaId"))) store.put("queue", null);
                store.put("tracking", new JSONObject().put("jornadaId", day.getString("id")).put("startedAt", System.currentTimeMillis()).toString());
                getActivity().runOnUiThread(() -> {
                    try {
                        TrackingService.startup = error -> { if (error == null) call.resolve(); else call.reject(error); };
                        ContextCompat.startForegroundService(getContext(), new Intent(getContext(), TrackingService.class));
                    }
                    catch (Exception failure) { TrackingService.startup = null; call.reject("Activa el GPS con Reparto abierto en pantalla"); }
                });
            } catch (Exception failure) { call.reject("No se pudo iniciar el GPS de la jornada"); }
        });
    }
    @PluginMethod public void stop(PluginCall call) {
        try {
            SecureStore store = new SecureStore(getContext()); store.put("tracking", null); store.put("queue", null);
            TrackingService.active = false;
            getContext().stopService(new Intent(getContext(), TrackingService.class)); call.resolve();
        } catch (Exception failure) { call.reject("No se pudo detener el GPS"); }
    }
    @PluginMethod public void status(PluginCall call) {
        try {
            SecureStore store = new SecureStore(getContext()); String raw = store.get("queue");
            JSObject result = new JSObject(); result.put("activo", TrackingService.active); result.put("pendientes", raw == null ? 0 : new JSONArray(raw).length());
            result.put("ultimoEnvio", store.get("lastUpload")); call.resolve(result);
        } catch (Exception failure) { call.reject("No se pudo consultar el GPS"); }
    }
}
