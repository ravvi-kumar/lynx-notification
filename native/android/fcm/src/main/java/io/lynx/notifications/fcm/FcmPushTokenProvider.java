package io.lynx.notifications.fcm;

import com.google.firebase.messaging.FirebaseMessaging;
import io.lynx.notifications.core.NotificationError;
import io.lynx.notifications.core.PushToken;
import io.lynx.notifications.core.PushTokenProvider;

/**
 * FCM provider bridge.
 */
public final class FcmPushTokenProvider implements PushTokenProvider {
  private final TokenFetcher tokenFetcher;

  public FcmPushTokenProvider() {
    this(new FirebaseTokenFetcher());
  }

  public FcmPushTokenProvider(TokenFetcher tokenFetcher) {
    this.tokenFetcher = tokenFetcher;
  }

  @Override
  public void getToken(PushTokenProvider.TokenCallback callback) {
    if (tokenFetcher == null) {
      callback.onError(new NotificationError(
          "ERR_PROVIDER_UNCONFIGURED",
          "FCM provider requires Firebase token fetcher wiring."
      ));
      return;
    }

    tokenFetcher.fetch(new TokenFetcher.Callback() {
      @Override
      public void onSuccess(String token) {
        if (token == null || token.isEmpty()) {
          callback.onError(new NotificationError(
              "ERR_PROVIDER_UNCONFIGURED",
              "FCM token was empty."
          ));
          return;
        }

        callback.onSuccess(new PushToken("fcm", token));
      }

      @Override
      public void onFailure(Throwable throwable) {
        callback.onError(NotificationError.fromThrowable(throwable));
      }
    });
  }

  public interface TokenFetcher {
    void fetch(Callback callback);

    interface Callback {
      void onSuccess(String token);

      void onFailure(Throwable throwable);
    }
  }

  private static final class FirebaseTokenFetcher implements TokenFetcher {
    @Override
    public void fetch(Callback callback) {
      FirebaseMessaging.getInstance()
          .getToken()
          .addOnSuccessListener(callback::onSuccess)
          .addOnFailureListener(callback::onFailure);
    }
  }
}
