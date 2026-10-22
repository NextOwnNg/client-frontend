import { describe, expect, it } from 'vitest'
import { isApiError } from '@/lib/api/api-error'
import { apiClient } from '@/lib/api/client'
import type { ListingSummary, Paginated, RuntimeConfig } from '@/types/api'

describe('mock API', () => {
  it('serves runtime config with mock categories and pilot defaults', async () => {
    const { data } = await apiClient.get<RuntimeConfig>('/config')

    expect(data.categories.map((c) => c.id)).toEqual(['phones', 'laptops', 'gaming', 'home'])
    expect(data.offerLifetimeHours).toBe(72)
    expect(data.quickSellOptionsHours).toEqual([24, 48, 72, 168])
    expect(data.photoLimits).toEqual({ min: 1, max: 8 })
  })

  it('filters listings by category and marks every one as sample data', async () => {
    const { data } = await apiClient.get<Paginated<ListingSummary>>('/listings', { params: { category: 'phones' } })

    expect(data.items.length).toBeGreaterThan(0)
    expect(data.items.every((l) => l.categoryId === 'phones')).toBe(true)
    expect(data.items.every((l) => l.sample)).toBe(true)
  })

  it('filters listings by trade mode and urgency', async () => {
    const swaps = await apiClient.get<Paginated<ListingSummary>>('/listings', { params: { mode: 'SWAP' } })
    const urgent = await apiClient.get<Paginated<ListingSummary>>('/listings', { params: { urgent: 'true' } })

    expect(swaps.data.items.every((l) => l.acceptedModes.includes('SWAP'))).toBe(true)
    expect(urgent.data.items.length).toBeGreaterThan(0)
    expect(urgent.data.items.every((l) => l.urgencyEndsAt)).toBe(true)
  })

  it('returns a not-found error for an unknown listing', async () => {
    const error = await apiClient.get('/listings/does-not-exist').catch((e: unknown) => e)

    expect(isApiError(error) && error.status).toBe(404)
    expect(isApiError(error) && error.code).toBe('NOT_FOUND')
  })
})
