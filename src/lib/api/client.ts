import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toApiError } from '@/lib/api/api-error'
import { recordServerDate } from '@/lib/time/server-clock'
import { apiBaseUrl } from '@/lib/env'

/**
 * The one Axios instance for the NextOwn API (PRD §4.4).
 * Components never call it directly: they use TanStack Query hooks in features/<domain>/api.
 */
export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true, // HttpOnly session cookie; no tokens in JS
  timeout: 15_000,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  config.headers.set('X-Request-ID', crypto.randomUUID())
  return config
})

let authExpiredHandler: (() => void) | null = null

/**
 * Called when a member request comes back 401: the session ended on the server (PRD §4.4). The session check
 * itself (`GET /me`) and the sign-in endpoints answer 401 as a normal "signed out", so they don't count.
 */
export function onAuthExpired(handler: () => void) {
  authExpiredHandler = handler
  return () => {
    if (authExpiredHandler === handler) authExpiredHandler = null
  }
}

const isSessionProbe = (config?: InternalAxiosRequestConfig) =>
  config?.url?.startsWith('/auth/') || (config?.url === '/me' && config.method === 'get')

apiClient.interceptors.response.use(
  (response) => {
    recordServerDate(response.headers['date'] as string | undefined)
    return response
  },
  (error: unknown) => {
    const apiError = toApiError(error)
    if (apiError.status === 401 && !isSessionProbe(isAxiosError(error) ? error.config : undefined)) {
      authExpiredHandler?.()
    }
    return Promise.reject(apiError)
  },
)

/** Header for transaction-changing writes. Create the key once per user intent and reuse it on retries (PRD §7.4). */
export function idempotencyHeaders(idempotencyKey: string) {
  return { 'Idempotency-Key': idempotencyKey }
}
