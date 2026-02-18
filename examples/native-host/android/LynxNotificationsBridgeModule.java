package io.lynx.notifications.example;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyArray;
import com.lynx.react.bridge.JavaOnlyMap;
import com.lynx.react.bridge.ReadableMap;
import io.lynx.notifications.core.LynxNotificationsModule;
import java.util.List;
import java.util.Map;

/**
 * Lynx-facing bridge module that delegates to {@link LynxNotificationsModule}.
 *
 * Register this class with Lynx and pass the core module as the module param:
 * builder.registerModule("LynxNotificationsModule", LynxNotificationsBridgeModule.class, coreModule)
 */
public class LynxNotificationsBridgeModule extends LynxModule {
  private final LynxNotificationsModule coreModule;

  public LynxNotificationsBridgeModule(Context context, Object param) {
    super(context, param);
    if (!(param instanceof LynxNotificationsModule)) {
      throw new IllegalArgumentException(
          "LynxNotificationsBridgeModule requires LynxNotificationsModule as module param."
      );
    }
    this.coreModule = (LynxNotificationsModule) param;
  }

  @LynxMethod
  public void getPermissions(Callback callback) {
    coreModule.getPermissions(result -> callback.invoke(toBridgeValue(result)));
  }

  @LynxMethod
  public void requestPermissions(Callback callback) {
    coreModule.requestPermissions(result -> callback.invoke(toBridgeValue(result)));
  }

  @LynxMethod
  public void getPushToken(String provider, Callback callback) {
    coreModule.getPushToken(provider, result -> callback.invoke(toBridgeValue(result)));
  }

  @LynxMethod
  public void scheduleNotification(ReadableMap request, Callback callback) {
    coreModule.scheduleNotification(toMutableMap(request), result -> callback.invoke(toBridgeValue(result)));
  }

  @LynxMethod
  public void cancelScheduledNotification(String id, Callback callback) {
    coreModule.cancelScheduledNotification(id, result -> callback.invoke(toBridgeValue(result)));
  }

  @LynxMethod
  public void cancelAllScheduledNotifications(Callback callback) {
    coreModule.cancelAllScheduledNotifications(result -> callback.invoke(toBridgeValue(result)));
  }

  @LynxMethod
  public void getLastNotificationResponse(Callback callback) {
    coreModule.getLastNotificationResponse(result -> callback.invoke(toBridgeValue(result)));
  }

  @LynxMethod
  public void startObservingEvents(Callback callback) {
    coreModule.startObservingEvents(result -> callback.invoke(toBridgeValue(result)));
  }

  @LynxMethod
  public void stopObservingEvents(Callback callback) {
    coreModule.stopObservingEvents(result -> callback.invoke(toBridgeValue(result)));
  }

  private Map<String, Object> toMutableMap(ReadableMap source) {
    if (source == null) {
      return new JavaOnlyMap();
    }
    return JavaOnlyMap.deepClone(source);
  }

  @SuppressWarnings("unchecked")
  private Object toBridgeValue(Object value) {
    if (value == null) {
      return null;
    }

    if (value instanceof JavaOnlyMap || value instanceof JavaOnlyArray) {
      return value;
    }

    if (value instanceof ReadableMap) {
      return JavaOnlyMap.deepClone((ReadableMap) value);
    }

    if (value instanceof com.lynx.react.bridge.ReadableArray) {
      return JavaOnlyArray.deepClone((com.lynx.react.bridge.ReadableArray) value);
    }

    if (value instanceof Map) {
      JavaOnlyMap result = new JavaOnlyMap();
      for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet()) {
        if (entry.getKey() == null) {
          continue;
        }
        result.put(String.valueOf(entry.getKey()), toBridgeValue(entry.getValue()));
      }
      return result;
    }

    if (value instanceof List) {
      JavaOnlyArray array = new JavaOnlyArray();
      for (Object item : (List<Object>) value) {
        array.add(toBridgeValue(item));
      }
      return array;
    }

    if (value instanceof Boolean
        || value instanceof String
        || value instanceof Number
        || value instanceof byte[]) {
      return value;
    }

    return String.valueOf(value);
  }
}
