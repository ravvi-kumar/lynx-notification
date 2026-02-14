package io.lynx.notifications.core;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;

public class LynxNotificationsModuleTest {
  @Test
  public void returnsPushTokenFromProvider() {
    PushTokenProviderRegistry registry = new PushTokenProviderRegistry();
    registry.register("fcm", callback -> callback.onSuccess(new PushToken("fcm", "token-123")));

    LynxNotificationsModule module = new LynxNotificationsModule(
        new NoopPermissionProvider(),
        registry,
        new InMemoryLocalNotificationScheduler()
    );

    AtomicReference<Map<String, Object>> payload = new AtomicReference<>();
    module.getPushToken("fcm", payload::set);

    assertNotNull(payload.get());
    assertTrue((Boolean) payload.get().get("ok"));

    @SuppressWarnings("unchecked")
    Map<String, Object> data = (Map<String, Object>) payload.get().get("data");
    assertEquals("fcm", data.get("type"));
    assertEquals("token-123", data.get("data"));
  }

  @Test
  public void returnsProviderUnconfiguredErrorWhenProviderMissing() {
    LynxNotificationsModule module = new LynxNotificationsModule(
        new NoopPermissionProvider(),
        new PushTokenProviderRegistry(),
        new InMemoryLocalNotificationScheduler()
    );

    AtomicReference<Map<String, Object>> payload = new AtomicReference<>();
    module.getPushToken("fcm", payload::set);

    assertNotNull(payload.get());
    assertFalse((Boolean) payload.get().get("ok"));

    @SuppressWarnings("unchecked")
    Map<String, Object> error = (Map<String, Object>) payload.get().get("error");
    assertEquals("ERR_PROVIDER_UNCONFIGURED", error.get("code"));
  }

  @Test
  public void validatesPastDateScheduleRequest() {
    PushTokenProviderRegistry registry = new PushTokenProviderRegistry();
    registry.register("fcm", callback -> callback.onSuccess(new PushToken("fcm", "token-123")));

    LynxNotificationsModule module = new LynxNotificationsModule(
        new NoopPermissionProvider(),
        registry,
        new InMemoryLocalNotificationScheduler()
    );

    Map<String, Object> trigger = new HashMap<>();
    trigger.put("type", "date");
    trigger.put("date", System.currentTimeMillis() - 10_000);

    Map<String, Object> request = new HashMap<>();
    request.put("trigger", trigger);

    AtomicReference<Map<String, Object>> payload = new AtomicReference<>();
    module.scheduleNotification(request, payload::set);

    assertNotNull(payload.get());
    assertFalse((Boolean) payload.get().get("ok"));

    @SuppressWarnings("unchecked")
    Map<String, Object> error = (Map<String, Object>) payload.get().get("error");
    assertEquals("ERR_INVALID_ARGUMENT", error.get("code"));
  }

  @Test
  public void mapsRuntimePermissionDeniedState() {
    NotificationPermissionProvider permissionProvider = new RuntimeNotificationPermissionProvider(
        new RuntimeNotificationPermissionProvider.PermissionStateReader() {
          @Override
          public boolean isGranted() {
            return false;
          }

          @Override
          public boolean canAskAgain() {
            return false;
          }
        },
        callback -> callback.onResult(false)
    );

    LynxNotificationsModule module = new LynxNotificationsModule(
        permissionProvider,
        new PushTokenProviderRegistry(),
        new InMemoryLocalNotificationScheduler()
    );

    AtomicReference<Map<String, Object>> payload = new AtomicReference<>();
    module.requestPermissions(payload::set);

    assertNotNull(payload.get());
    assertTrue((Boolean) payload.get().get("ok"));

    @SuppressWarnings("unchecked")
    Map<String, Object> data = (Map<String, Object>) payload.get().get("data");
    assertEquals("denied", data.get("status"));
    assertEquals(false, data.get("granted"));
    assertEquals(false, data.get("canAskAgain"));
  }

  @Test
  public void mapsRuntimePermissionRequestFailureToNativeFailure() {
    NotificationPermissionProvider permissionProvider = new RuntimeNotificationPermissionProvider(
        new RuntimeNotificationPermissionProvider.PermissionStateReader() {
          @Override
          public boolean isGranted() {
            return false;
          }

          @Override
          public boolean canAskAgain() {
            return true;
          }
        },
        callback -> callback.onFailure(new IllegalStateException("boom"))
    );

    LynxNotificationsModule module = new LynxNotificationsModule(
        permissionProvider,
        new PushTokenProviderRegistry(),
        new InMemoryLocalNotificationScheduler()
    );

    AtomicReference<Map<String, Object>> payload = new AtomicReference<>();
    module.requestPermissions(payload::set);

    assertNotNull(payload.get());
    assertFalse((Boolean) payload.get().get("ok"));

    @SuppressWarnings("unchecked")
    Map<String, Object> error = (Map<String, Object>) payload.get().get("error");
    assertEquals("ERR_NATIVE_FAILURE", error.get("code"));
    assertEquals("boom", error.get("message"));
  }
}
