import { isAxiosError } from 'axios'

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'cancelled'

/** Stable error codes from the API contract (PRD §9.1). */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'ITEM_UNAVAILABLE'
  | 'STALE_OFFER_VERSION'
  | 'OFFER_EXPIRED'
  | 'RATE_LIMITED'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'SERVER_ERROR'
  | 'UNKNOWN'

type ApiErrorBody = {
  code?: string
  message?: string
  field_errors?: Record<string, string>
}

/** The single error shape every API failure is normalised into (PRD §4.4). */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly code: ApiErrorCode | (string & {})
  readonly fieldErrors?: Record<string, string>
  readonly retryAfterSeconds?: number
  readonly requestId?: string

  constructor(init: {
    kind: ApiErrorKind
    message: string
    code: ApiError['code']
    status?: number
    fieldErrors?: Record<string, string>
    retryAfterSeconds?: number
    requestId?: string
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.kind = init.kind
    this.code = init.code
    this.status = init.status
    this.fieldErrors = init.fieldErrors
    this.retryAfterSeconds = init.retryAfterSeconds
    this.requestId = init.requestId
  }

  /** A timed-out or dropped write may have succeeded on the server: read state before retrying (PRD §7.4). */
  get isOutcomeUnknown() {
    return this.kind === 'timeout' || this.kind === 'network' || (this.status !== undefined && this.status >= 500)
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error

  if (!isAxiosError<ApiErrorBody>(error)) {
    return new ApiError({ kind: 'network', code: 'UNKNOWN', message: 'Unexpected error' })
  }

  const requestId = error.config?.headers?.['X-Request-ID'] as string | undefined

  if (error.code === 'ERR_CANCELED') {
    return new ApiError({ kind: 'cancelled', code: 'UNKNOWN', message: 'Request cancelled', requestId })
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError({ kind: 'timeout', code: 'UNKNOWN', message: 'Request timed out', requestId })
  }
  if (!error.response) {
    return new ApiError({ kind: 'network', code: 'UNKNOWN', message: 'Network error', requestId })
  }

  const { status, data, headers } = error.response
  const retryAfter = Number(headers['retry-after'])

  return new ApiError({
    kind: 'http',
    status,
    code: data?.code ?? (status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN'),
    message: data?.message ?? `Request failed with status ${status}`,
    fieldErrors: data?.field_errors,
    retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : undefined,
    requestId,
  })
}
