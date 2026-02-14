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
    LynxNotificationsLogger.debug("Forwarding foreground notification event to Lynx module.");
    module.emitNotificationReceived(notification);
  }

  public void onNotificationResponse(Map<String, Object> response) {
    LynxNotificationsLogger.debug("Forwarding notification response event to Lynx module.");
    module.emitNotificationResponse(response);
  }

  public void onTokenRefreshed(String token) {
    LynxNotificationsLogger.debug("Forwarding token refresh event to Lynx module.");
    module.emitTokenRefreshed(new PushToken("fcm", token));
  }
}
