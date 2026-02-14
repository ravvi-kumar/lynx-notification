# Android Native Artifacts

This folder contains publication scaffolding for:

- `io.lynx.notifications:core`
- `io.lynx.notifications:fcm`
- `io.lynx.notifications:android-runtime`

Expected runtime registration in host app:

- Register `LynxNotificationsModule` into Lynx runtime.
- If Lynx SDK >= 3.5, use `registerModuleAuthValidator` to allow only `LynxNotificationsModule` methods.

Core implementation templates:

- `core/src/main/java/io/lynx/notifications/core/LynxNotificationsModule.java`
- `core/src/main/java/io/lynx/notifications/core/NoopPermissionProvider.java`
- `core/src/main/java/io/lynx/notifications/core/RuntimeNotificationPermissionProvider.java`
- `core/src/main/java/io/lynx/notifications/core/InMemoryLocalNotificationScheduler.java`
- `core/src/main/java/io/lynx/notifications/core/LynxNotificationsAuthValidator.java`
- `core/src/main/java/io/lynx/notifications/core/LynxNotificationsInstaller.java`
- `core/src/main/java/io/lynx/notifications/core/LynxNotificationsEventForwarder.java`

FCM provider template:

- `fcm/src/main/java/io/lynx/notifications/fcm/FcmPushTokenProvider.java`

Android runtime adapters:

- `runtime/src/main/java/io/lynx/notifications/android/AndroidNotificationPermissionAdapters.java`
- `runtime/src/main/java/io/lynx/notifications/android/AndroidAlarmLocalNotificationScheduler.java`
- `runtime/src/main/java/io/lynx/notifications/android/AndroidNotificationPublisherReceiver.java`
- `runtime/src/main/AndroidManifest.xml`

The runtime artifact publishes as `io.lynx.notifications:android-runtime` and includes
`POST_NOTIFICATIONS` permission + receiver declarations in its library manifest.

Unit test scaffold:

- `core/src/test/java/io/lynx/notifications/core/LynxNotificationsModuleTest.java`
