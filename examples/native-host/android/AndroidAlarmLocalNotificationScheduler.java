package io.lynx.notifications.example;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import io.lynx.notifications.core.LocalNotificationScheduler;
import io.lynx.notifications.core.NotificationError;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONObject;

/**
 * Local notification scheduler backed by AlarmManager.
 *
 * Pair this scheduler with AndroidNotificationPublisherReceiver.
 */
public final class AndroidAlarmLocalNotificationScheduler implements LocalNotificationScheduler {
  public static final String ACTION_PUBLISH_NOTIFICATION =
      "io.lynx.notifications.ACTION_PUBLISH_NOTIFICATION";
  public static final String EXTRA_NOTIFICATION_ID = "lynx_notification_id";
  public static final String EXTRA_TITLE = "lynx_notification_title";
  public static final String EXTRA_SUBTITLE = "lynx_notification_subtitle";
  public static final String EXTRA_BODY = "lynx_notification_body";
  public static final String EXTRA_DATA_JSON = "lynx_notification_data_json";
  public static final String EXTRA_BADGE = "lynx_notification_badge";
  public static final String EXTRA_USE_DEFAULT_SOUND = "lynx_notification_use_default_sound";
  public static final String EXTRA_CHANNEL_ID = "lynx_notification_channel_id";
  public static final String DEFAULT_CHANNEL_ID = "lynx_notifications_default";

  private final Context appContext;
  private final Class<? extends BroadcastReceiver> receiverClass;
  private final String channelId;
  private final Map<String, PendingIntent> pendingIntents = new ConcurrentHashMap<>();

  public AndroidAlarmLocalNotificationScheduler(
      Context appContext,
      Class<? extends BroadcastReceiver> receiverClass
  ) {
    this(appContext, receiverClass, DEFAULT_CHANNEL_ID);
  }

  public AndroidAlarmLocalNotificationScheduler(
      Context appContext,
      Class<? extends BroadcastReceiver> receiverClass,
      String channelId
  ) {
    this.appContext = appContext.getApplicationContext();
    this.receiverClass = receiverClass;
    this.channelId = channelId;
  }

  @Override
  public void schedule(Map<String, Object> request, ScheduleCallback callback) {
    try {
      ScheduledTrigger trigger = resolveTrigger(request);
      String id = "notification-" + UUID.randomUUID();
      PendingIntent pendingIntent = buildPendingIntent(id, request);
      AlarmManager alarmManager = getAlarmManager();

      if (trigger.repeats) {
        alarmManager.setRepeating(
            AlarmManager.RTC_WAKEUP,
            trigger.triggerAtMillis,
            trigger.intervalMillis,
            pendingIntent
        );
      } else {
        scheduleExact(alarmManager, trigger.triggerAtMillis, pendingIntent);
      }

      pendingIntents.put(id, pendingIntent);
      callback.onSuccess(id);
    } catch (NotificationError error) {
      callback.onError(error);
    } catch (Throwable throwable) {
      callback.onError(NotificationError.fromThrowable(throwable));
    }
  }

  @Override
  public void cancel(String id, VoidCallback callback) {
    try {
      if (id == null || id.isEmpty()) {
        throw new NotificationError("ERR_INVALID_ARGUMENT", "Scheduled notification id must not be empty.");
      }

      AlarmManager alarmManager = getAlarmManager();
      PendingIntent pendingIntent = pendingIntents.remove(id);
      if (pendingIntent == null) {
        pendingIntent = findExistingPendingIntent(id);
      }

      if (pendingIntent != null) {
        alarmManager.cancel(pendingIntent);
        pendingIntent.cancel();
      }

      callback.onSuccess();
    } catch (NotificationError error) {
      callback.onError(error);
    } catch (Throwable throwable) {
      callback.onError(NotificationError.fromThrowable(throwable));
    }
  }

  @Override
  public void cancelAll(VoidCallback callback) {
    try {
      AlarmManager alarmManager = getAlarmManager();
      for (PendingIntent pendingIntent : pendingIntents.values()) {
        alarmManager.cancel(pendingIntent);
        pendingIntent.cancel();
      }
      pendingIntents.clear();
      callback.onSuccess();
    } catch (Throwable throwable) {
      callback.onError(NotificationError.fromThrowable(throwable));
    }
  }

  private AlarmManager getAlarmManager() throws NotificationError {
    AlarmManager alarmManager = (AlarmManager) appContext.getSystemService(Context.ALARM_SERVICE);
    if (alarmManager == null) {
      throw new NotificationError("ERR_NATIVE_FAILURE", "AlarmManager service is unavailable.");
    }
    return alarmManager;
  }

  private void scheduleExact(AlarmManager alarmManager, long triggerAtMillis, PendingIntent pendingIntent) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
      } else {
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
      }
      return;
    }

    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
  }

  private ScheduledTrigger resolveTrigger(Map<String, Object> request) throws NotificationError {
    Object triggerValue = request.get("trigger");
    if (triggerValue == null) {
      return new ScheduledTrigger(System.currentTimeMillis() + 1000, false, 0);
    }

    if (!(triggerValue instanceof Map)) {
      throw new NotificationError("ERR_INVALID_ARGUMENT", "Notification trigger must be null or object.");
    }

    @SuppressWarnings("unchecked")
    Map<String, Object> trigger = (Map<String, Object>) triggerValue;
    Object type = trigger.get("type");

    if ("date".equals(type)) {
      Object dateValue = trigger.get("date");
      if (!(dateValue instanceof Number)) {
        throw new NotificationError("ERR_INVALID_ARGUMENT", "Date trigger requires numeric date.");
      }

      Object repeatsValue = trigger.get("repeats");
      if (Boolean.TRUE.equals(repeatsValue)) {
        throw new NotificationError("ERR_INVALID_ARGUMENT", "Date trigger does not support repeats=true.");
      }

      long triggerAtMillis = ((Number) dateValue).longValue();
      if (triggerAtMillis <= System.currentTimeMillis()) {
        throw new NotificationError("ERR_INVALID_ARGUMENT", "Date trigger must be in the future.");
      }

      return new ScheduledTrigger(triggerAtMillis, false, 0);
    }

    if ("timeInterval".equals(type)) {
      Object secondsValue = trigger.get("seconds");
      if (!(secondsValue instanceof Number) || ((Number) secondsValue).doubleValue() <= 0) {
        throw new NotificationError("ERR_INVALID_ARGUMENT", "Time interval trigger requires seconds > 0.");
      }

      boolean repeats = Boolean.TRUE.equals(trigger.get("repeats"));
      long intervalMillis = Math.round(((Number) secondsValue).doubleValue() * 1000d);
      return new ScheduledTrigger(System.currentTimeMillis() + intervalMillis, repeats, intervalMillis);
    }

    throw new NotificationError("ERR_INVALID_ARGUMENT", "Unknown notification trigger type.");
  }

  private PendingIntent buildPendingIntent(String id, Map<String, Object> request) throws NotificationError {
    Intent intent = new Intent(appContext, receiverClass);
    intent.setAction(ACTION_PUBLISH_NOTIFICATION);
    intent.putExtra(EXTRA_NOTIFICATION_ID, id);
    intent.putExtra(EXTRA_CHANNEL_ID, channelId);

    @SuppressWarnings("unchecked")
    Map<String, Object> content = request.get("content") instanceof Map
        ? (Map<String, Object>) request.get("content")
        : null;
    if (content != null) {
      putStringExtra(intent, EXTRA_TITLE, content.get("title"));
      putStringExtra(intent, EXTRA_SUBTITLE, content.get("subtitle"));
      putStringExtra(intent, EXTRA_BODY, content.get("body"));

      Object badgeValue = content.get("badge");
      if (badgeValue instanceof Number) {
        intent.putExtra(EXTRA_BADGE, ((Number) badgeValue).intValue());
      }

      Object soundValue = content.get("sound");
      if ("default".equals(soundValue)) {
        intent.putExtra(EXTRA_USE_DEFAULT_SOUND, true);
      }

      Object dataValue = content.get("data");
      if (dataValue instanceof Map) {
        try {
          @SuppressWarnings("unchecked")
          Map<String, Object> data = (Map<String, Object>) dataValue;
          intent.putExtra(EXTRA_DATA_JSON, new JSONObject(data).toString());
        } catch (Throwable throwable) {
          throw new NotificationError(
              "ERR_INVALID_ARGUMENT",
              "Notification content.data must be JSON-serializable."
          );
        }
      }
    }

    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      flags |= PendingIntent.FLAG_IMMUTABLE;
    }

    return PendingIntent.getBroadcast(
        appContext,
        requestCodeForId(id),
        intent,
        flags
    );
  }

  private PendingIntent findExistingPendingIntent(String id) {
    Intent intent = new Intent(appContext, receiverClass);
    intent.setAction(ACTION_PUBLISH_NOTIFICATION);
    intent.putExtra(EXTRA_NOTIFICATION_ID, id);

    int flags = PendingIntent.FLAG_NO_CREATE;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      flags |= PendingIntent.FLAG_IMMUTABLE;
    }

    return PendingIntent.getBroadcast(
        appContext,
        requestCodeForId(id),
        intent,
        flags
    );
  }

  private void putStringExtra(Intent intent, String key, Object value) {
    if (value instanceof String) {
      intent.putExtra(key, (String) value);
    }
  }

  private int requestCodeForId(String id) {
    return id.hashCode();
  }

  private static final class ScheduledTrigger {
    private final long triggerAtMillis;
    private final boolean repeats;
    private final long intervalMillis;

    private ScheduledTrigger(long triggerAtMillis, boolean repeats, long intervalMillis) {
      this.triggerAtMillis = triggerAtMillis;
      this.repeats = repeats;
      this.intervalMillis = intervalMillis;
    }
  }
}
