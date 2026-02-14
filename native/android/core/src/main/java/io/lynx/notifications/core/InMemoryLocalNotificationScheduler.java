package io.lynx.notifications.core;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public final class InMemoryLocalNotificationScheduler implements LocalNotificationScheduler {
  private final Map<String, Map<String, Object>> scheduledRequests = new HashMap<>();

  @Override
  public void schedule(Map<String, Object> request, ScheduleCallback callback) {
    try {
      String id = validateAndSchedule(request);
      callback.onSuccess(id);
    } catch (NotificationError error) {
      callback.onError(error);
    }
  }

  @Override
  public void cancel(String id, VoidCallback callback) {
    try {
      if (id == null || id.isEmpty()) {
        throw new NotificationError("ERR_INVALID_ARGUMENT", "Scheduled notification id must not be empty.");
      }

      scheduledRequests.remove(id);
      callback.onSuccess();
    } catch (NotificationError error) {
      callback.onError(error);
    }
  }

  @Override
  public void cancelAll(VoidCallback callback) {
    scheduledRequests.clear();
    callback.onSuccess();
  }

  private String validateAndSchedule(Map<String, Object> request) throws NotificationError {
    Object triggerValue = request.get("trigger");
    if (!(triggerValue == null || triggerValue instanceof Map)) {
      throw new NotificationError(
          "ERR_INVALID_ARGUMENT",
          "Notification trigger must be null or object."
      );
    }

    if (triggerValue instanceof Map) {
      @SuppressWarnings("unchecked")
      Map<String, Object> trigger = (Map<String, Object>) triggerValue;
      Object type = trigger.get("type");
      if ("date".equals(type)) {
        Object dateValue = trigger.get("date");
        if (!(dateValue instanceof Number)) {
          throw new NotificationError("ERR_INVALID_ARGUMENT", "Date trigger requires numeric date.");
        }

        long millis = ((Number) dateValue).longValue();
        if (millis <= System.currentTimeMillis()) {
          throw new NotificationError("ERR_INVALID_ARGUMENT", "Date trigger must be in the future.");
        }
      }

      if ("timeInterval".equals(type)) {
        Object secondsValue = trigger.get("seconds");
        if (!(secondsValue instanceof Number) || ((Number) secondsValue).doubleValue() <= 0) {
          throw new NotificationError("ERR_INVALID_ARGUMENT", "Time interval trigger requires seconds > 0.");
        }
      }
    }

    String id = "notification-" + UUID.randomUUID();
    scheduledRequests.put(id, request);
    return id;
  }
}
