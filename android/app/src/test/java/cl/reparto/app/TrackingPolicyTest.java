package cl.reparto.app;
import org.junit.Test;
import static org.junit.Assert.*;
public class TrackingPolicyTest {
 @Test public void staleAndFuturePointsAreRejected() {
  long now = 100000000;
  assertTrue(TrackingPolicy.current(now - 60000, now));
  assertFalse(TrackingPolicy.current(now - TrackingPolicy.MAX_POINT_AGE_MS - 1, now));
  assertFalse(TrackingPolicy.current(now + 120001, now));
 }
 @Test public void shiftHasAHardStopEvenWithoutNetwork() {
  assertFalse(TrackingPolicy.expired(1000, 61000));
  assertTrue(TrackingPolicy.expired(1000, 1000 + TrackingPolicy.MAX_DURATION_MS));
  assertTrue(TrackingPolicy.expired(1000, 999));
 }
}
