# iOS Native Artifacts

This folder contains packaging scaffolding for:

- `LynxNotificationsCore`
- `LynxNotificationsFCM`

Expected runtime registration in host app:

- Register `LynxNotificationsModule` into Lynx runtime.
- If Lynx SDK >= 3.5, attach `registerMethodAuth` to allow only `LynxNotificationsModule` methods.

Core implementation templates:

- `Sources/Core/LynxNotificationsModule.swift`
- `Sources/Core/LynxNotificationsMethodAuth.swift`
- `Sources/Core/LynxNotificationsInstaller.swift`
- `Sources/Core/LynxNotificationsEventForwarder.swift`
- `Sources/Core/LynxNotificationsLogger.swift`
- `Sources/Core/UNUserNotificationCenterPermissionProvider.swift`
- `Sources/Core/UNUserNotificationCenterLocalNotificationScheduler.swift`

The core module template includes both `NoopPermissionProvider` and `RuntimeNotificationPermissionProvider` as host wiring options.

FCM provider template:

- `Sources/FCM/FcmPushTokenProvider.swift`

Unit test scaffold:

- `Tests/Core/LynxNotificationsModuleTests.swift`

SwiftPM test runner:

- `Package.swift`
- run `swift test --package-path native/ios --filter LynxNotificationsCoreTests`
