import { describe, expect, it } from 'vitest'
import { isApiError } from '@/lib/api/api-error'
import { apiClient, idempotencyHeaders } from '@/lib/api/client'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { mockTransactions } from '@/mocks/db/transactions'
import type { ListingDetail, Offer, PublicProfile, ReviewWithContext, Transaction } from '@/types/api'

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
const post = (path: string, body: object = {}, key = `tx-key-${keys++}`) =>
  apiClient.post<Transaction>(path, body, { headers: idempotencyHeaders(key) })
const get = async (id: string) => (await apiClient.get<Transaction>(`/transactions/${id}`)).data
const listing = async (id: string) => (await apiClient.get<ListingDetail>(`/listings/${id}`)).data

const XBOX = 't-o-xbox-accepted'
const IPAD = 't-o-ipad-completed'

async function acceptMacbookOffer() {
  const offer = (await apiClient.get<Offer>('/offers/o-macbook-for-iphone')).data
  return (
    await apiClient.post<Offer>(
      `/offers/${offer.id}/accept`,
      { expectedVersionId: offer.versions.at(-1)!.id },
      { headers: idempotencyHeaders(`accept-${keys++}`) },
    )
  ).data
}

describe('mock transactions API', () => {
  it('creates a transaction on acceptance, with terms frozen against later listing edits (QA-08)', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const offer = await acceptMacbookOffer()
    expect(offer.transactionId).toBe('t-o-macbook-for-iphone')

    await apiClient.patch('/listings/l1', { title: 'iPhone 12 Pro (renamed)', askingKobo: 50_000_000 })
    const tx = await get('t-o-macbook-for-iphone')

    expect(tx).toMatchObject({ status: 'AWAITING_HANDOVER', viewerRole: 'owner' })
    expect(tx.agreement).toMatchObject({
      mode: 'SWAP_PLUS_CASH',
      cashKobo: 20_000_000,
      cashDirection: 'OWNER_PAYS_OFFERER',
      versionNumber: 1,
    })
    expect(tx.agreement.listingItem.title).toBe('iPhone 12 Pro · 128GB')
    expect(tx.agreement.offeredItem?.title).toBe('MacBook Air M1, 2020')
    const days = (Date.parse(tx.reservationExpiresAt) - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(6.9)
    expect(days).toBeLessThanOrEqual(7)
  })

  it('needs every statement that applies before recording a confirmation', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)

    const error = await fail(post(`/transactions/${XBOX}/confirm`, { checks: ['received'] }))
    expect(error.code).toBe('VALIDATION_ERROR')

    const { data } = await post(`/transactions/${XBOX}/confirm`, { checks: ['received', 'cash'] })
    expect(data.status).toBe('AWAITING_HANDOVER')
    expect(data.confirmations.offerer).toBeTruthy()
    expect(data.confirmations.owner).toBeNull()
    expect(data.review.eligible).toBe(false)
  })

  it('completes only when both people have confirmed, and marks both items completed', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    await post(`/transactions/${XBOX}/confirm`, { checks: ['received', 'cash'] })
    mockTransactions.otherPartyConfirms(XBOX)

    const tx = await get(XBOX)
    expect(tx.status).toBe('COMPLETED')
    expect(tx.completedAt).toBeTruthy()
    expect(tx.review.eligible).toBe(true)
    expect((await listing('l10')).status).toBe('COMPLETED')
  })

  it('returns the first answer when a confirmation is retried with the same key', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const first = await post(`/transactions/${XBOX}/confirm`, { checks: ['received', 'cash'] }, 'confirm-once')
    const again = await post(`/transactions/${XBOX}/confirm`, { checks: ['received', 'cash'] }, 'confirm-once')

    expect(again.data.confirmations.offerer).toBe(first.data.confirmations.offerer)
  })

  it('agrees a meeting only when both people say yes to the same proposal', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const time = new Date(Date.now() + 86_400_000).toISOString()
    const { data } = await apiClient.put<Transaction>(`/transactions/${XBOX}/meeting`, {
      place: 'Central mall, main entrance',
      time,
      note: '',
    })
    expect(data.meeting).toMatchObject({ proposedBy: SAMPLE_MEMBER_ID, agreedBy: [SAMPLE_MEMBER_ID] })

    mockAuth.signInAs('u-chidi')
    const agreed = (await post(`/transactions/${XBOX}/meeting/agree`)).data
    expect(agreed.meeting?.agreedBy).toEqual([SAMPLE_MEMBER_ID, 'u-chidi'])
  })

  it('cancels when both people agree, and releases the items', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const { data } = await post(`/transactions/${XBOX}/cancellation`, { reason: 'CANT_MEET', note: 'Travelling' })
    expect(data.cancellation).toMatchObject({ requestedBy: SAMPLE_MEMBER_ID, reason: 'CANT_MEET' })

    mockAuth.signInAs('u-chidi')
    const cancelled = (await post(`/transactions/${XBOX}/cancellation/accept`)).data
    expect(cancelled.status).toBe('CANCELLED')
    expect((await listing('l10')).status).toBe('ACTIVE')
  })

  it('keeps the deal when the other person declines a cancellation, or the asker withdraws it', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    await post(`/transactions/${XBOX}/cancellation`, { reason: 'CHANGED_MIND' })
    mockAuth.signInAs('u-chidi')
    expect((await post(`/transactions/${XBOX}/cancellation/decline`)).data.cancellation).toBeUndefined()

    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    await post(`/transactions/${XBOX}/cancellation`, { reason: 'CHANGED_MIND' })
    const withdrawn = (await apiClient.delete<Transaction>(`/transactions/${XBOX}/cancellation`)).data
    expect(withdrawn.cancellation).toBeUndefined()
    expect(withdrawn.status).toBe('AWAITING_HANDOVER')
  })

  it('refuses cancellation once someone has confirmed (ruling R5-3)', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    await post(`/transactions/${XBOX}/confirm`, { checks: ['received', 'cash'] })

    expect((await fail(post(`/transactions/${XBOX}/cancellation`, { reason: 'CHANGED_MIND' }))).code).toBe(
      'INVALID_STATE',
    )
  })

  it('freezes a disputed deal with a case reference (QA-13)', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const { data } = await post(`/transactions/${XBOX}/dispute`, {
      category: 'NO_SHOW',
      description: 'They did not come to the meeting.',
      evidence: [],
    })

    expect(data.status).toBe('DISPUTED')
    expect(data.dispute?.caseRef).toMatch(/^NX-\d{6}$/)
    expect((await fail(post(`/transactions/${XBOX}/confirm`, { checks: ['received', 'cash'] }))).code).toBe(
      'INVALID_STATE',
    )
  })

  it('takes one review per person after completion, and counts it on the profile', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const before = (await apiClient.get<PublicProfile>('/users/u-ibrahim')).data.reviewCount

    const { data } = await post(`/transactions/${IPAD}/review`, { rating: 5, note: 'Smooth and on time.' })
    expect(data.review.mine).toMatchObject({ rating: 5, note: 'Smooth and on time.' })
    expect((await fail(post(`/transactions/${IPAD}/review`, { rating: 4 }))).code).toBe('ALREADY_REVIEWED')
    expect((await apiClient.get<PublicProfile>('/users/u-ibrahim')).data.reviewCount).toBe(before + 1)

    const reviews = (await apiClient.get<{ given: ReviewWithContext[] }>('/me/reviews')).data
    expect(reviews.given[0]).toMatchObject({
      rating: 5,
      subjectName: 'Ibrahim S.',
      itemTitle: 'iPad · 32GB (older model)',
    })
  })

  it('refuses a review before both people have confirmed (QA-20)', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)

    expect((await fail(post(`/transactions/${XBOX}/review`, { rating: 5 }))).code).toBe('REVIEW_NOT_ELIGIBLE')
  })

  it('hides a transaction from anyone outside it (QA-16)', async () => {
    mockAuth.signInAs('u-zainab')

    expect((await fail(get(XBOX))).status).toBe(404)
  })

  it('ends an unconfirmed reservation and releases the items (QA-14)', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    mockTransactions.endReservation(XBOX)

    const tx = await get(XBOX)
    expect(tx.status).toBe('EXPIRED')
    expect((await listing('l10')).status).toBe('ACTIVE')
  })

  it('ends a half-confirmed reservation for support review, keeping the items held (QA-15)', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    await post(`/transactions/${XBOX}/confirm`, { checks: ['received', 'cash'] })
    mockTransactions.endReservation(XBOX)

    const tx = await get(XBOX)
    expect(tx.status).toBe('EXPIRED')
    expect(tx.endedReason).toMatch(/support/i)
    expect((await listing('l10')).status).toBe('RESERVED')
  })

  it('tells each offer where its deal stands', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const offers = (await apiClient.get<Offer[]>('/offers')).data

    expect(offers.find((o) => o.id === 'o-xbox-accepted')!.transactionStatus).toBe('AWAITING_HANDOVER')
    expect(offers.find((o) => o.id === 'o-ipad-completed')!.transactionStatus).toBe('COMPLETED')
  })
})
