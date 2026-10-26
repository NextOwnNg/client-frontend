import { describe, expect, it } from 'vitest'
import { isApiError } from '@/lib/api/api-error'
import { apiClient } from '@/lib/api/client'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { mockListings } from '@/mocks/db/listings'
import type { ListingDetail, ListingSummary, MediaRef, OwnListing, Paginated } from '@/types/api'

const fail = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('Expected the request to fail')
    },
    (e: unknown) => {
      if (!isApiError(e)) throw e
      return e
    },
  )

async function upload(type = 'image/jpeg', bytes = 2_000) {
  const form = new FormData()
  form.append('file', new File([new Uint8Array(bytes)], 'photo', { type }))
  form.append('width', '1600')
  form.append('height', '1200')
  form.append('alt', 'Front of the item')
  return apiClient.post<MediaRef>('/media', form)
}

async function completeDraft() {
  const photo = (await upload()).data
  const { data: draft } = await apiClient.post<OwnListing>('/listings', { title: 'Galaxy S21 · 128GB' })
  const { data } = await apiClient.patch<OwnListing>(`/listings/${draft.id}`, {
    categoryId: 'phones',
    categoryFields: { storage: '128GB', battery: '88' },
    photos: [photo],
    condition: 'GOOD',
    noDefects: true,
    repairs: 'None',
    accessories: 'Box and cable',
    ownershipConfirmed: true,
    modes: ['CASH'],
    askingKobo: 25_000_000,
    areaId: 'central',
  })
  return data
}

describe('mock selling API', () => {
  it('stores an uploaded photo and serves it back', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const { data, status } = await upload()

    expect(status).toBe(201)
    expect(data).toMatchObject({ width: 1600, height: 1200, alt: 'Front of the item' })
    expect((await apiClient.get(data.url.replace(/^.*\/api/, ''), { responseType: 'arraybuffer' })).status).toBe(200)
  })

  it('refuses an unsupported or oversized photo', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)

    expect((await fail(upload('image/gif'))).code).toBe('UNSUPPORTED_FORMAT')
    expect((await fail(upload('image/jpeg', 11 * 1024 * 1024))).code).toBe('FILE_TOO_LARGE')
  })

  it('keeps an incomplete draft and lists it as the owner’s', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const { data: draft } = await apiClient.post<OwnListing>('/listings', { title: 'Headphones' })

    expect(draft.status).toBe('DRAFT')
    const { data: mine } = await apiClient.get<OwnListing[]>('/me/listings')
    expect(mine.find((l) => l.id === draft.id)?.title).toBe('Headphones')
    expect((await fail(apiClient.get(`/listings/${draft.slug}`))).status).toBe(404)
  })

  it('refuses to publish an incomplete draft, naming each missing field', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const { data: draft } = await apiClient.post<OwnListing>('/listings', { title: 'Headphones' })
    const error = await fail(apiClient.post(`/listings/${draft.id}/publish`))

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(Object.keys(error.fieldErrors ?? {})).toEqual(
      expect.arrayContaining(['photos', 'condition', 'defects', 'ownershipConfirmed', 'modes']),
    )
  })

  it('publishes for review, then shows the listing publicly once approved', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const draft = await completeDraft()

    const { data: published } = await apiClient.post<OwnListing>(`/listings/${draft.id}/publish`)
    expect(published.status).toBe('PENDING_REVIEW')
    expect(published.slug).toMatch(/^galaxy-s21-128gb/)

    mockListings.approvePending()
    const { data: results } = await apiClient.get<Paginated<ListingSummary>>('/listings', {
      params: { q: 'galaxy s21' },
    })
    expect(results.items.map((l) => l.id)).toContain(draft.id)
    const { data: detail } = await apiClient.get<ListingDetail>(`/listings/${published.slug}`)
    expect(detail.seller.displayName).toBe('Tolu A.')
    expect(detail.defects).toEqual([])
  })

  it('refuses a second active listing of the same item, pointing at the first', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const first = await completeDraft()
    const { data: live } = await apiClient.post<OwnListing>(`/listings/${first.id}/publish`)
    const second = await completeDraft()

    const error = await fail(apiClient.post(`/listings/${second.id}/publish`))
    expect(error.status).toBe(409)
    expect(error.code).toBe('DUPLICATE_ITEM')
    expect(error.details?.existingSlug).toBe(live.slug)
  })

  it('starts a Quick Sell deadline on publish and renews an expired listing', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    mockListings.publishLive(true)
    const draft = await completeDraft()
    await apiClient.patch(`/listings/${draft.id}`, { quickSell: true, quickSellHours: 48 })

    const { data: live } = await apiClient.post<OwnListing>(`/listings/${draft.id}/publish`)
    expect(live.status).toBe('ACTIVE')
    const hours = (Date.parse(live.urgencyEndsAt!) - Date.now()) / 3_600_000
    expect(Math.round(hours)).toBe(48)

    mockListings.expire(draft.id)
    const { data: renewed } = await apiClient.post<OwnListing>(`/listings/${draft.id}/renew`, { quickSellHours: 24 })
    expect(renewed.status).toBe('ACTIVE')
    expect(Math.round((Date.parse(renewed.urgencyEndsAt!) - Date.now()) / 3_600_000)).toBe(24)
  })

  it('closes a listing and discards a draft', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const { data: mine } = await apiClient.get<OwnListing[]>('/me/listings')
    const active = mine.find((l) => l.status === 'ACTIVE')!

    expect((await apiClient.post<OwnListing>(`/listings/${active.id}/close`)).data.status).toBe('CLOSED')

    const { data: draft } = await apiClient.post<OwnListing>('/listings', { title: 'To discard' })
    await apiClient.delete(`/listings/${draft.id}`)
    expect((await fail(apiClient.get(`/me/listings/${draft.id}`))).status).toBe(404)
  })

  it('edits a published sample listing through the wizard shape', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const { data: own } = await apiClient.get<OwnListing>('/me/listings/l1')

    expect(own).toMatchObject({ title: 'iPhone 12 Pro · 128GB', categoryId: 'phones', ownershipConfirmed: true })
    const { data } = await apiClient.patch<OwnListing>(`/listings/${own.id}`, { askingKobo: 36_000_000 })
    expect(data.askingKobo).toBe(36_000_000)
    expect((await apiClient.get<ListingDetail>(`/listings/${own.slug}`)).data.askingKobo).toBe(36_000_000)
  })

  it('refuses to save an edit that would make a published listing incomplete', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const error = await fail(apiClient.patch('/listings/l1', { askingKobo: 0 }))

    expect(error.fieldErrors?.askingKobo).toBeTruthy()
  })

  it("never lets someone edit another member's listing", async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const mine = await apiClient.get<OwnListing[]>('/me/listings')
    expect(mine.data.every((l) => l.id !== 'l3')).toBe(true)

    expect((await fail(apiClient.patch('/listings/l3', { title: 'Mine now' }))).status).toBe(403)
  })

  it('needs a session for every selling request', async () => {
    expect((await fail(apiClient.get('/me/listings'))).status).toBe(401)
    expect((await fail(apiClient.post('/listings', { title: 'x' }))).status).toBe(401)
  })
})
