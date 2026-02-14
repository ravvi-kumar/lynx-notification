package io.lynx.notifications.example;

import io.lynx.notifications.core.LynxNotificationsInstaller;
import io.lynx.notifications.core.LynxNotificationsModule;
import io.lynx.notifications.core.LynxNotificationsEventForwarder;
import io.lynx.notifications.core.LocalNotificationScheduler;
import io.lynx.notifications.core.PushTokenProviderRegistry;
import io.lynx.notifications.core.RuntimeNotificationPermissionProvider;
import io.lynx.notifications.fcm.FcmPushTokenProvider;

/**
 * Host app wiring example.
 */
public final class LynxNotificationsHostIntegration {
  private LynxNotificationsHostIntegration() {}

  public static Installation install(
      LynxNotificationsInstaller.ModuleRegistrar moduleRegistrar,
      LynxNotificationsInstaller.AuthValidatorRegistrar authValidatorRegistrar,
      InstallationOptions options
  ) {
    RuntimeNotificationPermissionProvider permissionProvider = new RuntimeNotificationPermissionProvider(
        options.permissionStateReader,
        options.permissionRequestLauncher
    );

    PushTokenProviderRegistry providers = new PushTokenProviderRegistry();
    providers.register("fcm", new FcmPushTokenProvider());

    LynxNotificationsModule module = new LynxNotificationsModule(
        permissionProvider,
        providers,
        options.scheduler
    );
    LynxNotificationsEventForwarder eventForwarder = new LynxNotificationsEventForwarder(module);

    LynxNotificationsInstaller.install(
        moduleRegistrar,
        authValidatorRegistrar,
        module
    );

    return new Installation(module, eventForwarder);
  }

  public static final class InstallationOptions {
    public final RuntimeNotificationPermissionProvider.PermissionStateReader permissionStateReader;
    public final RuntimeNotificationPermissionProvider.PermissionRequestLauncher permissionRequestLauncher;
    public final LocalNotificationScheduler scheduler;

    /**
     * @param permissionStateReader Read current permission and "can ask again" state from host app APIs.
     * @param permissionRequestLauncher Launch notification permission prompt from host app APIs.
     * @param scheduler Schedule/cancel local notifications via host app APIs.
     */
    public InstallationOptions(
        RuntimeNotificationPermissionProvider.PermissionStateReader permissionStateReader,
        RuntimeNotificationPermissionProvider.PermissionRequestLauncher permissionRequestLauncher,
        LocalNotificationScheduler scheduler
    ) {
      this.permissionStateReader = permissionStateReader;
      this.permissionRequestLauncher = permissionRequestLauncher;
      this.scheduler = scheduler;
    }
  }

  public static final class Installation {
    public final LynxNotificationsModule module;
    public final LynxNotificationsEventForwarder events;

    public Installation(
        LynxNotificationsModule module,
        LynxNotificationsEventForwarder events
    ) {
      this.module = module;
      this.events = events;
    }
  }
}
