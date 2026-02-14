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

## Error Codes

- `ERR_NOTIFICATIONS_UNAVAILABLE`
- `ERR_PERMISSION_DENIED`
- `ERR_PROVIDER_UNCONFIGURED`
- `ERR_INVALID_ARGUMENT`
- `ERR_NATIVE_FAILURE`
