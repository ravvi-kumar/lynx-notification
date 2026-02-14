package io.lynx.notifications.android;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import io.lynx.notifications.core.LocalNotificationScheduler;
import io.lynx.notifications.core.NotificationError;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class AndroidAlarmLocalNotificationSchedulerInstrumentedTest {
  private AndroidAlarmLocalNotificationScheduler scheduler;

  @Before
  public void setUp() {
    Context context = ApplicationProvider.getApplicationContext();
    scheduler = new AndroidAlarmLocalNotificationScheduler(
        context,
        AndroidNotificationPublisherReceiver.class
    );
  }

  @Test
  public void scheduleTimeIntervalReturnsNotificationId() throws InterruptedException {
    Map<String, Object> content = new HashMap<>();
    content.put("title", "Instrumented");
    content.put("body", "Scheduler smoke test");

    Map<String, Object> trigger = new HashMap<>();
    trigger.put("type", "timeInterval");
    trigger.put("seconds", 5);
    trigger.put("repeats", false);

    Map<String, Object> request = new HashMap<>();
    request.put("content", content);
    request.put("trigger", trigger);

    CountDownLatch latch = new CountDownLatch(1);
    AtomicReference<String> idRef = new AtomicReference<>();
    AtomicReference<NotificationError> errorRef = new AtomicReference<>();

    scheduler.schedule(request, new LocalNotificationScheduler.ScheduleCallback() {
      @Override
      public void onSuccess(String id) {
        idRef.set(id);
        latch.countDown();
      }

      @Override
      public void onError(NotificationError error) {
        errorRef.set(error);
        latch.countDown();
      }
    });

    assertTrue(latch.await(3, TimeUnit.SECONDS));
    assertNull(errorRef.get());
    assertNotNull(idRef.get());
    assertTrue(idRef.get().startsWith("notification-"));

    CountDownLatch cancelLatch = new CountDownLatch(1);
    scheduler.cancel(idRef.get(), new LocalNotificationScheduler.VoidCallback() {
      @Override
      public void onSuccess() {
        cancelLatch.countDown();
      }

      @Override
      public void onError(NotificationError error) {
        errorRef.set(error);
        cancelLatch.countDown();
      }
    });

    assertTrue(cancelLatch.await(3, TimeUnit.SECONDS));
    assertNull(errorRef.get());
  }

  @Test
  public void schedulePastDateReturnsInvalidArgument() throws InterruptedException {
    Map<String, Object> trigger = new HashMap<>();
    trigger.put("type", "date");
    trigger.put("date", System.currentTimeMillis() - 1_000);

    Map<String, Object> request = new HashMap<>();
    request.put("trigger", trigger);

    CountDownLatch latch = new CountDownLatch(1);
    AtomicReference<NotificationError> errorRef = new AtomicReference<>();

    scheduler.schedule(request, new LocalNotificationScheduler.ScheduleCallback() {
      @Override
      public void onSuccess(String id) {
        latch.countDown();
      }

      @Override
      public void onError(NotificationError error) {
        errorRef.set(error);
        latch.countDown();
      }
    });

    assertTrue(latch.await(3, TimeUnit.SECONDS));
    assertNotNull(errorRef.get());
    assertTrue("ERR_INVALID_ARGUMENT".equals(errorRef.get().getCode()));
  }
}
