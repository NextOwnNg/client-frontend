import { describe, expect, it } from 'vitest'
import { isApiError } from '@/lib/api/api-error'
import { apiClient } from '@/lib/api/client'
import type { ListingDetail, ListingSuggestion, ListingSummary, Paginated, RuntimeConfig } from '@/types/api'

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

  it('combines several trade modes, conditions and a naira price range', async () => {
    const { data } = await apiClient.get<Paginated<ListingSummary>>('/listings', {
      params: { mode: 'CASH,SWAP', condition: 'GOOD,LIKE_NEW', price_min: 200000, price_max: 400000, sort: 'recent' },
    })

    expect(data.items.length).toBeGreaterThan(0)
    for (const l of data.items) {
      expect(['GOOD', 'LIKE_NEW']).toContain(l.condition)
      // A price range only matches listings that have a price
      expect(l.askingKobo).not.toBeNull()
      expect(l.askingKobo!).toBeGreaterThanOrEqual(200_000_00)
      expect(l.askingKobo!).toBeLessThanOrEqual(400_000_00)
    }
    const times = data.items.map((l) => Date.parse(l.publishedAt))
    expect([...times].sort((a, b) => b - a)).toEqual(times)
  })

  it('treats Quick Sell as a mode alongside cash and swap', async () => {
    const { data } = await apiClient.get<Paginated<ListingSummary>>('/listings', { params: { mode: 'QUICK_SELL' } })

    expect(data.items.length).toBeGreaterThan(0)
    expect(data.items.every((l) => l.urgencyEndsAt)).toBe(true)
  })

  it('serves full detail with several photos, defects and the public seller', async () => {
    const { data } = await apiClient.get<ListingDetail>('/listings/iphone-12-pro-128gb')

    expect(data.images.length).toBeGreaterThanOrEqual(2)
    expect(data.images[0]?.url).toBe(data.cover.url)
    expect(data.defects.length).toBeGreaterThan(0)
    expect(data.seller.displayName).toBeTruthy()
    expect(data.description).toBeTruthy()
  })

  it('serves detail for unavailable listings so the page can say so', async () => {
    const reserved = await apiClient.get<ListingDetail>('/listings/xbox-series-x')
    const closed = await apiClient.get<ListingDetail>('/listings/ipad-32gb-older')

    expect(reserved.data.status).toBe('RESERVED')
    expect(closed.data.status).toBe('CLOSED')
  })

  it('strips a removed listing to a generic shell with no photos or seller', async () => {
    const { data } = await apiClient.get<ListingDetail>('/listings/removed-sample-listing')

    expect(data.status).toBe('REMOVED')
    expect(data.images).toEqual([])
    expect(data.description).toBe('')
    expect(data.seller.displayName).toBe('')
  })

  it('never exposes a phone number or address in public detail', async () => {
    const { data } = await apiClient.get<ListingDetail>('/listings/iphone-12-pro-128gb')
    const json = JSON.stringify(data).toLowerCase()

    expect(json).not.toMatch(/phone"\s*:\s*"|address|\+234|street/)
  })

  it('suggests matching titles and categories for a search', async () => {
    const { data } = await apiClient.get<ListingSuggestion[]>('/listings/suggest', { params: { q: 'mac' } })

    expect(data.length).toBeGreaterThan(0)
    expect(data.length).toBeLessThanOrEqual(6)
    expect(data.some((s) => s.kind === 'query' && s.label.toLowerCase().includes('mac'))).toBe(true)
  })
})
