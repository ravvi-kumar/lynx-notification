package io.lynx.notifications.example;

import io.lynx.notifications.core.LynxNotificationsInstaller;
import io.lynx.notifications.core.LynxNotificationsModule;
import io.lynx.notifications.core.LynxNotificationsEventForwarder;
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
    FcmPushTokenProvider provider = new FcmPushTokenProvider();

    LynxNotificationsModule module = LynxNotificationsModule.createDefault(provider);
    LynxNotificationsEventForwarder eventForwarder = new LynxNotificationsEventForwarder(module);

    LynxNotificationsInstaller.install(
        moduleRegistrar,
        authValidatorRegistrar,
        module
    );

    // Wire your host push callbacks:
    // eventForwarder.onForegroundNotificationReceived(...)
    // eventForwarder.onNotificationResponse(...)
    // eventForwarder.onTokenRefreshed(...)
  }
}
