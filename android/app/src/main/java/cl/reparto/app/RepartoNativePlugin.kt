package cl.reparto.app

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.pm.PackageInfoCompat
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import org.json.JSONArray
import org.json.JSONObject

@CapacitorPlugin(name = "RepartoNative", permissions = [
    Permission(alias = "location", strings = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION]),
    Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])
])
class RepartoNativePlugin : Plugin() {
    @PluginMethod
    fun appInfo(call: PluginCall) = respond(call, "No se pudo consultar la versión instalada") {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        val result = JSObject()
        result.put("codigo", PackageInfoCompat.getLongVersionCode(info))
        result.put("paquete", context.packageName)
        call.resolve(result)
    }

    @PluginMethod
    fun requestNotifications(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") == PermissionState.PROMPT) {
            requestPermissionForAlias("notifications", call, "notificationsChecked")
        } else if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") == PermissionState.PROMPT_WITH_RATIONALE) {
            requestPermissionForAlias("notifications", call, "notificationsChecked")
        } else call.resolve()
    }

    @PermissionCallback
    private fun notificationsChecked(call: PluginCall) { call.resolve() }

    @PluginMethod
    fun configure(call: PluginCall) = respond(call, "No se pudo configurar la API Android") {
        NativeApi(context).configure(call.getString("apiUrl") ?: "")
        call.resolve()
    }

    @PluginMethod
    fun session(call: PluginCall) = respond(call, "No se pudo leer la sesión") {
        val result = JSObject()
        result.put("tokens", NativeApi(context).session() ?: JSONObject.NULL)
        call.resolve(result)
    }

    @PluginMethod
    fun clear(call: PluginCall) {
        bridge.execute {
            respond(call, "No se pudo cerrar la sesión Android") {
                NativeApi(context).clear()
                call.resolve()
            }
        }
    }

    @PluginMethod
    fun request(call: PluginCall) {
        bridge.execute {
            respond(call, "No se pudo conectar con la API") {
                val api = NativeApi(context)
                val reply = api.request(call.getString("method") ?: "GET", call.getString("path") ?: "",
                    call.getString("body"), call.getBoolean("authenticated", false) == true)
                val result = JSObject()
                result.put("status", reply.status)
                result.put("body", reply.body)
                result.put("tokens", api.session() ?: JSONObject.NULL)
                call.resolve(result)
            }
        }
    }

    @PluginMethod
    fun start(call: PluginCall) = respond(call, "No se pudo consultar el GPS del teléfono") {
        val locations = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        if (!locations.isProviderEnabled(LocationManager.GPS_PROVIDER) && !locations.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
            call.reject("Activa la ubicación del teléfono")
        } else if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "locationReady")
        } else locationReady(call)
    }

    @PermissionCallback
    private fun locationReady(call: PluginCall) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Permite ubicación precisa para registrar la ruta")
        } else if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationReady")
        } else notificationReady(call)
    }

    @PermissionCallback
    private fun notificationReady(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            call.reject("Permite la notificación del GPS durante la jornada")
            return
        }
        bridge.execute {
            respond(call, "No se pudo iniciar el GPS de la jornada") {
                val reply = NativeApi(context).request("GET", "/v1/jornada", null, true)
                val day = if (reply.status == 200) JSONObject(reply.body).optJSONObject("jornada") else null
                if (day == null || day.optString("id") != call.getString("jornadaId")) {
                    call.reject("Primero elige el camión de tu jornada actual")
                    return@respond
                }
                val store = SecureStore(context)
                val oldTracking = store.get("tracking")
                if (oldTracking != null && day.getString("id") != JSONObject(oldTracking).optString("jornadaId")) store.put("queue", null)
                store.put("tracking", JSONObject().put("jornadaId", day.getString("id"))
                    .put("startedAt", System.currentTimeMillis()).toString())
                activity.runOnUiThread {
                    respond(call, "Activa el GPS con Reparto abierto en pantalla") {
                        TrackingService.startup = { error -> if (error == null) call.resolve() else call.reject(error) }
                        try {
                            ContextCompat.startForegroundService(context, Intent(context, TrackingService::class.java))
                        } catch (failure: Exception) {
                            TrackingService.startup = null
                            throw failure
                        }
                    }
                }
            }
        }
    }

    @PluginMethod
    fun stop(call: PluginCall) = respond(call, "No se pudo detener el GPS") {
        val store = SecureStore(context)
        store.put("tracking", null)
        store.put("queue", null)
        TrackingService.active = false
        context.stopService(Intent(context, TrackingService::class.java))
        call.resolve()
    }

    @PluginMethod
    fun status(call: PluginCall) = respond(call, "No se pudo consultar el GPS") {
        val store = SecureStore(context)
        val result = JSObject()
        val locations = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        result.put("ubicacionActiva", locations.isProviderEnabled(LocationManager.GPS_PROVIDER) || locations.isProviderEnabled(LocationManager.NETWORK_PROVIDER))
        result.put("permisoUbicacion", ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED)
        result.put("permisoNotificaciones", NotificationManagerCompat.from(context).areNotificationsEnabled())
        result.put("activo", TrackingService.active)
        result.put("pendientes", store.get("queue")?.let { JSONArray(it).length() } ?: 0)
        result.put("ultimoEnvio", store.get("lastUpload"))
        call.resolve(result)
    }

    private inline fun respond(call: PluginCall, message: String, action: () -> Unit) {
        try { action() } catch (_: Exception) { call.reject(message) }
    }
}
