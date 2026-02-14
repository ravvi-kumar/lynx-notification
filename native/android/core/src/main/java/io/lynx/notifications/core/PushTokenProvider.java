package io.lynx.notifications.core;

public interface PushTokenProvider {
  void getToken(TokenCallback callback);

  interface TokenCallback {
    void onSuccess(PushToken token);

    void onError(NotificationError error);
  }
}
