import { NotificationsError, toNotificationsError } from './errors'
import { runOnBackgroundIfNeeded } from './thread'
import type {
  NativeNotificationEvent,
  NativeNotificationsModule,
  NativeResult,
  Notification,
  NotificationPermissions,
  NotificationRequestInput,
  NotificationResponse,
  PushProvider,
  PushToken,
} from './types'

const MODULE_NAME = 'LynxNotificationsModule'

type NativeMethod<T> = (cb: (result: NativeResult<T> | T) => void) => void

type GlobalWithNativeModules = {
  NativeModules?: Record<string, unknown>
}

function getNativeModule(): NativeNotificationsModule {
  const globalObject = globalThis as GlobalWithNativeModules
  const candidate = globalObject.NativeModules?.[MODULE_NAME]

  if (!candidate || typeof candidate !== 'object') {
    throw new NotificationsError(
      'ERR_NOTIFICATIONS_UNAVAILABLE',
      `Native module "${MODULE_NAME}" is not available.`,
    )
  }

  return candidate as NativeNotificationsModule
}

function isNativeResult<T>(payload: unknown): payload is NativeResult<T> {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  return Object.prototype.hasOwnProperty.call(payload, 'ok')
}

function unwrapNativeResult<T>(payload: NativeResult<T> | T): T {
  if (!isNativeResult<T>(payload)) {
    return payload
  }

  if (payload.ok) {
    return payload.data
  }

  throw toNotificationsError(payload.error)
}

async function callNativeMethod<T>(executor: (module: NativeNotificationsModule, cb: (result: NativeResult<T> | T) => void) => void): Promise<T> {
  return runOnBackgroundIfNeeded(async () => {
    const module = getNativeModule()

    return new Promise<T>((resolve, reject) => {
      try {
        executor(module, payload => {
          try {
            resolve(unwrapNativeResult(payload))
          } catch (error) {
            reject(toNotificationsError(error))
          }
        })
      } catch (error) {
        reject(toNotificationsError(error))
      }
    })
  })
}

async function callNativeVoid(executor: (module: NativeNotificationsModule, cb: (result: NativeResult<null> | null) => void) => void): Promise<void> {
  await callNativeMethod<null>((module, cb) => {
    executor(module, cb)
  })
}

function ensureMethod<T extends keyof NativeNotificationsModule>(module: NativeNotificationsModule, methodName: T): NonNullable<NativeNotificationsModule[T]> {
  const method = module[methodName]

  if (typeof method !== 'function') {
    throw new NotificationsError(
      'ERR_NOTIFICATIONS_UNAVAILABLE',
      `Native module method "${String(methodName)}" is not available.`,
    )
  }

  return method as NonNullable<NativeNotificationsModule[T]>
}

export async function getPermissionsFromNative(): Promise<NotificationPermissions> {
  return callNativeMethod((module, cb) => {
    const method = ensureMethod(module, 'getPermissions')
    ;(method as NativeMethod<NotificationPermissions>)(cb)
  })
}

export async function requestPermissionsFromNative(): Promise<NotificationPermissions> {
  return callNativeMethod((module, cb) => {
    const method = ensureMethod(module, 'requestPermissions')
    ;(method as NativeMethod<NotificationPermissions>)(cb)
  })
}

export async function getPushTokenFromNative(provider: PushProvider): Promise<PushToken> {
  return callNativeMethod((module, cb) => {
    const method = ensureMethod(module, 'getPushToken')
    method(provider, cb)
  })
}

export async function scheduleNotificationFromNative(request: NotificationRequestInput): Promise<string> {
  const result = await callNativeMethod<string | { id: string }>((module, cb) => {
    const method = ensureMethod(module, 'scheduleNotification')
    method(request, cb)
  })

  if (typeof result === 'string') {
    return result
  }

  if (result && typeof result === 'object' && typeof result.id === 'string') {
    return result.id
  }

  throw new NotificationsError('ERR_NATIVE_FAILURE', 'Native scheduleNotification returned an invalid identifier payload.')
}

export async function cancelScheduledNotificationFromNative(id: string): Promise<void> {
  await callNativeVoid((module, cb) => {
    const method = ensureMethod(module, 'cancelScheduledNotification')
    method(id, cb)
  })
}

export async function cancelAllScheduledNotificationsFromNative(): Promise<void> {
  await callNativeVoid((module, cb) => {
    const method = ensureMethod(module, 'cancelAllScheduledNotifications')
    method(cb)
  })
}

export async function getLastNotificationResponseFromNative(): Promise<NotificationResponse | null> {
  return callNativeMethod((module, cb) => {
    const method = ensureMethod(module, 'getLastNotificationResponse')
    ;(method as NativeMethod<NotificationResponse | null>)(cb)
  })
}

export type NativeEventListener = (event: NativeNotificationEvent) => void

let eventListener: NativeEventListener | null = null
let isObserving = false

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as Record<string, unknown>
}

function parseNativeEvent(payload: unknown): NativeNotificationEvent | null {
  const direct = asRecord(payload)
  const eventPayload = direct && typeof direct.type === 'string'
    ? direct
    : asRecord(direct?.event)

  if (!eventPayload || typeof eventPayload.type !== 'string') {
    return null
  }

  if (eventPayload.type === 'notification_received') {
    const notification = eventPayload.notification as Notification | undefined
    if (notification) {
      return {
        type: 'notification_received',
        notification,
      }
    }
  }

  if (eventPayload.type === 'notification_response') {
    const response = eventPayload.response as NotificationResponse | undefined
    if (response) {
      return {
        type: 'notification_response',
        response,
      }
    }
  }

  if (eventPayload.type === 'token_refreshed') {
    const token = eventPayload.token as PushToken | undefined
    if (token) {
      return {
        type: 'token_refreshed',
        token,
      }
    }
  }

  return null
}

export async function startObservingNativeEvents(listener: NativeEventListener): Promise<void> {
  eventListener = listener

  if (isObserving) {
    return
  }

  await runOnBackgroundIfNeeded(async () => {
    const module = getNativeModule()
    const method = ensureMethod(module, 'startObservingEvents')

    method(payload => {
      if (isNativeResult<null>(payload)) {
        if (!payload.ok) {
          console.warn(`[lynx-notifications] startObservingEvents error: ${payload.error.message}`)
        }
        return
      }

      const event = parseNativeEvent(payload)
      if (event && eventListener) {
        eventListener(event)
      }
    })
  })

  isObserving = true
}

export async function stopObservingNativeEvents(): Promise<void> {
  if (!isObserving) {
    eventListener = null
    return
  }

  await runOnBackgroundIfNeeded(async () => {
    const module = getNativeModule()
    const method = module.stopObservingEvents

    if (typeof method !== 'function') {
      return
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false

      try {
        method(result => {
          if (settled) {
            return
          }
          settled = true

          if (!result) {
            resolve()
            return
          }

          try {
            unwrapNativeResult(result)
            resolve()
          } catch (error) {
            reject(toNotificationsError(error))
          }
        })
      } catch (error) {
        reject(toNotificationsError(error))
        return
      }

      queueMicrotask(() => {
        if (!settled) {
          settled = true
          resolve()
        }
      })
    })
  })

  isObserving = false
  eventListener = null
}
