package io.lynx.notifications.core;

public final class NoopPermissionProvider implements NotificationPermissionProvider {
  @Override
  public NotificationPermissions getPermissions() {
    return new NotificationPermissions("undetermined", false, true);
  }

  @Override
  public NotificationPermissions requestPermissions() {
    // Template default. Replace with Android runtime permission flow when integrating.
    return new NotificationPermissions("granted", true, true);
  }
}
