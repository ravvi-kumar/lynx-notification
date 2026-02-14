package io.lynx.notifications.core;

import java.util.Map;

public interface LocalNotificationScheduler {
  void schedule(Map<String, Object> request, ScheduleCallback callback);

  void cancel(String id, VoidCallback callback);

  void cancelAll(VoidCallback callback);

  interface ScheduleCallback {
    void onSuccess(String id);

    void onError(NotificationError error);
  }

  interface VoidCallback {
    void onSuccess();

    void onError(NotificationError error);
  }
}
