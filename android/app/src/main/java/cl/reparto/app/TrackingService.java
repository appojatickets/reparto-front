package cl.reparto.app;

import android.app.Service;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.IBinder;
import android.os.Looper;
import android.os.Handler;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.Instant;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/** GPS capture, encrypted queue and upload all run natively, independent from WebView timers. */
public class TrackingService extends Service implements LocationListener {
    static final String STOP = "cl.reparto.app.STOP_TRACKING";
    static volatile boolean active = false;
    static volatile java.util.function.Consumer<String> startup;
    private String owner;
    private static void started(String error) {
        java.util.function.Consumer<String> callback = startup; startup = null;
        if (callback != null) callback.accept(error);
    }
    private SecureStore store; private NativeApi api; private LocationManager locations;
    private final ScheduledExecutorService worker = Executors.newSingleThreadScheduledExecutor();
    private volatile boolean closed = false;
    private long lastSample = 0;
    private long startedAt = 0;
    private final Handler hardStop = new Handler(Looper.getMainLooper());
    @Override public void onCreate() {
        super.onCreate(); store = new SecureStore(this); api = new NativeApi(this);
        locations = (LocationManager) getSystemService(LOCATION_SERVICE);
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || STOP.equals(intent.getAction())) { stopSelf(); return START_NOT_STICKY; }
        if (active) { started(null); return START_NOT_STICKY; }
        try {
            String tracking = store.get("tracking");
            if (tracking == null || api.session() == null) { started("Falta una jornada autorizada"); stopSelf(); return START_NOT_STICKY; }
            owner = tracking;
            startedAt = new JSONObject(tracking).getLong("startedAt");
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            nm.createNotificationChannel(new NotificationChannel("reparto-route", "Recorrido durante la jornada", NotificationManager.IMPORTANCE_LOW));
            PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            PendingIntent stop = PendingIntent.getService(this, 1, new Intent(this, TrackingService.class).setAction(STOP), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            android.app.Notification notification = new NotificationCompat.Builder(this, "reparto-route").setSmallIcon(R.drawable.ic_tracking)
                .setContentTitle("Reparto · GPS de tu jornada").setContentText("Recorrido activo. Pulsa detener al terminar.")
                .setContentIntent(open).setOngoing(true).addAction(R.drawable.ic_tracking, "Detener GPS", stop).build();
            ServiceCompat.startForeground(this, 41, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            active = true;
            hardStop.postDelayed(this::stopSelf, TrackingPolicy.MAX_DURATION_MS);
            if (locations.isProviderEnabled(LocationManager.GPS_PROVIDER)) locations.requestLocationUpdates(LocationManager.GPS_PROVIDER, 15000, 20, this, Looper.getMainLooper());
            if (locations.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) locations.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 30000, 30, this, Looper.getMainLooper());
            worker.scheduleWithFixedDelay(this::upload, 10, 60, TimeUnit.SECONDS);
            started(null);
        } catch (Exception failure) { started("No se pudo iniciar el GPS. Revisa ubicación y permisos."); stopSelf(); }
        return START_NOT_STICKY;
    }
    @Override public void onLocationChanged(Location location) {
        if (TrackingPolicy.expired(startedAt, System.currentTimeMillis())) { stopSelf(); return; }
        if (closed || System.currentTimeMillis() - lastSample < 15000 || !location.hasAccuracy() || location.getAccuracy() > 100000) return;
        lastSample = System.currentTimeMillis();
        worker.execute(() -> {
            synchronized (SecureStore.LOCK) {
                try {
                    if (closed || store.get("tracking") == null) return;
                    JSONArray queue = queue();
                    JSONObject point = new JSONObject().put("lat", location.getLatitude()).put("lng", location.getLongitude()).put("precisionM", location.getAccuracy())
                        .put("tomadoEn", Instant.ofEpochMilli(location.getTime()).toString());
                    if (location.hasSpeed() && location.getSpeed() >= 0 && location.getSpeed() <= 100) point.put("velocidadMs", location.getSpeed());
                    queue.put(point); store.put("queue", tail(queue, TrackingPolicy.MAX_QUEUE).toString());
                } catch (Exception failure) { /* A storage failure must not fall back to unencrypted GPS. */ }
            }
        });
    }
    @Override public void onProviderEnabled(String provider) { }
    @Override public void onProviderDisabled(String provider) { }
    @Override public void onStatusChanged(String provider, int status, android.os.Bundle extras) { }
    private JSONArray queue() throws Exception { String raw = store.get("queue"); return raw == null ? new JSONArray() : new JSONArray(raw); }
    private JSONArray tail(JSONArray input, int max) throws Exception {
        JSONArray result = new JSONArray();
        for (int i = Math.max(0, input.length() - max); i < input.length(); i++) result.put(input.get(i));
        return result;
    }
    private void upload() {
        synchronized (NativeApi.NETWORK_LOCK) {
            try {
                String tracking = store.get("tracking");
                if (closed || tracking == null) { stopOnMain(); return; }
                JSONObject expected = new JSONObject(tracking);
                if (TrackingPolicy.expired(expected.getLong("startedAt"), System.currentTimeMillis())) { stopOnMain(); return; }
                NativeApi.Reply day = api.request("GET", "/v1/jornada", null, true);
                if (day.status != 200) return;
                JSONObject current = new JSONObject(day.body).optJSONObject("jornada");
                if (current == null || !expected.getString("jornadaId").equals(current.optString("id"))) { stopOnMain(); return; }
                JSONArray queue = queue(); JSONArray valid = new JSONArray(); long now = System.currentTimeMillis();
                for (int i = 0; i < queue.length(); i++) {
                    JSONObject p = queue.getJSONObject(i);
                    if (TrackingPolicy.current(Instant.parse(p.getString("tomadoEn")).toEpochMilli(), now)) valid.put(p);
                }
                queue = valid; store.put("queue", queue.toString());
                for (int batch = 0; batch < 5 && queue.length() > 0 && !closed; batch++) {
                    JSONArray points = new JSONArray(); int count = Math.min(30, queue.length());
                    for (int i = 0; i < count; i++) points.put(queue.get(i));
                    NativeApi.Reply reply = api.request("POST", "/v1/jornada/posiciones", new JSONObject().put("puntos", points).toString(), true);
                    if (closed || store.get("tracking") == null || reply.status < 200 || reply.status >= 300) return;
                    queue = tail(queue, queue.length() - count); store.put("queue", queue.toString());
                    store.put("lastUpload", Instant.now().toString());
                }
            } catch (Exception failure) { /* Retain queue on network errors; retry next minute. Never log positions/tokens. */ }
        }
    }
    private void stopOnMain() { new Handler(Looper.getMainLooper()).post(this::stopSelf); }
    @Override public void onTaskRemoved(Intent rootIntent) { stopSelf(); }
    @Override public void onDestroy() {
        closed = true; active = false; hardStop.removeCallbacksAndMessages(null);
        if (locations != null) locations.removeUpdates(this);
        worker.shutdownNow();
        try { if (owner != null && owner.equals(store.get("tracking"))) { store.put("tracking", null); store.put("queue", null); } } catch (Exception ignored) { }
        stopForeground(STOP_FOREGROUND_REMOVE); super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
}
