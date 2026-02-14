# Android Native Artifacts

This folder contains publication scaffolding for:

- `io.lynx.notifications:core`
- `io.lynx.notifications:fcm`

Expected runtime registration in host app:

- Register `LynxNotificationsModule` into Lynx runtime.
- If Lynx SDK >= 3.5, use `registerModuleAuthValidator` to allow only `LynxNotificationsModule` methods.
