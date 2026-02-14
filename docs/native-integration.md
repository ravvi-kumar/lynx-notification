# Native Integration Notes

## Bridge Module

Register native module name: `LynxNotificationsModule`

Contract reference: `native/CONTRACT.md`
Host integration examples: `examples/native-host/`
Device test flow: `docs/testing-on-device.md`

Production-ready host constructors:

- Android: `examples/native-host/android/LynxNotificationsHostIntegration.java` (`InstallationOptions`)
- iOS: `examples/native-host/ios/LynxNotificationsHostIntegration.swift` (`InstallationOptions`)

Optional diagnostics:

- set `debugLoggingEnabled` in `InstallationOptions` to enable native logs for permission/token/event failures.

## iOS Registration

When using Lynx SDK 3.5+, register method auth validator and allow only notifications module methods for the target LynxView.

```objective-c
LynxViewBuilder *builder = GetLynxViewBuilder();
[builder.config registerMethodAuth:^BOOL(NSString *method, NSString *module, NSString *invokeSession, NSInvocation *inv) {
  if ([module isEqualToString:@"LynxNotificationsModule"]) {
    return YES;
  }
  return NO;
}];
```

Installer helper template: `native/ios/Sources/Core/LynxNotificationsInstaller.swift`

## Android Registration

When using Lynx SDK 3.5+, register module auth validator and allow only notifications module methods for the target LynxView.

```java
LynxViewBuilder builder = LynxView.builder()
  .registerModuleAuthValidator((moduleName, methodName, methodParams) -> {
    return "LynxNotificationsModule".equals(moduleName);
  });
```

Helper template: `native/android/core/src/main/java/io/lynx/notifications/core/LynxNotificationsAuthValidator.java`
Installer helper template: `native/android/core/src/main/java/io/lynx/notifications/core/LynxNotificationsInstaller.java`

## Host Wiring Pattern

1. Construct `LynxNotificationsModule` with:
- permission provider
- push provider registry (register `fcm`)
- local scheduler
2. Register module name exactly as `LynxNotificationsModule` in host Lynx runtime.
3. Register auth validator for SDK 3.5+ and allow only `LynxNotificationsModule`.
4. Forward native push events to:
- `emitNotificationReceived`
- `emitNotificationResponse`
- `emitTokenRefreshed`

## Production Wiring Inputs

For production behavior, pass real host adapters through `InstallationOptions`:

1. Android:
   - add dependency: `implementation("io.lynx.notifications:android-runtime:0.1.0-alpha")`
   - `NotificationPermissionProvider` from `native/android/runtime/src/main/java/io/lynx/notifications/android/AndroidNotificationPermissionAdapters.java`
   - `LocalNotificationScheduler` from `native/android/runtime/src/main/java/io/lynx/notifications/android/AndroidAlarmLocalNotificationScheduler.java`
2. iOS:
   - `UNUserNotificationCenterPermissionProvider` (`native/ios/Sources/Core/UNUserNotificationCenterPermissionProvider.swift`)
   - `UNUserNotificationCenterLocalNotificationScheduler` (`native/ios/Sources/Core/UNUserNotificationCenterLocalNotificationScheduler.swift`)

Do not use `NoopPermissionProvider` or in-memory scheduler in release builds.
Keep `debugLoggingEnabled` disabled in release builds unless investigating an incident.

## FCM Adapters

- Android adapter template: `native/android/fcm/src/main/java/io/lynx/notifications/fcm/FcmPushTokenProvider.java`
- iOS adapter template: `native/ios/Sources/FCM/FcmPushTokenProvider.swift`

Both templates are callback-based and include Firebase wiring entry points. Replace the token fetch implementation if your host has a custom push stack.

## Scheduler and Permission Templates

- Android local scheduler template: `native/android/core/src/main/java/io/lynx/notifications/core/InMemoryLocalNotificationScheduler.java`
- Android permission templates:
  - `native/android/core/src/main/java/io/lynx/notifications/core/NoopPermissionProvider.java`
  - `native/android/core/src/main/java/io/lynx/notifications/core/RuntimeNotificationPermissionProvider.java`
- Android production examples:
  - `native/android/runtime/src/main/java/io/lynx/notifications/android/AndroidAlarmLocalNotificationScheduler.java`
  - `native/android/runtime/src/main/java/io/lynx/notifications/android/AndroidNotificationPermissionAdapters.java`
  - `native/android/runtime/src/main/java/io/lynx/notifications/android/AndroidNotificationPublisherReceiver.java`
- iOS local scheduler templates:
  - `native/ios/Sources/Core/LynxNotificationsModule.swift` (`InMemoryLocalNotificationScheduler`)
  - `native/ios/Sources/Core/UNUserNotificationCenterLocalNotificationScheduler.swift`
- iOS permission templates:
  - `native/ios/Sources/Core/LynxNotificationsModule.swift` (`NoopPermissionProvider`, `RuntimeNotificationPermissionProvider`)
  - `native/ios/Sources/Core/UNUserNotificationCenterPermissionProvider.swift`

## Event Forwarders

- Android forwarder: `native/android/core/src/main/java/io/lynx/notifications/core/LynxNotificationsEventForwarder.java`
- iOS forwarder: `native/ios/Sources/Core/LynxNotificationsEventForwarder.swift`

Use forwarders to map host push lifecycle callbacks into:

- `notification_received`
- `notification_response`
- `token_refreshed`

## Native Test Scaffolds

- Android JUnit: `native/android/core/src/test/java/io/lynx/notifications/core/LynxNotificationsModuleTest.java`
- iOS XCTest: `native/ios/Tests/Core/LynxNotificationsModuleTests.swift`
