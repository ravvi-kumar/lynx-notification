package io.lynx.notifications.example;

import io.lynx.notifications.core.LynxNotificationsInstaller;
import io.lynx.notifications.core.LynxNotificationsModule;
import io.lynx.notifications.fcm.FcmPushTokenProvider;

/**
 * Host app wiring example.
 */
public final class LynxNotificationsHostIntegration {
  private LynxNotificationsHostIntegration() {}

  public static void install(
      LynxNotificationsInstaller.ModuleRegistrar moduleRegistrar,
      LynxNotificationsInstaller.AuthValidatorRegistrar authValidatorRegistrar
  ) {
    FcmPushTokenProvider provider = new FcmPushTokenProvider(() -> {
      // Replace with FirebaseMessaging.getInstance().getToken().await() or callback bridge.
      return "replace-with-real-fcm-token";
    });

    LynxNotificationsModule module = LynxNotificationsModule.createDefault(provider);

    LynxNotificationsInstaller.install(
        moduleRegistrar,
        authValidatorRegistrar,
        module
    );
  }
}
