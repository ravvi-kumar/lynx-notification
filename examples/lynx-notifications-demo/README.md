# Lynx Notifications Demo

This demo package illustrates Expo-like usage:

```ts
import * as Notifications from '@lynx-notifications/core'

const token = await Notifications.registerForPushNotificationsAsync()
Notifications.addNotificationReceivedListener(notification => {
  console.info(notification)
})
```

It also exports a local notification smoke test helper:

```ts
import { runLocalNotificationSmokeTest } from './src/demo'

const requestId = await runLocalNotificationSmokeTest()
console.info(requestId)
```
