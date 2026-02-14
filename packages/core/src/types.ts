export type PermissionStatus = 'granted' | 'denied' | 'undetermined'

export interface NotificationPermissions {
  status: PermissionStatus
  granted: boolean
  canAskAgain: boolean
}

export type PushProvider = 'fcm'

export interface PushToken {
  type: PushProvider | 'native'
  data: string
}

export interface NotificationContentInput {
  title?: string
  subtitle?: string
  body?: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  badge?: number
}

export type NotificationTriggerInput =
  | { type: 'date'; date: number; repeats?: false }
  | { type: 'timeInterval'; seconds: number; repeats?: boolean }
  | null

export interface NotificationRequestInput {
  content: NotificationContentInput
  trigger: NotificationTriggerInput
}

export interface Notification {
  id: string
  date: number
  request: NotificationRequestInput
}

export interface NotificationResponse {
  notification: Notification
  actionIdentifier: string
}

export interface NotificationSubscription {
  id: string
  remove(): void
}

export type NotificationsErrorCode =
  | 'ERR_NOTIFICATIONS_UNAVAILABLE'
  | 'ERR_PERMISSION_DENIED'
  | 'ERR_PROVIDER_UNCONFIGURED'
  | 'ERR_INVALID_ARGUMENT'
  | 'ERR_NATIVE_FAILURE'

export interface NativeErrorPayload {
  code: string
  message: string
}

export type NativeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: NativeErrorPayload }

export type NativeNotificationEvent =
  | {
    type: 'notification_received'
    notification: Notification
  }
  | {
    type: 'notification_response'
    response: NotificationResponse
  }
  | {
    type: 'token_refreshed'
    token: PushToken
  }

export interface NativeNotificationsModule {
  getPermissions(cb: (result: NativeResult<NotificationPermissions>) => void): void
  requestPermissions(cb: (result: NativeResult<NotificationPermissions>) => void): void
  getPushToken(provider: PushProvider, cb: (result: NativeResult<PushToken>) => void): void
  scheduleNotification(
    request: NotificationRequestInput,
    cb: (result: NativeResult<string | { id: string }>) => void,
  ): void
  cancelScheduledNotification(id: string, cb: (result: NativeResult<null>) => void): void
  cancelAllScheduledNotifications(cb: (result: NativeResult<null>) => void): void
  getLastNotificationResponse(cb: (result: NativeResult<NotificationResponse | null>) => void): void
  startObservingEvents(cb: (payload: unknown) => void): void
  stopObservingEvents?: (cb?: (result: NativeResult<null>) => void) => void
}
