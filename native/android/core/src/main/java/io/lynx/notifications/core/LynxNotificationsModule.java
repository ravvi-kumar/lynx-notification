package io.lynx.notifications.core;

import java.util.Map;

/**
 * Bridge template for LynxNotificationsModule.
 *
 * Replace callback wiring with Lynx bridge callback types in the host app.
 */
public final class LynxNotificationsModule {
  private final PushTokenProvider pushTokenProvider;
  private final LocalNotificationScheduler scheduler;

  public LynxNotificationsModule(
      PushTokenProvider pushTokenProvider,
      LocalNotificationScheduler scheduler
  ) {
    this.pushTokenProvider = pushTokenProvider;
    this.scheduler = scheduler;
  }

  public void getPermissions(MethodCallback<NotificationPermissions> callback) {
    callback.success(new NotificationPermissions("undetermined", false, true));
  }

  public void requestPermissions(MethodCallback<NotificationPermissions> callback) {
    callback.success(new NotificationPermissions("granted", true, true));
  }

  public void getPushToken(String provider, MethodCallback<PushToken> callback) {
    if (!"fcm".equals(provider)) {
      callback.failure("ERR_PROVIDER_UNCONFIGURED", "Only fcm provider is configured in v1.");
      return;
    }

    pushTokenProvider.getToken(callback);
  }

  public void scheduleNotification(Map<String, Object> request, MethodCallback<String> callback) {
    scheduler.schedule(request, callback);
  }

  public void cancelScheduledNotification(String id, MethodCallback<Void> callback) {
    scheduler.cancel(id, callback);
  }

  public void cancelAllScheduledNotifications(MethodCallback<Void> callback) {
    scheduler.cancelAll(callback);
  }

  public void getLastNotificationResponse(MethodCallback<Map<String, Object>> callback) {
    callback.success(null);
  }

  public void startObservingEvents(EventCallback callback) {
    // Hook your native notification center and emit callback.emit(eventMap)
  }

  public void stopObservingEvents(MethodCallback<Void> callback) {
    callback.success(null);
  }

  public interface MethodCallback<T> {
    void success(T value);

    void failure(String code, String message);
  }

  public interface EventCallback {
    void emit(Map<String, Object> eventPayload);
  }

  public interface PushTokenProvider {
    void getToken(MethodCallback<PushToken> callback);
  }

  public interface LocalNotificationScheduler {
    void schedule(Map<String, Object> request, MethodCallback<String> callback);

    void cancel(String id, MethodCallback<Void> callback);

    void cancelAll(MethodCallback<Void> callback);
  }

  public static final class PushToken {
    public final String type;
    public final String data;

    public PushToken(String type, String data) {
      this.type = type;
      this.data = data;
    }
  }

  public static final class NotificationPermissions {
    public final String status;
    public final boolean granted;
    public final boolean canAskAgain;

    public NotificationPermissions(String status, boolean granted, boolean canAskAgain) {
      this.status = status;
      this.granted = granted;
      this.canAskAgain = canAskAgain;
    }
  }
}
