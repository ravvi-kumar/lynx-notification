package io.lynx.notifications.core;

import java.util.Map;

/**
 * Adapts host push lifecycle callbacks to Lynx notifications module events.
 */
public final class LynxNotificationsEventForwarder {
  private final LynxNotificationsModule module;

  public LynxNotificationsEventForwarder(LynxNotificationsModule module) {
    this.module = module;
  }

  public void onForegroundNotificationReceived(Map<String, Object> notification) {
    module.emitNotificationReceived(notification);
  }

  public void onNotificationResponse(Map<String, Object> response) {
    module.emitNotificationResponse(response);
  }

  public void onTokenRefreshed(String token) {
    module.emitTokenRefreshed(new PushToken("fcm", token));
  }
}
