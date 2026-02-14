package io.lynx.notifications.core;

public interface NotificationPermissionProvider {
  NotificationPermissions getPermissions();

  NotificationPermissions requestPermissions();
}
