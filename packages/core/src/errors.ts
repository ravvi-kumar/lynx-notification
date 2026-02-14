import type { NativeErrorPayload, NotificationsErrorCode } from './types'

const KNOWN_ERROR_CODES: ReadonlySet<NotificationsErrorCode> = new Set([
  'ERR_NOTIFICATIONS_UNAVAILABLE',
  'ERR_PERMISSION_DENIED',
  'ERR_PROVIDER_UNCONFIGURED',
  'ERR_INVALID_ARGUMENT',
  'ERR_NATIVE_FAILURE',
])

export class NotificationsError extends Error {
  readonly code: NotificationsErrorCode
  readonly nativeCode?: string

  constructor(
    code: NotificationsErrorCode,
    message: string,
    options?: {
      nativeCode?: string
      cause?: unknown
    },
  ) {
    super(message)
    this.name = 'NotificationsError'
    this.code = code
    this.nativeCode = options?.nativeCode
    if (options?.cause !== undefined) {
      ;(this as Error & { cause?: unknown }).cause = options.cause
    }
  }
}

export function isNotificationsErrorCode(code: unknown): code is NotificationsErrorCode {
  return typeof code === 'string' && KNOWN_ERROR_CODES.has(code as NotificationsErrorCode)
}

export function toNotificationsError(
  error: unknown,
  fallbackCode: NotificationsErrorCode = 'ERR_NATIVE_FAILURE',
): NotificationsError {
  if (error instanceof NotificationsError) {
    return error
  }

  if (isNativeErrorPayload(error)) {
    const code = normalizeErrorCode(error.code, fallbackCode)
    return new NotificationsError(code, error.message, {
      nativeCode: error.code,
      cause: error,
    })
  }

  if (error instanceof Error) {
    return new NotificationsError(fallbackCode, error.message, { cause: error })
  }

  if (typeof error === 'string') {
    return new NotificationsError(fallbackCode, error)
  }

  return new NotificationsError(fallbackCode, 'Unknown notifications error', {
    cause: error,
  })
}

function isNativeErrorPayload(value: unknown): value is NativeErrorPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<NativeErrorPayload>
  return typeof candidate.code === 'string' && typeof candidate.message === 'string'
}

function normalizeErrorCode(
  code: string,
  fallbackCode: NotificationsErrorCode,
): NotificationsErrorCode {
  if (isNotificationsErrorCode(code)) {
    return code
  }

  return fallbackCode
}
