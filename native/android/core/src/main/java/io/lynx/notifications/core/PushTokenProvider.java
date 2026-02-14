package io.lynx.notifications.core;

public interface PushTokenProvider {
  PushToken getToken() throws NotificationError;
}
