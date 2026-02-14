package io.lynx.notifications.android;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.activity.result.ActivityResultLauncher;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import io.lynx.notifications.core.LynxNotificationsLogger;
import io.lynx.notifications.core.NotificationPermissionProvider;
import io.lynx.notifications.core.RuntimeNotificationPermissionProvider;

/**
 * Production adapter for Android notification permission state + request flow.
 */
public final class AndroidNotificationPermissionAdapters {
  private static final String PREFERENCES_FILE = "lynx_notifications";
  private static final String KEY_PERMISSION_REQUESTED = "notifications_permission_requested";

  private AndroidNotificationPermissionAdapters() {}

  public static PermissionRequestBridge createPermissionRequestBridge(Context context) {
    return new PermissionRequestBridge(context.getApplicationContext());
  }

  public static NotificationPermissionProvider createPermissionProvider(
      Activity activity,
      PermissionRequestBridge requestBridge
  ) {
    SharedPreferences preferences = activity.getSharedPreferences(PREFERENCES_FILE, Context.MODE_PRIVATE);

    RuntimeNotificationPermissionProvider.PermissionStateReader stateReader =
        new RuntimeNotificationPermissionProvider.PermissionStateReader() {
          @Override
          public boolean isGranted() {
            return NotificationManagerCompat.from(activity).areNotificationsEnabled();
          }

          @Override
          public boolean canAskAgain() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
              return true;
            }

            if (ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) {
              return true;
            }

            boolean requestedOnce = preferences.getBoolean(KEY_PERMISSION_REQUESTED, false);
            if (!requestedOnce) {
              return true;
            }

            return activity.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS);
          }
        };

    RuntimeNotificationPermissionProvider.PermissionRequestLauncher requestLauncher = callback -> {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
        LynxNotificationsLogger.debug("Permission request skipped: API level < 33.");
        callback.onResult(NotificationManagerCompat.from(activity).areNotificationsEnabled());
        return;
      }

      preferences.edit().putBoolean(KEY_PERMISSION_REQUESTED, true).apply();
      requestBridge.request(callback);
    };

    return new RuntimeNotificationPermissionProvider(stateReader, requestLauncher);
  }

  public static final class PermissionRequestBridge
      implements RuntimeNotificationPermissionProvider.PermissionRequestLauncher {
    private final Context appContext;
    private ActivityResultLauncher<String> launcher;
    private RuntimeNotificationPermissionProvider.PermissionRequestLauncher.RequestCallback pendingCallback;

    private PermissionRequestBridge(Context appContext) {
      this.appContext = appContext;
    }

    public void attachLauncher(ActivityResultLauncher<String> launcher) {
      this.launcher = launcher;
    }

    @Override
    public void request(RequestCallback callback) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
        LynxNotificationsLogger.debug("Permission bridge request resolved on API < 33.");
        callback.onResult(NotificationManagerCompat.from(appContext).areNotificationsEnabled());
        return;
      }

      if (launcher == null) {
        LynxNotificationsLogger.error(
            "Permission launcher is missing. attachLauncher(...) must be called before permission requests."
        );
        callback.onFailure(new IllegalStateException(
            "Permission launcher is not attached. Call attachLauncher(...) before requesting permissions."
        ));
        return;
      }

      if (pendingCallback != null) {
        LynxNotificationsLogger.error("Notification permission request rejected because one is already in progress.");
        callback.onFailure(new IllegalStateException(
            "A notification permission request is already in progress."
        ));
        return;
      }

      pendingCallback = callback;
      LynxNotificationsLogger.debug("Launching POST_NOTIFICATIONS runtime permission request.");
      launcher.launch(Manifest.permission.POST_NOTIFICATIONS);
    }

    public void onPermissionRequestResult(boolean granted) {
      if (pendingCallback == null) {
        LynxNotificationsLogger.debug("Permission result received without pending callback.");
        return;
      }

      RuntimeNotificationPermissionProvider.PermissionRequestLauncher.RequestCallback callback = pendingCallback;
      pendingCallback = null;
      LynxNotificationsLogger.debug("Permission request result received. granted=" + granted);
      callback.onResult(granted);
    }
  }
}
