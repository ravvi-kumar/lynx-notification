import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runOnBackgroundMock } = vi.hoisted(() => ({
  runOnBackgroundMock: vi.fn((fn: (...args: unknown[]) => unknown) => async (...args: unknown[]) => fn(...args)),
}))

vi.mock('@lynx-js/react', () => ({
  runOnBackground: runOnBackgroundMock,
}))

import * as Notifications from '../index'
import type {
  NativeNotificationsModule,
  NativeResult,
  Notification,
  NotificationPermissions,
  NotificationResponse,
} from '../types'

type EventCallback = (payload: unknown) => void

let eventCallback: EventCallback | null = null

function ok<T>(data: T): NativeResult<T> {
  return {
    ok: true,
    data,
  }
}

function installNativeModule(overrides: Partial<NativeNotificationsModule> = {}): NativeNotificationsModule {
  const defaultPermissions: NotificationPermissions = {
    status: 'granted',
    granted: true,
    canAskAgain: true,
  }

  const module: NativeNotificationsModule = {
    getPermissions: cb => cb(ok(defaultPermissions)),
    requestPermissions: cb => cb(ok(defaultPermissions)),
    getPushToken: (_provider, cb) => cb(ok({ type: 'fcm', data: 'push-token-123' })),
    scheduleNotification: (_request, cb) => cb(ok('notification-id-1')),
    cancelScheduledNotification: (_id, cb) => cb(ok(null)),
    cancelAllScheduledNotifications: cb => cb(ok(null)),
    getLastNotificationResponse: cb => cb(ok(null)),
    startObservingEvents: cb => {
      eventCallback = cb
      cb(ok(null))
    },
    stopObservingEvents: cb => {
      cb?.(ok(null))
    },
    ...overrides,
  }

  ;(globalThis as { NativeModules?: Record<string, unknown> }).NativeModules = {
    LynxNotificationsModule: module,
  }

  return module
}

function sampleNotification(): Notification {
  return {
    id: 'notification-1',
    date: Date.now(),
    request: {
      content: {
        title: 'Title',
        body: 'Body',
      },
      trigger: null,
    },
  }
}

function sampleNotificationResponse(): NotificationResponse {
  return {
    notification: sampleNotification(),
    actionIdentifier: 'default',
  }
}

beforeEach(() => {
  runOnBackgroundMock.mockClear()
  ;(globalThis as { __MAIN_THREAD__?: boolean }).__MAIN_THREAD__ = false
  eventCallback = null
  installNativeModule()
})

describe('notifications core API', () => {
  it('returns permissions from native module', async () => {
    await expect(Notifications.getPermissionsAsync()).resolves.toEqual({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    })
  })

  it('throws typed error when native module is missing', async () => {
    delete (globalThis as { NativeModules?: Record<string, unknown> }).NativeModules

    await expect(Notifications.getPermissionsAsync()).rejects.toMatchObject({
      code: 'ERR_NOTIFICATIONS_UNAVAILABLE',
    })
  })

  it('rejects registerForPushNotificationsAsync when permission is denied', async () => {
    installNativeModule({
      requestPermissions: cb => {
        cb(ok({
          status: 'denied',
          granted: false,
          canAskAgain: false,
        }))
      },
    })

    await expect(Notifications.registerForPushNotificationsAsync()).rejects.toMatchObject({
      code: 'ERR_PERMISSION_DENIED',
    })
  })

  it('rejects scheduleNotificationAsync for past date trigger', async () => {
    await expect(
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reminder',
        },
        trigger: {
          type: 'date',
          date: Date.now() - 5000,
        },
      }),
    ).rejects.toMatchObject({
      code: 'ERR_INVALID_ARGUMENT',
    })
  })

  it('rejects scheduleNotificationAsync when date trigger has repeats=true', async () => {
    await expect(
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reminder',
        },
        trigger: {
          type: 'date',
          date: Date.now() + 15_000,
          repeats: true as unknown as false,
        },
      }),
    ).rejects.toMatchObject({
      code: 'ERR_INVALID_ARGUMENT',
    })
  })

  it('returns last notification response from native module', async () => {
    const response = sampleNotificationResponse()

    installNativeModule({
      getLastNotificationResponse: cb => cb(ok(response)),
    })

    await expect(Notifications.getLastNotificationResponseAsync()).resolves.toEqual(response)
  })

  it('returns provider unconfigured error from native token request', async () => {
    installNativeModule({
      getPushToken: (_provider, cb) => {
        cb({
          ok: false,
          error: {
            code: 'ERR_PROVIDER_UNCONFIGURED',
            message: 'Provider not configured.',
          },
        })
      },
    })

    await expect(Notifications.getDevicePushTokenAsync()).rejects.toMatchObject({
      code: 'ERR_PROVIDER_UNCONFIGURED',
    })
  })

  it('rejects unsupported provider argument', async () => {
    await expect(
      Notifications.getDevicePushTokenAsync({
        provider: 'apns' as unknown as 'fcm',
      }),
    ).rejects.toMatchObject({
      code: 'ERR_INVALID_ARGUMENT',
    })
  })

  it('dispatches events and cleans up subscriptions idempotently', async () => {
    const stopObservingEvents = vi.fn((cb?: (result: NativeResult<null>) => void) => {
      cb?.(ok(null))
    })

    installNativeModule({
      stopObservingEvents,
    })

    const onReceived = vi.fn()
    const onResponse = vi.fn()

    const receivedSubscription = Notifications.addNotificationReceivedListener(onReceived)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(onResponse)

    await Promise.resolve()

    eventCallback?.({
      type: 'notification_received',
      notification: sampleNotification(),
    })

    eventCallback?.({
      type: 'notification_response',
      response: sampleNotificationResponse(),
    })

    expect(onReceived).toHaveBeenCalledTimes(1)
    expect(onResponse).toHaveBeenCalledTimes(1)

    receivedSubscription.remove()
    receivedSubscription.remove()
    Notifications.removeNotificationSubscription(responseSubscription)
    Notifications.removeNotificationSubscription(responseSubscription)

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(stopObservingEvents).toHaveBeenCalledTimes(1)
  })

  it('handles nested event payload format from native module', async () => {
    const onReceived = vi.fn()
    const subscription = Notifications.addNotificationReceivedListener(onReceived)

    await Promise.resolve()

    eventCallback?.({
      event: {
        type: 'notification_received',
        notification: sampleNotification(),
      },
    })

    expect(onReceived).toHaveBeenCalledTimes(1)

    subscription.remove()
  })

  it('ignores malformed event payloads without crashing listeners', async () => {
    const onReceived = vi.fn()
    const subscription = Notifications.addNotificationReceivedListener(onReceived)

    await Promise.resolve()

    eventCallback?.({
      foo: 'bar',
    })

    eventCallback?.({
      event: {
        type: 'notification_received',
      },
    })

    expect(onReceived).not.toHaveBeenCalled()

    subscription.remove()
  })

  it('uses runOnBackground when called from main thread', async () => {
    ;(globalThis as { __MAIN_THREAD__?: boolean }).__MAIN_THREAD__ = true

    await Notifications.getPermissionsAsync()

    expect(runOnBackgroundMock).toHaveBeenCalled()
  })
})
