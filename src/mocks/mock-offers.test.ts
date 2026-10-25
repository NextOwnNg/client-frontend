import { describe, expect, it } from 'vitest'
import { isApiError } from '@/lib/api/api-error'
import { apiClient, idempotencyHeaders } from '@/lib/api/client'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { mockOffers } from '@/mocks/db/offers'
import type {
  ListingDetail,
  ListingSummary,
  MediaRef,
  NewOffer,
  Offer,
  OfferItemInput,
  Paginated,
  SwapItem,
} from '@/types/api'

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

let keys = 0
const key = () => `test-key-${keys++}`
const send = (offer: NewOffer, idempotencyKey = key()) =>
  apiClient.post<Offer>('/offers', offer, { headers: idempotencyHeaders(idempotencyKey) })
const act = (id: string, action: string, body: object = {}, idempotencyKey = key()) =>
  apiClient.post<Offer>(`/offers/${id}/${action}`, body, { headers: idempotencyHeaders(idempotencyKey) })
const getOffer = async (id: string) => (await apiClient.get<Offer>(`/offers/${id}`)).data
const current = (offer: Offer) => offer.versions.at(-1)!

const cash = (listingId: string, naira: number): NewOffer => ({
  listingId,
  mode: 'CASH',
  offeredItemId: null,
  cashKobo: naira * 100,
  cashDirection: 'OFFERER_PAYS_OWNER',
  note: '',
})

async function offerOnlyItem(title = 'Galaxy S21 · 128GB') {
  const form = new FormData()
  form.append('file', new File([new Uint8Array(100)], 'p.jpg', { type: 'image/jpeg' }))
  const photo = (await apiClient.post<MediaRef>('/media', form)).data
  const input: OfferItemInput = {
    title,
    condition: 'GOOD',
    defects: ['Small scratch on the back'],
    noDefects: false,
    repairs: 'None',
    photos: [photo],
    ownershipConfirmed: true,
  }
  return (await apiClient.post<SwapItem>('/me/items', input)).data
}

describe('mock offers API', () => {
  it('lists the member’s offers from their side, with the listing as it is now', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const { data } = await apiClient.get<Offer[]>('/offers')

    const received = data.find((o) => o.id === 'o-macbook-for-iphone')!
    expect(received.viewerRole).toBe('owner')
    expect(received.turnUserId).toBe(SAMPLE_MEMBER_ID)
    expect(received.listing.title).toBe('iPhone 12 Pro · 128GB')
    expect(data.find((o) => o.id === 'o-ps4-counter')!.viewerRole).toBe('offerer')
    expect(data.every((o) => o.offerer.id === SAMPLE_MEMBER_ID || o.owner.id === SAMPLE_MEMBER_ID)).toBe(true)
  })

  it('sends a cash offer that waits on the owner and expires after the configured time', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const { data, status } = await send(cash('l8', 200_000))

    expect(status).toBe(201)
    expect(data).toMatchObject({ status: 'PENDING', viewerRole: 'offerer', turnUserId: 'u-zainab' })
    expect(data.versions).toHaveLength(1)
    expect(current(data)).toMatchObject({ number: 1, authorId: SAMPLE_MEMBER_ID, cashKobo: 20_000_000 })
    const hours = (Date.parse(data.expiresAt) - Date.now()) / 3_600_000
    expect(hours).toBeGreaterThan(71)
    expect(hours).toBeLessThanOrEqual(72)
  })

  it('enforces the payload rules for each mode', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const item = await offerOnlyItem()
    const swap = { ...cash('l8', 0), mode: 'SWAP' as const, offeredItemId: item.id, cashDirection: 'NONE' as const }

    const cases: [NewOffer, string][] = [
      [cash('l8', 0), 'cashKobo'],
      [{ ...cash('l8', 1000), offeredItemId: item.id }, 'offeredItemId'],
      [{ ...swap, cashKobo: 500_000 }, 'cashKobo'],
      [{ ...swap, offeredItemId: null }, 'offeredItemId'],
      [{ ...swap, mode: 'SWAP_PLUS_CASH', cashKobo: 500_000 }, 'cashDirection'],
      [{ ...swap, mode: 'SWAP_PLUS_CASH', cashDirection: 'OWNER_PAYS_OFFERER' }, 'cashKobo'],
      // The iPhone 12 Pro Max is cash only
      [{ ...swap, listingId: 'l4' }, 'mode'],
    ]
    for (const [offer, field] of cases) {
      const error = await fail(send(offer))
      expect(error.code, field).toBe('VALIDATION_ERROR')
      expect(Object.keys(error.fieldErrors ?? {}), field).toContain(field)
    }
  })

  it('refuses offers on your own listing, from a restricted account, and on an unavailable item', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    expect((await fail(send(cash('l1', 300_000)))).code).toBe('FORBIDDEN')
    // The Xbox is reserved
    expect((await fail(send(cash('l10', 500_000)))).code).toBe('ITEM_UNAVAILABLE')

    mockAuth.setRestricted(true)
    expect((await fail(send(cash('l8', 200_000)))).code).toBe('FORBIDDEN')
  })

  it('returns the first result when the same idempotency key is sent again', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const before = (await apiClient.get<Offer[]>('/offers')).data.length

    const first = await send(cash('l8', 200_000), 'same-intent')
    const again = await send(cash('l8', 200_000), 'same-intent')

    expect(again.data.id).toBe(first.data.id)
    expect((await apiClient.get<Offer[]>('/offers')).data).toHaveLength(before + 1)
  })

  it('allows one open offer per listing and points to it', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const error = await fail(send(cash('l9', 200_000)))

    expect(error.code).toBe('OFFER_EXISTS')
    expect(error.details?.offerId).toBe('o-ps4-counter')
  })

  it('records a counter as a new version, passes the turn and restarts the clock', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const before = await getOffer('o-ps4-counter')

    const { data } = await act('o-ps4-counter', 'counter', {
      expectedVersionId: current(before).id,
      mode: 'CASH',
      offeredItemId: null,
      cashKobo: 18_000_000,
      cashDirection: 'OFFERER_PAYS_OWNER',
      note: 'Meet in the middle?',
    })

    expect(data.versions).toHaveLength(before.versions.length + 1)
    expect(current(data)).toMatchObject({
      authorId: SAMPLE_MEMBER_ID,
      cashKobo: 18_000_000,
      note: 'Meet in the middle?',
    })
    expect(data.turnUserId).toBe('u-ibrahim')
    expect(Date.parse(data.expiresAt)).toBeGreaterThan(Date.parse(before.expiresAt))
  })

  it('keeps the offered item fixed in a counter', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const offer = await getOffer('o-macbook-for-iphone')
    const item = await offerOnlyItem()

    const error = await fail(
      act(offer.id, 'counter', { ...current(offer), expectedVersionId: current(offer).id, offeredItemId: item.id }),
    )
    expect(error.code).toBe('VALIDATION_ERROR')
  })

  it('refuses a decision on a version that is no longer the latest', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const offer = await getOffer('o-ps4-counter')

    const error = await fail(act(offer.id, 'accept', { expectedVersionId: offer.versions[0]!.id }))
    expect(error.code).toBe('STALE_OFFER_VERSION')
  })

  it('accepting reserves the listing and closes competing offers with a reason', async () => {
    mockAuth.signInAs('u-zainab')
    const competing = (await send(cash('l1', 350_000))).data
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const offer = await getOffer('o-macbook-for-iphone')

    const { data } = await act(offer.id, 'accept', { expectedVersionId: current(offer).id })

    expect(data).toMatchObject({ status: 'ACCEPTED', turnUserId: null })
    expect(data.transactionId).toBeTruthy()
    expect((await apiClient.get<ListingDetail>('/listings/l1')).data.status).toBe('RESERVED')
    const results = (await apiClient.get<Paginated<ListingSummary>>('/listings')).data.items
    expect(results.some((l) => l.id === 'l1')).toBe(false)

    mockAuth.signInAs('u-zainab')
    const closed = await getOffer(competing.id)
    expect(closed.status).toBe('CLOSED_UNAVAILABLE')
    expect(closed.closedReason).toMatch(/accepted another offer/)
  })

  it('reserves a listed swap item along with the listing', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const offer = await getOffer('o-ps5-for-macbook')

    await act(offer.id, 'accept', { expectedVersionId: current(offer).id })

    expect((await apiClient.get<ListingDetail>('/listings/l6')).data.status).toBe('RESERVED')
    expect((await apiClient.get<ListingDetail>('/listings/l3')).data.status).toBe('RESERVED')
  })

  it('only lets the person whose turn it is accept or counter', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const offer = await getOffer('o-switch-waiting')

    expect((await fail(act(offer.id, 'accept', { expectedVersionId: current(offer).id }))).code).toBe('FORBIDDEN')
  })

  it('lets the offerer withdraw and the owner decline, but not the other way round', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)

    expect((await act('o-switch-waiting', 'withdraw')).data.status).toBe('WITHDRAWN')
    expect((await fail(act('o-ps5-for-macbook', 'withdraw'))).code).toBe('FORBIDDEN')
    expect((await fail(act('o-ps4-counter', 'decline'))).code).toBe('FORBIDDEN')
    expect((await act('o-ps5-for-macbook', 'decline')).data.status).toBe('REJECTED')
  })

  it('expires an offer: it turns read-only and refuses decisions (QA-09)', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    mockOffers.expire('o-ps4-counter')
    const offer = await getOffer('o-ps4-counter')

    expect(offer).toMatchObject({ status: 'EXPIRED', turnUserId: null })
    const error = await fail(act(offer.id, 'accept', { expectedVersionId: current(offer).id }))
    expect(error.code).toBe('OFFER_EXPIRED')
    expect(error.status).toBe(410)
  })

  it('hides an offer from anyone outside it (QA-16)', async () => {
    mockAuth.signInAs('u-zainab')
    const error = await fail(getOffer('o-macbook-for-iphone'))

    expect(error.status).toBe(404)
  })

  it('keeps offer-only items private, and lists the member’s items with availability', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const item = await offerOnlyItem('Private Galaxy S21')
    const { data: items } = await apiClient.get<SwapItem[]>('/me/items')

    expect(items.find((i) => i.id === item.id)).toMatchObject({ source: 'offer-only', available: true })
    expect(items.find((i) => i.id === 'l1')).toMatchObject({ source: 'listing', available: true })
    const results = (await apiClient.get<Paginated<ListingSummary>>('/listings?q=private')).data
    expect(results.items).toHaveLength(0)
  })

  it('marks a listed item unavailable once it is reserved', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const offer = await getOffer('o-macbook-for-iphone')
    await act(offer.id, 'accept', { expectedVersionId: current(offer).id })

    const iphone = (await apiClient.get<SwapItem[]>('/me/items')).data.find((i) => i.id === 'l1')
    expect(iphone).toMatchObject({ available: false, unavailableReason: 'Reserved for another deal' })
  })

  it('can save a write and then answer with a server error (QA-21)', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    mockOffers.saveThenFailNext()

    const error = await fail(send(cash('l8', 200_000), 'uncertain'))
    expect(error.isOutcomeUnknown).toBe(true)
    const saved = (await apiClient.get<Offer[]>('/offers')).data.find((o) => o.listing.id === 'l8')
    expect(saved).toBeDefined()
    expect((await send(cash('l8', 200_000), 'uncertain')).data.id).toBe(saved!.id)
  })

  it('marks an offer read when its participant opens it', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const listed = (await apiClient.get<Offer[]>('/offers')).data.find((o) => o.id === 'o-ps5-for-macbook')!
    expect(listed.unread).toBe(true)

    await getOffer(listed.id)

    expect((await apiClient.get<Offer[]>('/offers')).data.find((o) => o.id === listed.id)!.unread).toBe(false)
  })

  it('lets the dev toolbar make the other person counter', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    mockOffers.otherPartyCounters('o-switch-waiting')
    const offer = await getOffer('o-switch-waiting')

    expect(offer.versions).toHaveLength(2)
    expect(current(offer).authorId).toBe('u-zainab')
    expect(offer.turnUserId).toBe(SAMPLE_MEMBER_ID)
  })
})
