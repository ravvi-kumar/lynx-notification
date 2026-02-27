import { useCallback, useEffect, useState } from '@lynx-js/react'
import * as Notifications from '@lynx-notifications/core'
import type {
  NotificationPermissions,
  NotificationResponse,
} from '@lynx-notifications/core'

import './App.css'

const MAX_LOG_ENTRIES = 200
const MAX_VISIBLE_LOG_ENTRIES = 14
declare const NativeModules: Record<string, unknown> | undefined

function ignoreRuntimeError(error: unknown): void {
  void error
}

function toErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return String(error ?? 'Unknown error')
  }

  const candidate = error as {
    code?: unknown
    message?: unknown
  }

  const code = typeof candidate.code === 'string' ? candidate.code : null
  const message = typeof candidate.message === 'string' ? candidate.message : String(error)

  return code ? `${code}: ${message}` : message
}

function toDisplayErrorMessage(error: unknown): string {
  const raw = toErrorMessage(error)
  if (!raw.includes('ERR_NOTIFICATIONS_UNAVAILABLE')) {
    return raw
  }

  return [
    'ERR_NOTIFICATIONS_UNAVAILABLE: LynxNotificationsModule is not registered in your native runtime.',
    'Stock Lynx Explorer builds do not include this custom module.',
    'Use a custom-built Lynx Explorer (with module registration) or your own native host app.',
    `Native details: ${raw}`,
  ].join(' ')
}

type ClipboardModuleLike = {
  setString?: (value: string) => void
  setClipboardText?: (value: string) => void
}

type NativeModulesLike = Record<string, unknown> & {
  get?: (key: string) => unknown
}

function findNativeModuleByName(modules: unknown, names: string[]): Record<string, unknown> | null {
  if (!modules || typeof modules !== 'object') {
    return null
  }

  const candidate = modules as NativeModulesLike
  const getter = typeof candidate.get === 'function'
    ? candidate.get
    : null

  for (const name of names) {
    try {
      const direct = candidate[name]
      if (direct && typeof direct === 'object') {
        return direct as Record<string, unknown>
      }
    } catch (error) {
      ignoreRuntimeError(error)
    }

    if (getter) {
      try {
        const fromGet = getter(name)
        if (fromGet && typeof fromGet === 'object') {
          return fromGet as Record<string, unknown>
        }
      } catch (error) {
        ignoreRuntimeError(error)
      }
    }
  }

  return null
}

function describeNativeModulesValue(label: string, value: unknown): string {
  if (!value || typeof value !== 'object') {
    return `${label}=<missing>`
  }

  const candidate = value as NativeModulesLike
  const keys = Object.keys(candidate)
  const ctorName = (value as { constructor?: { name?: string } }).constructor?.name ?? 'unknown'
  const hasGetter = typeof candidate.get === 'function'
  const hasDirectModule = !!candidate.LynxNotificationsModule || !!candidate.LynxNotificationModule

  let hasGetterModule = false
  if (hasGetter) {
    try {
      hasGetterModule = Boolean(candidate.get?.('LynxNotificationsModule') ?? candidate.get?.('LynxNotificationModule'))
    } catch (error) {
      ignoreRuntimeError(error)
    }
  }

  const keySummary = keys.length > 0 ? keys.slice(0, 10).join(',') : '<none>'
  return `${label}=object(${ctorName}) keys=${keySummary} hasGet=${hasGetter} hasModuleDirect=${hasDirectModule} hasModuleGet=${hasGetterModule}`
}

function getNativeModulesDebugInfo(): string {
  const fromGlobalThis = (globalThis as { NativeModules?: unknown }).NativeModules
  const runtimeNativeModules = (() => {
    try {
      if (typeof NativeModules === 'undefined') {
        return undefined
      }
      return NativeModules
    } catch {
      return '<inaccessible>'
    }
  })()

  return [
    describeNativeModulesValue('globalThis.NativeModules', fromGlobalThis),
    typeof runtimeNativeModules === 'string'
      ? `NativeModules=${runtimeNativeModules}`
      : describeNativeModulesValue('NativeModules', runtimeNativeModules),
  ].join(' | ')
}

async function writeTextToClipboard(text: string): Promise<boolean> {
  const maybeNavigator = (globalThis as {
    navigator?: {
      clipboard?: {
        writeText?: (value: string) => Promise<void>
      }
    }
  }).navigator

  if (maybeNavigator?.clipboard?.writeText) {
    try {
      await maybeNavigator.clipboard.writeText(text)
      return true
    } catch (error) {
      ignoreRuntimeError(error)
    }
  }

  const runtimeModules = (() => {
    try {
      if (typeof NativeModules !== 'undefined' && NativeModules && typeof NativeModules === 'object') {
        return NativeModules as Record<string, unknown>
      }
    } catch (error) {
      ignoreRuntimeError(error)
    }

    const fromGlobalThis = (globalThis as { NativeModules?: unknown }).NativeModules
    if (fromGlobalThis && typeof fromGlobalThis === 'object') {
      return fromGlobalThis as Record<string, unknown>
    }

    return null
  })()

  if (runtimeModules) {
    const clipboardModule = findNativeModuleByName(
      runtimeModules,
      ['LynxClipboardModule', 'ClipboardModule'],
    ) as ClipboardModuleLike | null

    if (clipboardModule && typeof clipboardModule.setString === 'function') {
      clipboardModule.setString(text)
      return true
    }
    if (clipboardModule && typeof clipboardModule.setClipboardText === 'function') {
      clipboardModule.setClipboardText(text)
      return true
    }
  }

  return false
}

function buildDiagnosticsReport(params: {
  status: string
  nativeReady: boolean | null
  permissions: NotificationPermissions | null
  pushToken: string | null
  lastScheduledId: string | null
  lastResponse: NotificationResponse | null
  errorMessage: string | null
  logs: string[]
}): string {
  const headerLines = [
    '=== Lynx Notifications Diagnostics ===',
    `generatedAt=${new Date().toISOString()}`,
    `status=${params.status}`,
    `nativeModule=${params.nativeReady === null ? 'checking' : params.nativeReady ? 'available' : 'unavailable'}`,
    `permissions=${params.permissions ? JSON.stringify(params.permissions) : 'null'}`,
    `pushToken=${params.pushToken ?? 'null'}`,
    `lastScheduledId=${params.lastScheduledId ?? 'null'}`,
    `lastResponse=${params.lastResponse ? JSON.stringify(params.lastResponse) : 'null'}`,
    `lastError=${params.errorMessage ?? 'null'}`,
    `nativeModulesDebug=${getNativeModulesDebugInfo()}`,
    '',
    'EventLog:',
  ]

  const entries = params.logs.length > 0 ? params.logs : ['<empty>']
  return [...headerLines, ...entries].join('\n')
}

function describeUnknownValue(value: unknown): string {
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

  const candidate = value as NativeModulesLike
  const ctorName = (value as { constructor?: { name?: string } }).constructor?.name ?? 'unknown'
  const keys = Object.keys(candidate)
  const hasGetter = typeof candidate.get === 'function'

  return `object(${ctorName}) keys=${keys.length > 0 ? keys.slice(0, 8).join(',') : '<none>'} hasGet=${hasGetter}`
}

async function probeRawNativeGetPermissions(): Promise<string> {
  const modules = (() => {
    try {
      if (typeof NativeModules !== 'undefined') {
        return NativeModules
      }
    } catch (error) {
      ignoreRuntimeError(error)
    }
    return (globalThis as { NativeModules?: unknown }).NativeModules
  })()

  const module = findNativeModuleByName(modules, ['LynxNotificationsModule', 'LynxNotificationModule'])
  if (!module) {
    return 'Raw native probe: LynxNotificationsModule not found.'
  }

  const getPermissionsMethod = module.getPermissions
  if (typeof getPermissionsMethod !== 'function') {
    return `Raw native probe: getPermissions missing (value=${describeUnknownValue(getPermissionsMethod)}).`
  }

  return new Promise(resolve => {
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) {
        return
      }
      settled = true
      resolve('Raw native probe: callback not invoked within 1500ms.')
    }, 1500)

    try {
      ;(getPermissionsMethod as (cb: (...args: unknown[]) => void) => void)((...args) => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timeout)
        const argsSummary = args.length === 0
          ? 'no args'
          : args
            .map((arg, index) => `arg${index}=${describeUnknownValue(arg)}`)
            .join(' | ')
        resolve(`Raw native probe: callback args(${args.length}) ${argsSummary}`)
      })
    } catch (error) {
      settled = true
      clearTimeout(timeout)
      resolve(`Raw native probe threw: ${toErrorMessage(error)}`)
    }
  })
}

function formatPermissions(permissions: NotificationPermissions | null): string {
  if (!permissions) {
    return 'n/a'
  }

  return `${permissions.status} (granted=${permissions.granted}, canAskAgain=${permissions.canAskAgain})`
}

function formatResponse(response: NotificationResponse | null): string {
  if (!response) {
    return 'n/a'
  }

  return `id=${response.notification.id}, action=${response.actionIdentifier}`
}

function appendLog(
  setLogs: (updater: (current: string[]) => string[]) => void,
  message: string,
): void {
  const now = new Date()
  const timestamp = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  setLogs(current => [`[${timestamp}] ${message}`, ...current].slice(0, MAX_LOG_ENTRIES))
}

export function App(props: {
  onRender?: () => void
}) {
  const [status, setStatus] = useState('Ready')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [nativeReady, setNativeReady] = useState<boolean | null>(null)
  const [permissions, setPermissions] = useState<NotificationPermissions | null>(null)
  const [pushToken, setPushToken] = useState<string | null>(null)
  const [lastScheduledId, setLastScheduledId] = useState<string | null>(null)
  const [lastResponse, setLastResponse] = useState<NotificationResponse | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const pushLog = useCallback((message: string) => {
    appendLog(setLogs, message)
  }, [])

  useEffect(() => {
    console.info('Lynx notifications device test app loaded')
    props.onRender?.()
  }, [props])

  useEffect(() => {
    if (nativeReady !== true) {
      return
    }

    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      pushLog(`notification_received id=${notification.id}`)
    })
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      setLastResponse(response)
      pushLog(`notification_response action=${response.actionIdentifier}`)
    })

    pushLog('JS listeners attached.')

    return () => {
      receivedSubscription.remove()
      responseSubscription.remove()
      Notifications.removeNotificationSubscription(receivedSubscription)
      Notifications.removeNotificationSubscription(responseSubscription)
    }
  }, [nativeReady, pushLog])

  useEffect(() => {
    let active = true
    setStatus('Checking native module...')

    void (async () => {
      try {
        const currentPermissions = await Notifications.getPermissionsAsync()
        if (!active) {
          return
        }

        setNativeReady(true)
        setPermissions(currentPermissions)
        setStatus('Native module ready')
        pushLog(`Native module available. permissions=${currentPermissions.status}`)
      } catch (error) {
        if (!active) {
          return
        }

        const message = toDisplayErrorMessage(error)
        const nativeDebugInfo = getNativeModulesDebugInfo()
        setNativeReady(false)
        setErrorMessage(message)
        setStatus('Native module unavailable')
        pushLog(`Native check failed: ${message}`)
        pushLog(`Native debug: ${nativeDebugInfo}`)
        const probeLog = await probeRawNativeGetPermissions()
        pushLog(probeLog)
      }
    })()

    return () => {
      active = false
    }
  }, [pushLog])

  const runAction = useCallback(async (label: string, action: () => Promise<void>) => {
    setStatus(`${label}...`)
    setErrorMessage(null)

    try {
      await action()
      setStatus(`${label} complete`)
    } catch (error) {
      const message = toDisplayErrorMessage(error)
      setErrorMessage(message)
      setStatus(`${label} failed`)
      pushLog(`${label} failed: ${message}`)
    }
  }, [pushLog])

  const onGetPermissions = useCallback(() => {
    void runAction('Get permissions', async () => {
      const value = await Notifications.getPermissionsAsync()
      setPermissions(value)
      pushLog(`Permissions=${value.status}, granted=${value.granted}`)
    })
  }, [pushLog, runAction])

  const onRequestPermissions = useCallback(() => {
    void runAction('Request permissions', async () => {
      const value = await Notifications.requestPermissionsAsync()
      setPermissions(value)
      pushLog(`Request result=${value.status}, granted=${value.granted}`)
    })
  }, [pushLog, runAction])

  const onRegisterPush = useCallback(() => {
    void runAction('Register push token', async () => {
      const token = await Notifications.registerForPushNotificationsAsync()
      setPushToken(token.data)
      pushLog(`Push token fetched. type=${token.type}, length=${token.data.length}`)
    })
  }, [pushLog, runAction])

  const onScheduleLocal = useCallback(() => {
    void runAction('Schedule local (5s)', async () => {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Lynx Notifications',
          body: 'Local smoke test notification fired.',
          sound: 'default',
          data: {
            source: 'src/App.tsx',
            testType: 'local-smoke',
          },
        },
        trigger: {
          type: 'timeInterval',
          seconds: 5,
          repeats: false,
        },
      })

      setLastScheduledId(id)
      pushLog(`Scheduled notification id=${id}`)
    })
  }, [pushLog, runAction])

  const onGetLastResponse = useCallback(() => {
    void runAction('Get last response', async () => {
      const response = await Notifications.getLastNotificationResponseAsync()
      setLastResponse(response)
      pushLog(response ? `Last response id=${response.notification.id}` : 'No last response available.')
    })
  }, [pushLog, runAction])

  const onCancelLast = useCallback(() => {
    void runAction('Cancel last scheduled', async () => {
      if (!lastScheduledId) {
        throw new Error('No scheduled notification id in memory.')
      }

      await Notifications.cancelScheduledNotificationAsync(lastScheduledId)
      pushLog(`Canceled id=${lastScheduledId}`)
      setLastScheduledId(null)
    })
  }, [lastScheduledId, pushLog, runAction])

  const onCancelAll = useCallback(() => {
    void runAction('Cancel all scheduled', async () => {
      await Notifications.cancelAllScheduledNotificationsAsync()
      setLastScheduledId(null)
      pushLog('Canceled all scheduled notifications.')
    })
  }, [pushLog, runAction])

  const onClearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const onCopyLogs = useCallback(() => {
    void runAction('Copy logs', async () => {
      const report = buildDiagnosticsReport({
        status,
        nativeReady,
        permissions,
        pushToken,
        lastScheduledId,
        lastResponse,
        errorMessage,
        logs,
      })

      const copied = await writeTextToClipboard(report)
      if (copied) {
        pushLog(`Copied diagnostics to clipboard (${report.length} chars).`)
        return
      }

      console.info(`[lynx-notifications] diagnostics export\n${report}`)
      pushLog('Clipboard API unavailable. Diagnostics were printed to JS console.')
    })
  }, [
    errorMessage,
    lastResponse,
    lastScheduledId,
    logs,
    nativeReady,
    permissions,
    pushLog,
    pushToken,
    runAction,
    status,
  ])

  return (
    <view className='AppRoot'>
      <view className='Card'>
        <text className='Title'>Lynx Notifications Device Test</text>
        <text className='Subtitle'>
          Use this default app to validate native module integration on your physical device.
        </text>

        <text className='Instruction'>Recommended order:</text>
        <text className='Instruction'>1) Request permissions  2) Register push token  3) Schedule local (5s)</text>

        <text className='StatusText'>Status: {status}</text>
        <text className='StatusText'>Native module: {nativeReady === null ? 'checking' : nativeReady ? 'available' : 'unavailable'}</text>
        <text className='StatusText'>Permissions: {formatPermissions(permissions)}</text>
        <text className='StatusText'>Push token: {pushToken ? `${pushToken.slice(0, 14)}...` : 'n/a'}</text>
        <text className='StatusText'>Last scheduled id: {lastScheduledId ?? 'n/a'}</text>
        <text className='StatusText'>Last response: {formatResponse(lastResponse)}</text>
        {errorMessage ? <text className='ErrorText'>Last error: {errorMessage}</text> : null}

        <view className='ButtonRow'>
          <view className='ActionButton' bindtap={onGetPermissions}><text className='ActionButtonText'>Get Permissions</text></view>
          <view className='ActionButton' bindtap={onRequestPermissions}><text className='ActionButtonText'>Request Permissions</text></view>
        </view>

        <view className='ButtonRow'>
          <view className='ActionButton' bindtap={onRegisterPush}><text className='ActionButtonText'>Register Push</text></view>
          <view className='ActionButton' bindtap={onScheduleLocal}><text className='ActionButtonText'>Schedule Local (5s)</text></view>
        </view>

        <view className='ButtonRow'>
          <view className='ActionButton' bindtap={onGetLastResponse}><text className='ActionButtonText'>Get Last Response</text></view>
          <view className='ActionButton' bindtap={onCancelLast}><text className='ActionButtonText'>Cancel Last</text></view>
        </view>

        <view className='ButtonRow'>
          <view className='ActionButton' bindtap={onCancelAll}><text className='ActionButtonText'>Cancel All</text></view>
          <view className='ActionButton ActionButton--secondary' bindtap={onCopyLogs}><text className='ActionButtonText'>Copy Logs</text></view>
        </view>

        <view className='ButtonRow'>
          <view className='ActionButton ActionButton--secondary' bindtap={onClearLogs}><text className='ActionButtonText'>Clear Logs</text></view>
        </view>

        <text className='LogTitle'>Event / Action Log</text>
        <text className='LogMeta'>Showing latest {Math.min(logs.length, MAX_VISIBLE_LOG_ENTRIES)} of {logs.length} entries</text>
        <view className='LogPanel'>
          {logs.length === 0
            ? <text className='LogEntry'>No events yet.</text>
            : logs.slice(0, MAX_VISIBLE_LOG_ENTRIES).map((entry, index) => (
              <text className='LogEntry' key={`log-${index}-${entry}`}>
                {entry}
              </text>
            ))}
        </view>
      </view>
    </view>
  )
}
