package io.lynx.notifications.core;

public interface NotificationPermissionProvider {
  void getPermissions(PermissionsCallback callback);

  void requestPermissions(PermissionsCallback callback);

  interface PermissionsCallback {
    void onSuccess(NotificationPermissions permissions);

    void onError(NotificationError error);
  }
}
