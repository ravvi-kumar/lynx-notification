package io.lynx.notifications.example;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * BroadcastReceiver that displays scheduled local notifications.
 *
 * Register this receiver in AndroidManifest.xml.
 */
public class AndroidNotificationPublisherReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (!AndroidAlarmLocalNotificationScheduler.ACTION_PUBLISH_NOTIFICATION.equals(intent.getAction())) {
      return;
    }

    String id = nonEmpty(
        intent.getStringExtra(AndroidAlarmLocalNotificationScheduler.EXTRA_NOTIFICATION_ID),
        "notification-" + System.currentTimeMillis()
    );
    String channelId = nonEmpty(
        intent.getStringExtra(AndroidAlarmLocalNotificationScheduler.EXTRA_CHANNEL_ID),
        AndroidAlarmLocalNotificationScheduler.DEFAULT_CHANNEL_ID
    );

    ensureNotificationChannel(context, channelId);

    String title = nonEmpty(
        intent.getStringExtra(AndroidAlarmLocalNotificationScheduler.EXTRA_TITLE),
        "Notification"
    );
    String subtitle = intent.getStringExtra(AndroidAlarmLocalNotificationScheduler.EXTRA_SUBTITLE);
    String body = nonEmpty(
        intent.getStringExtra(AndroidAlarmLocalNotificationScheduler.EXTRA_BODY),
        ""
    );
    String dataJson = intent.getStringExtra(AndroidAlarmLocalNotificationScheduler.EXTRA_DATA_JSON);
    int badge = intent.getIntExtra(AndroidAlarmLocalNotificationScheduler.EXTRA_BADGE, -1);
    boolean useDefaultSound = intent.getBooleanExtra(
        AndroidAlarmLocalNotificationScheduler.EXTRA_USE_DEFAULT_SOUND,
        false
    );

    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
        .setSmallIcon(resolveSmallIcon(context))
        .setContentTitle(title)
        .setContentText(body)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setAutoCancel(true);

    if (subtitle != null && !subtitle.isEmpty()) {
      builder.setSubText(subtitle);
    }

    if (badge >= 0) {
      builder.setNumber(badge);
    }

    if (useDefaultSound) {
      builder.setDefaults(Notification.DEFAULT_SOUND);
    }

    Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
    if (launchIntent != null) {
      launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
      if (dataJson != null && !dataJson.isEmpty()) {
        launchIntent.putExtra(AndroidAlarmLocalNotificationScheduler.EXTRA_DATA_JSON, dataJson);
      }

      int flags = PendingIntent.FLAG_UPDATE_CURRENT;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        flags |= PendingIntent.FLAG_IMMUTABLE;
      }
      PendingIntent contentIntent = PendingIntent.getActivity(
          context,
          id.hashCode(),
          launchIntent,
          flags
      );
      builder.setContentIntent(contentIntent);
    }

    NotificationManagerCompat.from(context).notify(id.hashCode(), builder.build());
  }

  private static void ensureNotificationChannel(Context context, String channelId) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
    if (notificationManager == null) {
      return;
    }

    NotificationChannel existing = notificationManager.getNotificationChannel(channelId);
    if (existing != null) {
      return;
    }

    NotificationChannel channel = new NotificationChannel(
        channelId,
        "Lynx Notifications",
        NotificationManager.IMPORTANCE_DEFAULT
    );
    channel.setDescription("Notifications scheduled by LynxNotificationsModule");
    notificationManager.createNotificationChannel(channel);
  }

  private static int resolveSmallIcon(Context context) {
    int icon = context.getApplicationInfo().icon;
    if (icon != 0) {
      return icon;
    }
    return android.R.drawable.ic_dialog_info;
  }

  private static String nonEmpty(String value, String fallback) {
    if (value == null || value.isEmpty()) {
      return fallback;
    }
    return value;
  }
}
