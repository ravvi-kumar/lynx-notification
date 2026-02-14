# Android Native Artifacts

This folder contains publication scaffolding for:

- `io.lynx.notifications:core`
- `io.lynx.notifications:fcm`

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

Unit test scaffold:

- `core/src/test/java/io/lynx/notifications/core/LynxNotificationsModuleTest.java`
