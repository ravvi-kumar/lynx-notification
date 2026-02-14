# LynxNotificationsModule Contract

Module name: `LynxNotificationsModule`

Result envelope:

```ts
type NativeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }
```

Methods:

- `getPermissions(cb)`
- `requestPermissions(cb)`
- `getPushToken(provider, cb)`
- `scheduleNotification(request, cb)`
- `cancelScheduledNotification(id, cb)`
- `cancelAllScheduledNotifications(cb)`
- `getLastNotificationResponse(cb)`
- `startObservingEvents(cb)`
- `stopObservingEvents(cb)`

Event payloads emitted by `startObservingEvents` callback:

- `notification_received`
- `notification_response`
- `token_refreshed`

Reference implementations:

- Android: `native/android/core/src/main/java/io/lynx/notifications/core/LynxNotificationsModule.java`
- iOS: `native/ios/Sources/Core/LynxNotificationsModule.swift`

Event forwarders:

- Android: `native/android/core/src/main/java/io/lynx/notifications/core/LynxNotificationsEventForwarder.java`
- iOS: `native/ios/Sources/Core/LynxNotificationsEventForwarder.swift`
