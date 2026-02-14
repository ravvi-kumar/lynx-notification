package io.lynx.notifications.core;

import java.util.HashMap;
import java.util.Map;

/**
 * Bridge-ready implementation for LynxNotificationsModule.
 *
 * Hook MethodCallback and EventCallback into the Lynx bridge callback signatures in your host app.
 */
public final class LynxNotificationsModule {
  private final NotificationPermissionProvider permissionProvider;
  private final PushTokenProviderRegistry pushProviders;
  private final LocalNotificationScheduler scheduler;

  private EventCallback eventCallback;
  private Map<String, Object> lastNotificationResponse;

  public LynxNotificationsModule(
      NotificationPermissionProvider permissionProvider,
      PushTokenProviderRegistry pushProviders,
      LocalNotificationScheduler scheduler
  ) {
    this.permissionProvider = permissionProvider;
    this.pushProviders = pushProviders;
    this.scheduler = scheduler;
  }

  public void getPermissions(MethodCallback callback) {
    permissionProvider.getPermissions(new NotificationPermissionProvider.PermissionsCallback() {
      @Override
      public void onSuccess(NotificationPermissions permissions) {
        callback.resolve(NativeResult.ok(permissions.toMap()));
      }

      @Override
      public void onError(NotificationError error) {
        callback.resolve(NativeResult.error(error.getCode(), error.getMessage()));
      }
    });
  }

  public void requestPermissions(MethodCallback callback) {
    permissionProvider.requestPermissions(new NotificationPermissionProvider.PermissionsCallback() {
      @Override
      public void onSuccess(NotificationPermissions permissions) {
        callback.resolve(NativeResult.ok(permissions.toMap()));
      }

      @Override
      public void onError(NotificationError error) {
        callback.resolve(NativeResult.error(error.getCode(), error.getMessage()));
      }
    });
  }

  public void getPushToken(String provider, MethodCallback callback) {
    PushTokenProvider tokenProvider = pushProviders.get(provider);
    if (tokenProvider == null) {
      callback.resolve(NativeResult.error(
          "ERR_PROVIDER_UNCONFIGURED",
          "No push provider registered for " + provider + "."
      ));
      return;
    }

    tokenProvider.getToken(new PushTokenProvider.TokenCallback() {
      @Override
      public void onSuccess(PushToken token) {
        callback.resolve(NativeResult.ok(token.toMap()));
      }

      @Override
      public void onError(NotificationError error) {
        callback.resolve(NativeResult.error(error.getCode(), error.getMessage()));
      }
    });
  }

  public void scheduleNotification(Map<String, Object> request, MethodCallback callback) {
    scheduler.schedule(request, new LocalNotificationScheduler.ScheduleCallback() {
      @Override
      public void onSuccess(String id) {
        callback.resolve(NativeResult.ok(id));
      }

      @Override
      public void onError(NotificationError error) {
        callback.resolve(NativeResult.error(error.getCode(), error.getMessage()));
      }
    });
  }

  public void cancelScheduledNotification(String id, MethodCallback callback) {
    scheduler.cancel(id, new LocalNotificationScheduler.VoidCallback() {
      @Override
      public void onSuccess() {
        callback.resolve(NativeResult.ok(null));
      }

      @Override
      public void onError(NotificationError error) {
        callback.resolve(NativeResult.error(error.getCode(), error.getMessage()));
      }
    });
  }

  public void cancelAllScheduledNotifications(MethodCallback callback) {
    scheduler.cancelAll(new LocalNotificationScheduler.VoidCallback() {
      @Override
      public void onSuccess() {
        callback.resolve(NativeResult.ok(null));
      }

      @Override
      public void onError(NotificationError error) {
        callback.resolve(NativeResult.error(error.getCode(), error.getMessage()));
      }
    });
  }

  public void getLastNotificationResponse(MethodCallback callback) {
    callback.resolve(NativeResult.ok(lastNotificationResponse));
  }

  public void startObservingEvents(EventCallback callback) {
    eventCallback = callback;
    callback.emit(NativeResult.ok(null));
  }

  public void stopObservingEvents(MethodCallback callback) {
    eventCallback = null;
    callback.resolve(NativeResult.ok(null));
  }

  public void emitNotificationReceived(Map<String, Object> notification) {
    if (eventCallback == null) {
      return;
    }

    Map<String, Object> event = new HashMap<>();
    event.put("type", "notification_received");
    event.put("notification", notification);
    eventCallback.emit(event);
  }

  public void emitNotificationResponse(Map<String, Object> response) {
    if (eventCallback == null) {
      return;
    }

    lastNotificationResponse = response;

    Map<String, Object> event = new HashMap<>();
    event.put("type", "notification_response");
    event.put("response", response);
    eventCallback.emit(event);
  }

  public void emitTokenRefreshed(PushToken token) {
    if (eventCallback == null) {
      return;
    }

    Map<String, Object> event = new HashMap<>();
    event.put("type", "token_refreshed");
    event.put("token", token.toMap());
    eventCallback.emit(event);
  }

  public interface MethodCallback {
    void resolve(Map<String, Object> payload);
  }

  public interface EventCallback {
    void emit(Map<String, Object> payload);
  }

  public static LynxNotificationsModule createDefault(PushTokenProvider fcmProvider) {
    PushTokenProviderRegistry providers = new PushTokenProviderRegistry();
    providers.register("fcm", fcmProvider);

    return new LynxNotificationsModule(
        new NoopPermissionProvider(),
        providers,
        new InMemoryLocalNotificationScheduler()
    );
  }
}
