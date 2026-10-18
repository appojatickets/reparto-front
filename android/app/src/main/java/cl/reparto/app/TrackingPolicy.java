package cl.reparto.app;
final class TrackingPolicy {
    static final long MAX_DURATION_MS = 14 * 60 * 60 * 1000L;
    static final long MAX_POINT_AGE_MS = 6 * 60 * 60 * 1000L;
    static final int MAX_QUEUE = 600;
    static boolean current(long timestamp, long now) { return timestamp <= now + 120000 && now - timestamp <= MAX_POINT_AGE_MS; }
    static boolean expired(long start, long now) { return now < start || now - start >= MAX_DURATION_MS; }
}
