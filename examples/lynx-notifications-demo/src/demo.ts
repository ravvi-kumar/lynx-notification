import * as Notifications from '@lynx-notifications/core'

export async function demoNotificationsFlow(): Promise<void> {
  const token = await Notifications.registerForPushNotificationsAsync()
  console.info('[demo] token', token.data)

  Notifications.addNotificationReceivedListener(notification => {
    console.info('[demo] notification received', notification)
  })

  Notifications.addNotificationResponseReceivedListener(response => {
    console.info('[demo] notification response', response)
  })
}
