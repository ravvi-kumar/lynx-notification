# Native Host Integration Examples

This folder contains copy-ready integration snippets for host apps embedding Lynx.

- Android: `android/LynxNotificationsHostIntegration.java`
- iOS: `ios/LynxNotificationsHostIntegration.swift`

Android runtime adapters are now published from:

- `native/android/runtime/src/main/java/io/lynx/notifications/android/AndroidNotificationPermissionAdapters.java`
- `native/android/runtime/src/main/java/io/lynx/notifications/android/AndroidAlarmLocalNotificationScheduler.java`
- `native/android/runtime/src/main/java/io/lynx/notifications/android/AndroidNotificationPublisherReceiver.java`

Use Maven dependency: `implementation("io.lynx.notifications:android-runtime:0.1.0-alpha")`

These examples show how to:

1. Create `LynxNotificationsModule` with FCM provider wiring
2. Register module name `LynxNotificationsModule`
3. Register SDK 3.5+ auth validator using installer helpers
4. Forward host push events via `LynxNotificationsEventForwarder`

The default `FcmPushTokenProvider()` in both examples expects Firebase Messaging SDK to be linked.

## Required Host Inputs

Android `InstallationOptions` requires:

1. `permissionProvider`: create with `io.lynx.notifications.android.AndroidNotificationPermissionAdapters.createPermissionProvider(...)`
2. `scheduler`: use `io.lynx.notifications.android.AndroidAlarmLocalNotificationScheduler(...)`

iOS `InstallationOptions` defaults to production adapters:

1. `UNUserNotificationCenterPermissionProvider`
2. `UNUserNotificationCenterLocalNotificationScheduler`

Android manifest note:

1. Receiver is declared by `io.lynx.notifications:android-runtime` library manifest.
2. CLI still patches a receiver block in host `AndroidManifest.xml` for deterministic setup.
