import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/api-error'
import { apiClient } from '@/lib/api/client'
import { server } from '@/test/msw/server'

const url = (path: string) => `${import.meta.env.VITE_API_BASE_URL}${path}`

describe('apiClient', () => {
  it('sends a request ID with every call', async () => {
    let requestId: string | null = null
    server.use(
      http.get(url('/ping'), ({ request }) => {
        requestId = request.headers.get('X-Request-ID')
        return HttpResponse.json({ ok: true })
      }),
    )

    await apiClient.get('/ping')

    expect(requestId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('normalises API errors into ApiError with the stable code', async () => {
    server.use(
      http.post(url('/offers/1/accept'), () =>
        HttpResponse.json({ code: 'ITEM_UNAVAILABLE', message: 'Item is reserved' }, { status: 409 }),
      ),
    )

    const error = await apiClient.post('/offers/1/accept').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'http', status: 409, code: 'ITEM_UNAVAILABLE', isOutcomeUnknown: false })
  })

  it('treats server errors as an unknown outcome', async () => {
    server.use(http.post(url('/offers/1/accept'), () => new HttpResponse(null, { status: 503 })))

    const error = await apiClient.post('/offers/1/accept').catch((e: unknown) => e)

    expect(error).toMatchObject({ code: 'SERVER_ERROR', isOutcomeUnknown: true })
  })

  it('reads Retry-After on rate limiting', async () => {
    server.use(
      http.post(url('/auth/otp/request'), () =>
        HttpResponse.json({ code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '60' } }),
      ),
    )

    const error = await apiClient.post('/auth/otp/request').catch((e: unknown) => e)

    expect(error).toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 60 })
  })
})
