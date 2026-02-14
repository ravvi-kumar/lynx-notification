package io.lynx.notifications.core;

import java.util.Map;

public interface LocalNotificationScheduler {
  String schedule(Map<String, Object> request) throws NotificationError;

  void cancel(String id) throws NotificationError;

  void cancelAll();
}
