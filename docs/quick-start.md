# Lynx Notifications Quick Start

## Install

```bash
npx lynx-notifications init --provider fcm --platform ios,android
```

This command will:

- Add `@lynx-notifications/core`
- Generate `src/notifications/bootstrap.ts`
- Auto-wire your `src/index.*` entry with a managed bootstrap block
- Patch native iOS/Android files when found
- Generate `.lynx-notifications/integration-guide.md` when manual steps are needed

## Use in App Code

```ts
import * as Notifications from '@lynx-notifications/core'

const token = await Notifications.registerForPushNotificationsAsync()
Notifications.addNotificationReceivedListener(notification => {
  console.info(notification)
})
```

## API Surface

- `getPermissionsAsync`
- `requestPermissionsAsync`
- `registerForPushNotificationsAsync`
- `getDevicePushTokenAsync`
- `scheduleNotificationAsync`
- `cancelScheduledNotificationAsync`
- `cancelAllScheduledNotificationsAsync`
- `getLastNotificationResponseAsync`
- `addNotificationReceivedListener`
- `addNotificationResponseReceivedListener`
- `removeNotificationSubscription`
