package cl.reparto.app

internal object TrackingPolicy {
    const val MAX_DURATION_MS = 14 * 60 * 60 * 1000L
    const val MAX_POINT_AGE_MS = 6 * 60 * 60 * 1000L
    const val MAX_QUEUE = 600

    fun current(timestamp: Long, now: Long): Boolean =
        timestamp <= now + 120_000 && now - timestamp <= MAX_POINT_AGE_MS

    fun expired(start: Long, now: Long): Boolean =
        now < start || now - start >= MAX_DURATION_MS
}
