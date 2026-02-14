# Lynx Notifications Demo

This demo package illustrates Expo-like usage:

```ts
import * as Notifications from '@lynx-notifications/core'

const token = await Notifications.registerForPushNotificationsAsync()
Notifications.addNotificationReceivedListener(notification => {
  console.info(notification)
})
```
