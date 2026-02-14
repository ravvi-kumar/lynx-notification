# @lynx-notifications/core

Expo-like notifications API for Lynx applications.

## API

```ts
import * as Notifications from '@lynx-notifications/core'

const token = await Notifications.registerForPushNotificationsAsync()

const subscription = Notifications.addNotificationReceivedListener(notification => {
  console.info(notification)
})

subscription.remove()
```
