import axios from 'axios'
import { toApiError } from '@/lib/api/api-error'
import { recordServerDate } from '@/lib/time/server-clock'

/**
 * The one Axios instance for the NextOwn API (PRD §4.4).
 * Components never call it directly: they use TanStack Query hooks in features/<domain>/api.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // HttpOnly session cookie; no tokens in JS
  timeout: 15_000,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  config.headers.set('X-Request-ID', crypto.randomUUID())
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    recordServerDate(response.headers['date'] as string | undefined)
    return response
  },
  (error: unknown) => Promise.reject(toApiError(error)),
)

/** Header for transaction-changing writes. Create the key once per user intent and reuse it on retries (PRD §7.4). */
export function idempotencyHeaders(idempotencyKey: string) {
  return { 'Idempotency-Key': idempotencyKey }
}
