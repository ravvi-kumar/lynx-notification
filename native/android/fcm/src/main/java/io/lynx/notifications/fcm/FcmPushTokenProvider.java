package io.lynx.notifications.fcm;

import io.lynx.notifications.core.LynxNotificationsModule.MethodCallback;
import io.lynx.notifications.core.LynxNotificationsModule.PushToken;
import io.lynx.notifications.core.LynxNotificationsModule.PushTokenProvider;

/**
 * FCM token provider template.
 *
 * Replace with FirebaseMessaging.getInstance().getToken() integration in host app.
 */
public final class FcmPushTokenProvider implements PushTokenProvider {
  @Override
  public void getToken(MethodCallback<PushToken> callback) {
    callback.failure("ERR_PROVIDER_UNCONFIGURED", "FCM provider template requires Firebase integration.");
  }
}
