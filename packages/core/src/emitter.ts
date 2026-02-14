import {
  startObservingNativeEvents,
  stopObservingNativeEvents,
  type NativeEventListener,
} from './nativeBridge'
import type {
  Notification,
  NotificationResponse,
  NotificationSubscription,
} from './types'

type NotificationReceivedListener = (notification: Notification) => void
type NotificationResponseListener = (response: NotificationResponse) => void

const notificationReceivedListeners = new Map<string, NotificationReceivedListener>()
const notificationResponseListeners = new Map<string, NotificationResponseListener>()

let listenerIdCounter = 0
let started = false
let startPromise: Promise<void> | null = null
let stopPromise: Promise<void> | null = null

function getNextListenerId(): string {
  listenerIdCounter += 1
  return `notification-subscription-${listenerIdCounter}`
}

function hasActiveListeners(): boolean {
  return notificationReceivedListeners.size > 0 || notificationResponseListeners.size > 0
}

function runListenerSafely<T>(listener: (payload: T) => void, payload: T): void {
  try {
    listener(payload)
  } catch (error) {
    console.warn('[lynx-notifications] listener callback threw an error', error)
  }
}

const handleNativeEvent: NativeEventListener = event => {
  if (event.type === 'notification_received') {
    for (const listener of notificationReceivedListeners.values()) {
      runListenerSafely(listener, event.notification)
    }
    return
  }

  if (event.type === 'notification_response') {
    for (const listener of notificationResponseListeners.values()) {
      runListenerSafely(listener, event.response)
    }
  }
}

async function ensureNativeObserverStarted(): Promise<void> {
  if (started) {
    return
  }

  if (startPromise) {
    await startPromise
    return
  }

  startPromise = startObservingNativeEvents(handleNativeEvent)
    .then(() => {
      started = true
      if (!hasActiveListeners()) {
        void stopNativeObserverIfIdle()
      }
    })
    .catch(error => {
      console.warn('[lynx-notifications] failed to start native event observer', error)
      throw error
    })
    .finally(() => {
      startPromise = null
    })

  await startPromise
}

async function stopNativeObserverIfIdle(): Promise<void> {
  if (!started || hasActiveListeners()) {
    return
  }

  if (stopPromise) {
    await stopPromise
    return
  }

  stopPromise = stopObservingNativeEvents()
    .catch(error => {
      console.warn('[lynx-notifications] failed to stop native event observer', error)
    })
    .finally(() => {
      started = false
      stopPromise = null
    })

  await stopPromise
}

function removeSubscriptionById(id: string): void {
  const removed =
    notificationReceivedListeners.delete(id) ||
    notificationResponseListeners.delete(id)

  if (!removed) {
    return
  }

  void stopNativeObserverIfIdle()
}

function buildSubscription(id: string): NotificationSubscription {
  return {
    id,
    remove: () => {
      removeSubscriptionById(id)
    },
  }
}

export function addNotificationReceivedListener(
  listener: (notification: Notification) => void,
): NotificationSubscription {
  const id = getNextListenerId()
  notificationReceivedListeners.set(id, listener)
  void ensureNativeObserverStarted()
  return buildSubscription(id)
}

export function addNotificationResponseReceivedListener(
  listener: (response: NotificationResponse) => void,
): NotificationSubscription {
  const id = getNextListenerId()
  notificationResponseListeners.set(id, listener)
  void ensureNativeObserverStarted()
  return buildSubscription(id)
}

export function removeNotificationSubscription(subscription: NotificationSubscription): void {
  if (!subscription || typeof subscription.id !== 'string') {
    return
  }

  removeSubscriptionById(subscription.id)
}
