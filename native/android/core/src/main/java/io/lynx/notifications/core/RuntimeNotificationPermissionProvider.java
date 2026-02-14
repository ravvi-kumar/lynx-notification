package io.lynx.notifications.core;

/**
 * Callback-based runtime permission provider.
 *
 * Integrate your Activity Result APIs through PermissionRequestLauncher and
 * current permission state checks through PermissionStateReader.
 */
public final class RuntimeNotificationPermissionProvider implements NotificationPermissionProvider {
  private final PermissionStateReader stateReader;
  private final PermissionRequestLauncher requestLauncher;

  public RuntimeNotificationPermissionProvider(
      PermissionStateReader stateReader,
      PermissionRequestLauncher requestLauncher
  ) {
    this.stateReader = stateReader;
    this.requestLauncher = requestLauncher;
  }

  @Override
  public void getPermissions(PermissionsCallback callback) {
    callback.onSuccess(snapshot(stateReader.isGranted(), stateReader.canAskAgain()));
  }

  @Override
  public void requestPermissions(PermissionsCallback callback) {
    if (requestLauncher == null) {
      callback.onSuccess(snapshot(stateReader.isGranted(), stateReader.canAskAgain()));
      return;
    }

    requestLauncher.request(new PermissionRequestLauncher.RequestCallback() {
      @Override
      public void onResult(boolean granted) {
        callback.onSuccess(snapshot(granted, stateReader.canAskAgain()));
      }

      @Override
      public void onFailure(Throwable throwable) {
        callback.onError(NotificationError.fromThrowable(throwable));
      }
    });
  }

  private NotificationPermissions snapshot(boolean granted, boolean canAskAgain) {
    if (granted) {
      return new NotificationPermissions("granted", true, canAskAgain);
    }

    if (canAskAgain) {
      return new NotificationPermissions("undetermined", false, true);
    }

    return new NotificationPermissions("denied", false, false);
  }

  public interface PermissionStateReader {
    boolean isGranted();

    boolean canAskAgain();
  }

  public interface PermissionRequestLauncher {
    void request(RequestCallback callback);

    interface RequestCallback {
      void onResult(boolean granted);

      void onFailure(Throwable throwable);
    }
  }
}
