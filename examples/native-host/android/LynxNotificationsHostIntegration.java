package io.lynx.notifications.example;

import android.app.Activity;
import android.content.BroadcastReceiver;
import io.lynx.notifications.android.AndroidAlarmLocalNotificationScheduler;
import io.lynx.notifications.android.AndroidNotificationPermissionAdapters;
import io.lynx.notifications.core.LynxNotificationsInstaller;
import io.lynx.notifications.core.LynxNotificationsModule;
import io.lynx.notifications.core.LynxNotificationsEventForwarder;
import io.lynx.notifications.core.LocalNotificationScheduler;
import io.lynx.notifications.core.NotificationPermissionProvider;
import io.lynx.notifications.core.PushTokenProviderRegistry;
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
    PushTokenProviderRegistry providers = new PushTokenProviderRegistry();
    providers.register("fcm", new FcmPushTokenProvider());

    LynxNotificationsModule module = new LynxNotificationsModule(
        options.permissionProvider,
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

  /**
   * Production default options using Android runtime permission + AlarmManager scheduler adapters.
   */
  public static InstallationOptions createDefaultOptions(
      Activity activity,
      AndroidNotificationPermissionAdapters.PermissionRequestBridge permissionRequestBridge,
      Class<? extends BroadcastReceiver> notificationReceiverClass
  ) {
    NotificationPermissionProvider permissionProvider =
        AndroidNotificationPermissionAdapters.createPermissionProvider(activity, permissionRequestBridge);
    LocalNotificationScheduler scheduler = new AndroidAlarmLocalNotificationScheduler(
        activity.getApplicationContext(),
        notificationReceiverClass
    );
    return new InstallationOptions(permissionProvider, scheduler);
  }

  public static final class InstallationOptions {
    public final NotificationPermissionProvider permissionProvider;
    public final LocalNotificationScheduler scheduler;

    /**
     * @param permissionProvider Runtime notification permission provider.
     * @param scheduler Schedule/cancel local notifications via host app APIs.
     */
    public InstallationOptions(
        NotificationPermissionProvider permissionProvider,
        LocalNotificationScheduler scheduler
    ) {
      this.permissionProvider = permissionProvider;
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
