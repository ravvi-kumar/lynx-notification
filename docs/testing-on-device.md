# Testing On Device

This guide is for validating a real app integration (not just unit tests).

## 1) Bootstrap in JS

Run the initializer in your app root:

```bash
npx lynx-notifications init --provider fcm --platform ios,android
```

Confirm your entry imports and runs `bootstrapNotifications` from `src/notifications/bootstrap.ts`.

## 2) Wire Native Host

Use the host templates:

- Android: `examples/native-host/android/LynxNotificationsHostIntegration.java`
- iOS: `examples/native-host/ios/LynxNotificationsHostIntegration.swift`

Provide real Android `InstallationOptions`:

1. Create `PermissionRequestBridge` from `io.lynx.notifications.android.AndroidNotificationPermissionAdapters`
2. Register Activity Result `RequestPermission()` callback and forward to `bridge.onPermissionRequestResult(...)`
3. Build provider via `AndroidNotificationPermissionAdapters.createPermissionProvider(...)`
4. Use `AndroidAlarmLocalNotificationScheduler(...)`
5. Ensure `io.lynx.notifications:android-runtime` is added (CLI patches this dependency)

Android bridge sketch:

```java
AndroidNotificationPermissionAdapters.PermissionRequestBridge bridge =
    AndroidNotificationPermissionAdapters.createPermissionRequestBridge(activity);

ActivityResultLauncher<String> launcher = activity.registerForActivityResult(
    new ActivityResultContracts.RequestPermission(),
    bridge::onPermissionRequestResult
);
bridge.attachLauncher(launcher);

LynxNotificationsHostIntegration.InstallationOptions options =
    LynxNotificationsHostIntegration.createDefaultOptions(
        activity,
        bridge,
        io.lynx.notifications.android.AndroidNotificationPublisherReceiver.class,
        true // enable native debug logs during QA
    );
```

iOS `InstallationOptions` already default to:

1. `UNUserNotificationCenterPermissionProvider`
2. `UNUserNotificationCenterLocalNotificationScheduler`

Enable native debug logs during QA:

```swift
let options = LynxNotificationsHostIntegration.InstallationOptions(
  debugLoggingEnabled: true
)
```

If native folders are missing, follow `.lynx-notifications/integration-guide.md`.

## 3) Verify Local Notifications

In app code:

```ts
import * as Notifications from '@lynx-notifications/core'

await Notifications.requestPermissionsAsync()
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Local Smoke Test',
    body: 'This should appear in a few seconds.',
    sound: 'default',
  },
  trigger: {
    type: 'timeInterval',
    seconds: 5,
    repeats: false,
  },
})
```

Expected:

1. Foreground callback via `addNotificationReceivedListener`
2. Tapping notification emits `addNotificationResponseReceivedListener`
3. Cold-start tap payload available from `getLastNotificationResponseAsync`

## 4) Verify Remote Push (FCM)

1. Install and configure Firebase Messaging in host iOS/Android projects.
2. Launch app on real device.
3. Call `registerForPushNotificationsAsync()` and capture returned token.
4. Send a test push to that token from Firebase Console.
5. Confirm receive/response listeners fire exactly once.

## 5) Common Failures

1. `ERR_PROVIDER_UNCONFIGURED`: FCM SDK/provider wiring is missing.
2. `ERR_PERMISSION_DENIED`: host permission request adapter returned denied.
3. `ERR_NOTIFICATIONS_UNAVAILABLE`: `LynxNotificationsModule` is not registered in native host.
4. `ERR_INVALID_ARGUMENT`: invalid trigger payload (past date, non-positive interval, empty id).
