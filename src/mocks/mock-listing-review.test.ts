import { beforeEach, describe, expect, it } from 'vitest'
import { apiClient } from '@/lib/api/client'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { listingReview } from '@/mocks/db/listing-review'
import { CHANGES_SAMPLE_ID, listingsDb, mockListings } from '@/mocks/db/listings'
import { offersDb } from '@/mocks/db/offers'
import { reviewReasons } from '@/mocks/fixtures/review-reasons'
import type { AppNotification, MediaRef, Offer, OwnListing } from '@/types/api'

const BUYER = 'u-chidi'

async function pendingListing(title = 'Galaxy S21 · 128GB') {
  const form = new FormData()
  form.append('file', new File([new Uint8Array(2_000)], 'photo', { type: 'image/jpeg' }))
  form.append('width', '1600')
  form.append('height', '1200')
  form.append('alt', 'Front of the item')
  const photo = (await apiClient.post<MediaRef>('/media', form)).data
  const { data: draft } = await apiClient.post<OwnListing>('/listings', { title })
  await apiClient.patch(`/listings/${draft.id}`, {
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
  return (await apiClient.post<OwnListing>(`/listings/${draft.id}/publish`)).data
}

const own = async (id: string) => (await apiClient.get<OwnListing>(`/me/listings/${id}`)).data
/** The latest alert of a kind (two alerts in the same millisecond can't be told apart by time). */
const latest = async (kind: AppNotification['kind']) =>
  (await apiClient.get<AppNotification[]>('/notifications')).data.find((n) => n.kind === kind)

const photosReason = { reasonLabel: 'Photos missing or unclear', message: 'Please retake the second photo.' }

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('mock listing review', () => {
  it('offers the draft rejection reasons, in order', () => {
    expect(reviewReasons).toEqual([
      'Item isn’t allowed on NextOwn',
      'Photos missing or unclear',
      'Condition or defects not described',
      'Wrong category',
      'Price or description is misleading',
      'Something else',
    ])
  })

  it('approves a listing and tells the seller it is live', async () => {
    const listing = await pendingListing()

    expect(listingReview.approve(listing.id)).toBe(true)

    expect(await own(listing.id)).toMatchObject({
      status: 'ACTIVE',
      review: { outcome: 'approved', reasonLabel: null, message: null },
    })
    expect(await latest('LISTING_APPROVED')).toMatchObject({
      title: 'Your listing is live',
      body: 'Galaxy S21 · 128GB is on Explore now.',
      link: '/me/listings?tab=active',
    })
  })

  it('asks for changes with the reason and message, and sends it back as a draft', async () => {
    const listing = await pendingListing()

    expect(listingReview.askForChanges(listing.id, photosReason)).toBe(true)

    expect(await own(listing.id)).toMatchObject({
      status: 'DRAFT',
      review: { outcome: 'changes_needed', ...photosReason },
    })
    expect(await latest('LISTING_CHANGES_NEEDED')).toMatchObject({
      title: 'Galaxy S21 · 128GB needs a few changes',
      body: 'Photos missing or unclear. Please retake the second photo.',
      link: `/listings/${listing.id}/edit`,
    })
  })

  it('leaves the message out when there is none', async () => {
    const listing = await pendingListing()

    listingReview.askForChanges(listing.id, { reasonLabel: 'Wrong category', message: null })

    expect((await latest('LISTING_CHANGES_NEEDED'))?.body).toBe('Wrong category.')
    expect((await own(listing.id)).review?.message).toBeNull()
  })

  it('takes down a live listing and closes its open offers with a reason', async () => {
    const listing = await pendingListing()
    listingReview.approve(listing.id)
    const offer = offersDb.create(listing.id, BUYER, SAMPLE_MEMBER_ID, {
      mode: 'CASH',
      offeredItemId: null,
      cashKobo: 20_000_000,
      cashDirection: 'OFFERER_PAYS_OWNER',
      note: '',
    })

    expect(listingReview.takeDown(listing.id, photosReason)).toBe(true)

    expect(await own(listing.id)).toMatchObject({ status: 'DRAFT', review: { outcome: 'changes_needed' } })
    expect(await latest('LISTING_CHANGES_NEEDED')).toMatchObject({
      title: 'Galaxy S21 · 128GB was taken down for changes',
    })
    mockAuth.signInAs(BUYER)
    const { data } = await apiClient.get<Offer>(`/offers/${offer.id}`)
    expect(data).toMatchObject({
      status: 'CLOSED_UNAVAILABLE',
      closedReason: 'The owner is making changes to this listing.',
    })
  })

  it('restores a listing after a second look', async () => {
    const listing = await pendingListing()
    listingReview.askForChanges(listing.id, photosReason)

    expect(listingReview.restore(listing.id)).toBe(true)

    expect(await own(listing.id)).toMatchObject({ status: 'ACTIVE', review: { outcome: 'approved' } })
    expect(await latest('LISTING_RESTORED')).toMatchObject({
      title: 'Galaxy S21 · 128GB is live after all',
      body: 'We took a second look and approved it.',
      link: '/me/listings?tab=active',
    })
  })

  it('approves every listing waiting, and says how many', async () => {
    await pendingListing('Galaxy S21 · 128GB')
    await pendingListing('Pixel 6 · 128GB')

    expect(listingReview.approveAllPending()).toBe(2)
    expect(listingReview.approveAllPending()).toBe(0)
  })

  it('refuses decisions on listings in the wrong state', async () => {
    const listing = await pendingListing()
    listingReview.approve(listing.id)
    listingsDb.setStatus(listing.id, 'RESERVED')

    expect(listingReview.takeDown(listing.id, photosReason)).toBe(false)
    expect(listingReview.approve(listing.id)).toBe(false)
    expect(listingReview.askForChanges(listing.id, photosReason)).toBe(false)
    expect(listingReview.restore('l-draft-sample')).toBe(false)
    expect(listingReview.takeDown('l-draft-sample', photosReason)).toBe(false)
    expect((await own(listing.id)).status).toBe('RESERVED')
    expect((await own('l-draft-sample')).status).toBe('DRAFT')
  })

  it('never sends staff names, codes or notes to the seller', async () => {
    const listing = await pendingListing()
    listingReview.askForChanges(listing.id, photosReason)

    const seen = JSON.stringify([
      (await apiClient.get('/me/listings')).data,
      (await apiClient.get('/notifications')).data,
    ])
    expect(seen).not.toMatch(/REJECT_|"by"|"note"|reasonCode/)
  })

  it('keeps the seeded draft resubmittable after it was sent back', async () => {
    mockListings.publishLive(false)
    const { data } = await apiClient.post<OwnListing>(`/listings/${CHANGES_SAMPLE_ID}/publish`)

    expect(data.status).toBe('PENDING_REVIEW')
    expect(listingReview.approve(CHANGES_SAMPLE_ID)).toBe(true)
  })
})
