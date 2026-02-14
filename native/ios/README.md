# iOS Native Artifacts

This folder contains packaging scaffolding for:

- `LynxNotificationsCore`
- `LynxNotificationsFCM`

Expected runtime registration in host app:

- Register `LynxNotificationsModule` into Lynx runtime.
- If Lynx SDK >= 3.5, attach `registerMethodAuth` to allow only `LynxNotificationsModule` methods.
