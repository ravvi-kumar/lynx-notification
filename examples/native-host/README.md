# Native Host Integration Examples

This folder contains copy-ready integration snippets for host apps embedding Lynx.

- Android: `android/LynxNotificationsHostIntegration.java`
- iOS: `ios/LynxNotificationsHostIntegration.swift`

These examples show how to:

1. Create `LynxNotificationsModule` with FCM provider wiring
2. Register module name `LynxNotificationsModule`
3. Register SDK 3.5+ auth validator using installer helpers
4. Forward host push events via `LynxNotificationsEventForwarder`

The default `FcmPushTokenProvider()` in both examples expects Firebase Messaging SDK to be linked.
