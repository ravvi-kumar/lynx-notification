# Native Integration Notes

## Bridge Module

Register native module name: `LynxNotificationsModule`

Contract reference: `native/CONTRACT.md`
Host integration examples: `examples/native-host/`

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

## FCM Adapters

- Android adapter template: `native/android/fcm/src/main/java/io/lynx/notifications/fcm/FcmPushTokenProvider.java`
- iOS adapter template: `native/ios/Sources/FCM/FcmPushTokenProvider.swift`

Replace templates with Firebase token retrieval and callback envelope conversion.

## Scheduler and Permission Templates

- Android local scheduler template: `native/android/core/src/main/java/io/lynx/notifications/core/InMemoryLocalNotificationScheduler.java`
- Android permission template: `native/android/core/src/main/java/io/lynx/notifications/core/NoopPermissionProvider.java`
- iOS local scheduler template: `native/ios/Sources/Core/LynxNotificationsModule.swift` (`InMemoryLocalNotificationScheduler`)
- iOS permission template: `native/ios/Sources/Core/LynxNotificationsModule.swift` (`NoopPermissionProvider`)
