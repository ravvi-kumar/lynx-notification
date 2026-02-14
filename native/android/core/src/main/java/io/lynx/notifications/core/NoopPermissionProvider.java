package io.lynx.notifications.core;

public final class NoopPermissionProvider implements NotificationPermissionProvider {
  @Override
  public void getPermissions(PermissionsCallback callback) {
    callback.onSuccess(new NotificationPermissions("undetermined", false, true));
  }

  @Override
  public void requestPermissions(PermissionsCallback callback) {
    // Template default. Replace with Android runtime permission flow when integrating.
    callback.onSuccess(new NotificationPermissions("granted", true, true));
  }
}
