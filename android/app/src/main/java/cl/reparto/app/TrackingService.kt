package cl.reparto.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** Native capture, encrypted queue and upload do not depend on WebView timers. */
class TrackingService : Service(), LocationListener {
    private lateinit var store: SecureStore
    private lateinit var api: NativeApi
    private lateinit var locations: LocationManager
    private var owner: String? = null
    private val worker = Executors.newSingleThreadScheduledExecutor()
    @Volatile private var closed = false
    private var lastSample = 0L
    private var startedAt = 0L
    private val hardStop = Handler(Looper.getMainLooper())

    override fun onCreate() {
        super.onCreate()
        store = SecureStore(this)
        api = NativeApi(this)
        locations = getSystemService(LOCATION_SERVICE) as LocationManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null || intent.action == STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (active) {
            started(null)
            return START_NOT_STICKY
        }
        try {
            val tracking = store.get("tracking")
            if (tracking == null || api.session() == null) {
                started("Falta una jornada autorizada")
                stopSelf()
                return START_NOT_STICKY
            }
            owner = tracking
            startedAt = JSONObject(tracking).getLong("startedAt")
            val notifications = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            notifications.createNotificationChannel(NotificationChannel(
                "reparto-route", "Recorrido durante la jornada", NotificationManager.IMPORTANCE_LOW))
            val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val stop = PendingIntent.getService(this, 1, Intent(this, TrackingService::class.java).setAction(STOP),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val notification = NotificationCompat.Builder(this, "reparto-route")
                .setSmallIcon(R.drawable.ic_tracking).setContentTitle("Reparto · GPS de tu jornada")
                .setContentText("Recorrido activo. Pulsa detener al terminar.")
                .setContentIntent(open).setOngoing(true)
                .addAction(R.drawable.ic_tracking, "Detener GPS", stop).build()
            ServiceCompat.startForeground(this, 41, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
            active = true
            hardStop.postDelayed({ stopSelf() }, TrackingPolicy.MAX_DURATION_MS)
            if (locations.isProviderEnabled(LocationManager.GPS_PROVIDER))
                locations.requestLocationUpdates(LocationManager.GPS_PROVIDER, 15_000L, 0f, this, Looper.getMainLooper())
            if (locations.isProviderEnabled(LocationManager.NETWORK_PROVIDER))
                locations.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 30_000L, 0f, this, Looper.getMainLooper())
            worker.scheduleWithFixedDelay(::upload, 10, 60, TimeUnit.SECONDS)
            started(null)
        } catch (_: Exception) {
            started("No se pudo iniciar el GPS. Revisa ubicación y permisos.")
            stopSelf()
        }
        return START_NOT_STICKY
    }

    override fun onLocationChanged(location: Location) {
        val now = System.currentTimeMillis()
        if (TrackingPolicy.expired(startedAt, now)) { stopSelf(); return }
        if (closed || now - lastSample < 15_000 || !location.hasAccuracy() || location.accuracy > 100_000) return
        lastSample = now
        worker.execute {
            synchronized(SecureStore.LOCK) {
                try {
                    if (closed || store.get("tracking") == null) return@synchronized
                    val queue = queue()
                    val point = JSONObject().put("lat", location.latitude).put("lng", location.longitude)
                        .put("precisionM", location.accuracy).put("tomadoEn", Instant.ofEpochMilli(location.time).toString())
                    if (location.hasSpeed() && location.speed in 0f..100f) point.put("velocidadMs", location.speed)
                    queue.put(point)
                    store.put("queue", tail(queue, TrackingPolicy.MAX_QUEUE).toString())
                } catch (_: Exception) { /* Never fall back to unencrypted GPS storage. */ }
            }
        }
    }

    override fun onProviderEnabled(provider: String) = Unit
    override fun onProviderDisabled(provider: String) = Unit
    @Deprecated("Legacy provider callback")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit

    private fun queue(): JSONArray = store.get("queue")?.let(::JSONArray) ?: JSONArray()

    private fun tail(input: JSONArray, max: Int): JSONArray = JSONArray().also { result ->
        for (i in maxOf(0, input.length() - max) until input.length()) result.put(input.get(i))
    }

    private fun upload() = synchronized(NativeApi.NETWORK_LOCK) {
        try {
            val tracking = store.get("tracking")
            if (closed || tracking == null) { stopOnMain(); return@synchronized }
            val expected = JSONObject(tracking)
            if (TrackingPolicy.expired(expected.getLong("startedAt"), System.currentTimeMillis())) {
                stopOnMain(); return@synchronized
            }
            val day = api.request("GET", "/v1/jornada", null, true)
            if (day.status != 200) return@synchronized
            val current = JSONObject(day.body).optJSONObject("jornada")
            if (current == null || expected.getString("jornadaId") != current.optString("id")) {
                stopOnMain(); return@synchronized
            }
            val pending = queue()
            var valid = JSONArray()
            val now = System.currentTimeMillis()
            for (i in 0 until pending.length()) {
                val point = pending.getJSONObject(i)
                if (TrackingPolicy.current(Instant.parse(point.getString("tomadoEn")).toEpochMilli(), now)) valid.put(point)
            }
            store.put("queue", valid.toString())
            repeat(5) {
                if (valid.length() == 0 || closed) return@synchronized
                val count = minOf(30, valid.length())
                val points = JSONArray()
                for (i in 0 until count) points.put(valid.get(i))
                val reply = api.request("POST", "/v1/jornada/posiciones", JSONObject().put("puntos", points).toString(), true)
                if (closed || store.get("tracking") == null || reply.status !in 200..299) return@synchronized
                valid = tail(valid, valid.length() - count)
                store.put("queue", valid.toString())
                store.put("lastUpload", Instant.now().toString())
            }
        } catch (_: Exception) { /* Retain queue on network errors; never log positions or tokens. */ }
    }

    private fun stopOnMain() { hardStop.post { stopSelf() } }
    override fun onTaskRemoved(rootIntent: Intent?) { stopSelf() }
    override fun onDestroy() {
        closed = true
        active = false
        hardStop.removeCallbacksAndMessages(null)
        if (::locations.isInitialized) locations.removeUpdates(this)
        worker.shutdownNow()
        try {
            if (owner != null && owner == store.get("tracking")) {
                store.put("tracking", null)
                store.put("queue", null)
            }
        } catch (_: Exception) { }
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }
    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val STOP = "cl.reparto.app.STOP_TRACKING"
        @Volatile var active = false
        @Volatile var startup: ((String?) -> Unit)? = null
        private fun started(error: String?) {
            val callback = startup
            startup = null
            callback?.invoke(error)
        }
    }
}
