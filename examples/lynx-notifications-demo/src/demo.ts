import * as Notifications from '@lynx-notifications/core'

export async function demoNotificationsFlow(): Promise<() => void> {
  const token = await Notifications.registerForPushNotificationsAsync()
  console.info('[demo] token', token.data)

  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.info('[demo] notification received', notification)
  })

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.info('[demo] notification response', response)
  })

  return () => {
    receivedSubscription.remove()
    responseSubscription.remove()
  }
}

export async function runLocalNotificationSmokeTest(): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lynx Notifications',
      body: 'Local notification smoke test fired.',
      data: {
        source: 'lynx-notifications-demo',
        type: 'local-smoke-test',
      },
      sound: 'default',
    },
    trigger: {
      type: 'timeInterval',
      seconds: 5,
      repeats: false,
    },
  })
}
