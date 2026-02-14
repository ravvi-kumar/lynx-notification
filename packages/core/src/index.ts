import {
  cancelAllScheduledNotificationsFromNative,
  cancelScheduledNotificationFromNative,
  getLastNotificationResponseFromNative,
  getPermissionsFromNative,
  getPushTokenFromNative,
  requestPermissionsFromNative,
  scheduleNotificationFromNative,
} from './nativeBridge'
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  removeNotificationSubscription,
} from './emitter'
import { NotificationsError, toNotificationsError } from './errors'
import type {
  NotificationPermissions,
  NotificationRequestInput,
  NotificationResponse,
  NotificationSubscription,
  Notification,
  PushProvider,
  PushToken,
  NotificationContentInput,
  NotificationTriggerInput,
  NotificationsErrorCode,
} from './types'

function assertProvider(provider?: PushProvider): PushProvider {
  if (provider === undefined) {
    return 'fcm'
  }

  if (provider !== 'fcm') {
    throw new NotificationsError(
      'ERR_INVALID_ARGUMENT',
      `Unsupported push provider "${provider}".`,
    )
  }

  return provider
}

function assertContent(content: NotificationContentInput): void {
  if (!content || typeof content !== 'object') {
    throw new NotificationsError(
      'ERR_INVALID_ARGUMENT',
      'Notification content must be an object.',
    )
  }

  if (content.badge !== undefined && !Number.isFinite(content.badge)) {
    throw new NotificationsError(
      'ERR_INVALID_ARGUMENT',
      'Notification badge must be a finite number when provided.',
    )
  }
}

function assertTrigger(trigger: NotificationTriggerInput): void {
  if (trigger === null) {
    return
  }

  if (!trigger || typeof trigger !== 'object') {
    throw new NotificationsError(
      'ERR_INVALID_ARGUMENT',
      'Notification trigger must be null or a trigger object.',
    )
  }

  if (trigger.type === 'date') {
    if (!Number.isFinite(trigger.date)) {
      throw new NotificationsError(
        'ERR_INVALID_ARGUMENT',
        'Date trigger requires a numeric date (unix milliseconds).',
      )
    }

    if (trigger.date <= Date.now()) {
      throw new NotificationsError(
        'ERR_INVALID_ARGUMENT',
        'Date trigger must be in the future.',
      )
    }

    if ((trigger as { repeats?: boolean }).repeats === true) {
      throw new NotificationsError(
        'ERR_INVALID_ARGUMENT',
        'Date trigger does not support repeats=true.',
      )
    }

    return
  }

  if (trigger.type === 'timeInterval') {
    if (!Number.isFinite(trigger.seconds) || trigger.seconds <= 0) {
      throw new NotificationsError(
        'ERR_INVALID_ARGUMENT',
        'Time interval trigger requires seconds > 0.',
      )
    }
    return
  }

  throw new NotificationsError('ERR_INVALID_ARGUMENT', 'Unknown notification trigger type.')
}

function assertScheduleRequest(request: NotificationRequestInput): void {
  if (!request || typeof request !== 'object') {
    throw new NotificationsError(
      'ERR_INVALID_ARGUMENT',
      'Notification request must be an object.',
    )
  }

  assertContent(request.content)
  assertTrigger(request.trigger)
}

export async function getPermissionsAsync(): Promise<NotificationPermissions> {
  try {
    return await getPermissionsFromNative()
  } catch (error) {
    throw toNotificationsError(error)
  }
}

export async function requestPermissionsAsync(): Promise<NotificationPermissions> {
  try {
    return await requestPermissionsFromNative()
  } catch (error) {
    throw toNotificationsError(error)
  }
}

export async function getDevicePushTokenAsync(options?: {
  provider?: PushProvider
}): Promise<PushToken> {
  try {
    const provider = assertProvider(options?.provider)
    return await getPushTokenFromNative(provider)
  } catch (error) {
    throw toNotificationsError(error)
  }
}

export async function registerForPushNotificationsAsync(options?: {
  provider?: PushProvider
}): Promise<PushToken> {
  try {
    const permissions = await requestPermissionsAsync()

    if (!permissions.granted || permissions.status !== 'granted') {
      throw new NotificationsError(
        'ERR_PERMISSION_DENIED',
        'Push notification permissions were not granted.',
      )
    }

    return await getDevicePushTokenAsync(options)
  } catch (error) {
    throw toNotificationsError(error)
  }
}

export async function scheduleNotificationAsync(
  request: NotificationRequestInput,
): Promise<string> {
  try {
    assertScheduleRequest(request)
    return await scheduleNotificationFromNative(request)
  } catch (error) {
    throw toNotificationsError(error)
  }
}

export async function cancelScheduledNotificationAsync(id: string): Promise<void> {
  try {
    if (!id || typeof id !== 'string') {
      throw new NotificationsError(
        'ERR_INVALID_ARGUMENT',
        'Scheduled notification id must be a non-empty string.',
      )
    }

    await cancelScheduledNotificationFromNative(id)
  } catch (error) {
    throw toNotificationsError(error)
  }
}

export async function cancelAllScheduledNotificationsAsync(): Promise<void> {
  try {
    await cancelAllScheduledNotificationsFromNative()
  } catch (error) {
    throw toNotificationsError(error)
  }
}

export async function getLastNotificationResponseAsync(): Promise<NotificationResponse | null> {
  try {
    return await getLastNotificationResponseFromNative()
  } catch (error) {
    throw toNotificationsError(error)
  }
}

export {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  removeNotificationSubscription,
}

export { NotificationsError }

export type {
  Notification,
  NotificationContentInput,
  NotificationPermissions,
  NotificationRequestInput,
  NotificationResponse,
  NotificationSubscription,
  NotificationTriggerInput,
  NotificationsErrorCode,
  PushProvider,
  PushToken,
}
