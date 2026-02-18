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
const MODULE_NAME_ALIASES = ['LynxNotificationModule']
declare const NativeModules: Record<string, unknown> | undefined

type NativeMethod<T> = (cb: (...result: unknown[]) => void) => void

type GlobalWithNativeModules = {
  NativeModules?: unknown
}

type MapLikeValue = Record<string, unknown> & {
  get?: (key: string) => unknown
  getString?: (key: string) => unknown
  getBoolean?: (key: string) => unknown
  getMap?: (key: string) => unknown
  getArray?: (key: string) => unknown
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as Record<string, unknown>
}

function readProperty(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as MapLikeValue
  let encounteredNull = false

  if (Object.prototype.hasOwnProperty.call(candidate, key) || key in candidate) {
    const directValue = candidate[key]
    if (typeof directValue !== 'undefined' && directValue !== null) {
      return directValue
    }
    if (directValue === null) {
      encounteredNull = true
    }
  }

  try {
    if (typeof candidate.get === 'function') {
      const result = candidate.get(key)
      if (typeof result !== 'undefined' && result !== null) {
        return result
      }
      if (result === null) {
        encounteredNull = true
      }
    }
  } catch {}

  const mapKeys = new Set(['data', 'error', 'notification', 'response', 'token', 'event', 'request', 'content', 'trigger'])
  if (mapKeys.has(key)) {
    try {
      if (typeof candidate.getMap === 'function') {
        const result = candidate.getMap(key)
        if (typeof result !== 'undefined' && result !== null) {
          return result
        }
        if (result === null) {
          encounteredNull = true
        }
      }
    } catch {}
  }

  try {
    if (typeof candidate.getString === 'function') {
      const result = candidate.getString(key)
      if (typeof result !== 'undefined' && result !== null) {
        return result
      }
      if (result === null) {
        encounteredNull = true
      }
    }
  } catch {}

  try {
    if (typeof candidate.getBoolean === 'function') {
      const result = candidate.getBoolean(key)
      if (typeof result !== 'undefined' && result !== null) {
        return result
      }
      if (result === null) {
        encounteredNull = true
      }
    }
  } catch {}

  try {
    if (typeof candidate.getArray === 'function') {
      const result = candidate.getArray(key)
      if (typeof result !== 'undefined' && result !== null) {
        return result
      }
      if (result === null) {
        encounteredNull = true
      }
    }
  } catch {}

  return encounteredNull ? null : undefined
}

function describeValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'undefined') {
    return 'undefined'
  }

  if (Array.isArray(value)) {
    return `array(len=${value.length})`
  }

  if (typeof value !== 'object') {
    return `${typeof value}(${String(value)})`
  }

  const candidate = value as MapLikeValue
  const keys = Object.keys(candidate)
  const ctor = (value as { constructor?: { name?: string } }).constructor?.name
  const mapLikeHints = [
    typeof candidate.get === 'function' ? 'get()' : null,
    typeof candidate.getMap === 'function' ? 'getMap()' : null,
    typeof candidate.getString === 'function' ? 'getString()' : null,
    typeof candidate.getBoolean === 'function' ? 'getBoolean()' : null,
  ].filter(Boolean)

  return `object(${ctor ?? 'unknown'} keys=[${keys.slice(0, 8).join(', ')}]${mapLikeHints.length > 0 ? ` mapLike=${mapLikeHints.join(',')}` : ''})`
}

function readNativeModulesFromGlobalThis(): Record<string, unknown> | null {
  const globalObject = globalThis as GlobalWithNativeModules
  return asRecord(globalObject.NativeModules)
}

function readNativeModulesFromRuntimeIdentifier(): Record<string, unknown> | null {
  if (typeof NativeModules === 'undefined') {
    return null
  }

  return asRecord(NativeModules)
}

function findModuleCandidate(modules: Record<string, unknown>): unknown {
  if (typeof (modules as MapLikeValue).get === 'function') {
    const getter = (modules as { get: (key: string) => unknown }).get
    for (const name of [MODULE_NAME, ...MODULE_NAME_ALIASES]) {
      try {
        const value = getter(name)
        if (value) {
          return value
        }
      } catch {}
    }
  }

  const byExactName = modules[MODULE_NAME]
  if (byExactName) {
    return byExactName
  }

  for (const alias of MODULE_NAME_ALIASES) {
    const byAlias = modules[alias]
    if (byAlias) {
      return byAlias
    }
  }

  const targetLower = MODULE_NAME.toLowerCase()
  for (const [name, value] of Object.entries(modules)) {
    if (name.toLowerCase() === targetLower) {
      return value
    }
  }

  return null
}

function getNativeModule(): NativeNotificationsModule {
  const nativeModuleSources = [
    readNativeModulesFromGlobalThis(),
    readNativeModulesFromRuntimeIdentifier(),
  ].filter((source): source is Record<string, unknown> => source !== null)

  for (const source of nativeModuleSources) {
    const candidate = findModuleCandidate(source)
    if (candidate && typeof candidate === 'object') {
      return candidate as NativeNotificationsModule
    }
  }

  const availableModuleNames = Array.from(
    new Set(nativeModuleSources.flatMap(source => Object.keys(source))),
  )

  throw new NotificationsError(
    'ERR_NOTIFICATIONS_UNAVAILABLE',
    availableModuleNames.length > 0
      ? `Native module "${MODULE_NAME}" is not available. Found modules: ${availableModuleNames.join(', ')}.`
      : `Native module "${MODULE_NAME}" is not available.`,
  )
}

function isNativeResult<T>(payload: unknown): payload is NativeResult<T> {
  return typeof readProperty(payload, 'ok') === 'boolean'
}

function unwrapNativeResult<T>(payload: NativeResult<T> | T): T {
  const ok = readProperty(payload, 'ok')
  if (typeof ok !== 'boolean') {
    return payload as T
  }

  if (ok) {
    return readProperty(payload, 'data') as T
  }

  throw toNotificationsError(readProperty(payload, 'error'))
}

function extractCallbackPayload(args: unknown[]): unknown {
  if (args.length === 0) {
    return undefined
  }

  if (args.length === 1) {
    return args[0]
  }

  const nativeResultArg = args.find(arg => isNativeResult(arg))
  if (typeof nativeResultArg !== 'undefined') {
    return nativeResultArg
  }

  const objectArg = args.find(arg => !!arg && typeof arg === 'object')
  if (typeof objectArg !== 'undefined') {
    return objectArg
  }

  const first = args[0]
  const second = args[1]

  if ((first === null || typeof first === 'undefined') && typeof second !== 'undefined') {
    return second
  }

  return args[args.length - 1]
}

function toValidPermissions(value: unknown, methodName: string): NotificationPermissions {
  const status = readProperty(value, 'status')
  const granted = readProperty(value, 'granted')
  const canAskAgain = readProperty(value, 'canAskAgain')

  if (
    (status !== 'granted' && status !== 'denied' && status !== 'undetermined')
    || typeof granted !== 'boolean'
    || typeof canAskAgain !== 'boolean'
  ) {
    throw new NotificationsError(
      'ERR_NATIVE_FAILURE',
      `Native ${methodName} returned invalid permissions payload (${describeValue(value)}).`,
    )
  }

  return {
    status,
    granted,
    canAskAgain,
  }
}

function toValidPushToken(value: unknown): PushToken {
  const type = readProperty(value, 'type')
  const data = readProperty(value, 'data')

  if ((type !== 'fcm' && type !== 'native') || typeof data !== 'string' || data.length === 0) {
    throw new NotificationsError(
      'ERR_NATIVE_FAILURE',
      `Native getPushToken returned invalid token payload (${describeValue(value)}).`,
    )
  }

  return {
    type,
    data,
  }
}

async function callNativeMethod<T>(executor: (module: NativeNotificationsModule, cb: (...result: unknown[]) => void) => void): Promise<T> {
  return runOnBackgroundIfNeeded(async () => {
    const module = getNativeModule()

    return new Promise<T>((resolve, reject) => {
      try {
        executor(module, (...args) => {
          try {
            const payload = extractCallbackPayload(args)
            resolve(unwrapNativeResult(payload as NativeResult<T> | T))
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

async function callNativeVoid(executor: (module: NativeNotificationsModule, cb: (...result: unknown[]) => void) => void): Promise<void> {
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
  const result = await callNativeMethod((module, cb) => {
    const method = ensureMethod(module, 'getPermissions')
    ;(method as NativeMethod<NotificationPermissions>)(cb)
  })

  return toValidPermissions(result, 'getPermissions')
}

export async function requestPermissionsFromNative(): Promise<NotificationPermissions> {
  const result = await callNativeMethod((module, cb) => {
    const method = ensureMethod(module, 'requestPermissions')
    ;(method as NativeMethod<NotificationPermissions>)(cb)
  })

  return toValidPermissions(result, 'requestPermissions')
}

export async function getPushTokenFromNative(provider: PushProvider): Promise<PushToken> {
  const result = await callNativeMethod((module, cb) => {
    const method = ensureMethod(module, 'getPushToken')
    method(provider, cb)
  })

  return toValidPushToken(result)
}

export async function scheduleNotificationFromNative(request: NotificationRequestInput): Promise<string> {
  const result = await callNativeMethod<string | { id: string }>((module, cb) => {
    const method = ensureMethod(module, 'scheduleNotification')
    method(request, cb)
  })

  if (typeof result === 'string') {
    return result
  }

  const id = readProperty(result, 'id')
  if (typeof id === 'string') {
    return id
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

function parseNativeEvent(payload: unknown): NativeNotificationEvent | null {
  const directType = readProperty(payload, 'type')
  const eventPayload = typeof directType === 'string'
    ? payload
    : readProperty(payload, 'event')
  const eventType = readProperty(eventPayload, 'type')

  if (!eventPayload || typeof eventType !== 'string') {
    return null
  }

  if (eventType === 'notification_received') {
    const notification = readProperty(eventPayload, 'notification') as Notification | undefined
    if (notification) {
      return {
        type: 'notification_received',
        notification,
      }
    }
  }

  if (eventType === 'notification_response') {
    const response = readProperty(eventPayload, 'response') as NotificationResponse | undefined
    if (response) {
      return {
        type: 'notification_response',
        response,
      }
    }
  }

  if (eventType === 'token_refreshed') {
    const token = readProperty(eventPayload, 'token') as PushToken | undefined
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

    method((...args) => {
      const payload = extractCallbackPayload(args)

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
        method((...args) => {
          if (settled) {
            return
          }
          settled = true

          const result = extractCallbackPayload(args)

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
