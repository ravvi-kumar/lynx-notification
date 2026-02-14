package io.lynx.notifications.fcm;

import io.lynx.notifications.core.NotificationError;
import io.lynx.notifications.core.PushToken;
import io.lynx.notifications.core.PushTokenProvider;

/**
 * FCM provider bridge.
 *
 * Integrate FirebaseMessaging in the supplied TokenFetcher:
 * FirebaseMessaging.getInstance().getToken() -> callback token string.
 */
public final class FcmPushTokenProvider implements PushTokenProvider {
  private final TokenFetcher tokenFetcher;

  public FcmPushTokenProvider() {
    this.tokenFetcher = null;
  }

  public FcmPushTokenProvider(TokenFetcher tokenFetcher) {
    this.tokenFetcher = tokenFetcher;
  }

  @Override
  public PushToken getToken() throws NotificationError {
    if (tokenFetcher == null) {
      throw new NotificationError(
          "ERR_PROVIDER_UNCONFIGURED",
          "FCM provider requires Firebase token fetcher wiring."
      );
    }

    String token;
    try {
      token = tokenFetcher.fetch();
    } catch (Exception exception) {
      throw new NotificationError("ERR_NATIVE_FAILURE", exception.getMessage());
    }

    if (token == null || token.isEmpty()) {
      throw new NotificationError("ERR_PROVIDER_UNCONFIGURED", "FCM token was empty.");
    }

    return new PushToken("fcm", token);
  }

  public interface TokenFetcher {
    String fetch() throws Exception;
  }
}
