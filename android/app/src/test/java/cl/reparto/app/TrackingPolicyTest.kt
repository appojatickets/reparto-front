package cl.reparto.app

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TrackingPolicyTest {
    @Test fun staleAndFuturePointsAreRejected() {
        val now = 100_000_000L
        assertTrue(TrackingPolicy.current(now - 60_000, now))
        assertFalse(TrackingPolicy.current(now - TrackingPolicy.MAX_POINT_AGE_MS - 1, now))
        assertFalse(TrackingPolicy.current(now + 120_001, now))
    }

    @Test fun shiftHasAHardStopEvenWithoutNetwork() {
        assertFalse(TrackingPolicy.expired(1000, 61_000))
        assertTrue(TrackingPolicy.expired(1000, 1000 + TrackingPolicy.MAX_DURATION_MS))
        assertTrue(TrackingPolicy.expired(1000, 999))
    }
}
