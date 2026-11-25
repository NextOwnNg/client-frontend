import { listingsDb } from '@/mocks/db/listings'
import { notificationsDb } from '@/mocks/db/notifications'
import { offersDb } from '@/mocks/db/offers'
import type { ListingReviewOutcome, ListingStatus } from '@/types/api'

/**
 * The moderators' decisions as the seller experiences them (mock only, driven by the DevToolbar and tests).
 * Each one changes the listing, records the latest review for the owner and notifies them (MSG-03). Only the
 * reason label and message are kept: never who decided, an internal note or a reason code.
 */

export type ReviewReason = { reasonLabel: string; message: string | null }

const TAKEDOWN_OFFER_REASON = 'The owner is making changes to this listing.'
const LIVE_LINK = '/me/listings?tab=active'

/** The listing's owner and title, if it's in the state a decision needs. */
function target(id: string, status: ListingStatus) {
  const record = listingsDb.byIdOrSlug(id)
  if (record?.detail.status !== status) return undefined
  return { id: record.detail.id, ownerId: record.ownerId, title: record.detail.title }
}

const outcome = (review: Omit<ListingReviewOutcome, 'decidedAt'>): ListingReviewOutcome => ({
  ...review,
  decidedAt: new Date().toISOString(),
})

const changesBody = ({ reasonLabel, message }: ReviewReason) => `${reasonLabel}.${message ? ` ${message}` : ''}`

function sendBack(listing: { id: string; ownerId: string }, reason: ReviewReason, title: string) {
  listingsDb.change(listing.id, {
    status: 'DRAFT',
    review: outcome({ outcome: 'changes_needed', ...reason }),
  })
  notificationsDb.notify(
    listing.ownerId,
    'LISTING_CHANGES_NEEDED',
    title,
    `/listings/${listing.id}/edit`,
    changesBody(reason),
  )
}

function goLive(id: string) {
  listingsDb.change(id, {
    status: 'ACTIVE',
    publishedAt: new Date().toISOString(),
    review: outcome({ outcome: 'approved', reasonLabel: null, message: null }),
  })
}

export const listingReview = {
  approve(id: string): boolean {
    const listing = target(id, 'PENDING_REVIEW')
    if (!listing) return false
    goLive(listing.id)
    notificationsDb.notify(
      listing.ownerId,
      'LISTING_APPROVED',
      'Your listing is live',
      LIVE_LINK,
      `${listing.title} is on Explore now.`,
    )
    return true
  },

  askForChanges(id: string, reason: ReviewReason): boolean {
    const listing = target(id, 'PENDING_REVIEW')
    if (!listing) return false
    sendBack(listing, reason, `${listing.title} needs a few changes`)
    return true
  },

  /** An administrator overturns an approval: the listing comes down and its open offers end. */
  takeDown(id: string, reason: ReviewReason): boolean {
    const listing = target(id, 'ACTIVE')
    if (!listing) return false
    sendBack(listing, reason, `${listing.title} was taken down for changes`)
    offersDb.closeOpenOnListing(listing.id, TAKEDOWN_OFFER_REASON)
    return true
  },

  /** An administrator overturns a rejection the seller hasn't resubmitted. */
  restore(id: string): boolean {
    const listing = target(id, 'DRAFT')
    if (!listing || listingsDb.own(listing.id)?.review?.outcome !== 'changes_needed') return false
    goLive(listing.id)
    notificationsDb.notify(
      listing.ownerId,
      'LISTING_RESTORED',
      `${listing.title} is live after all`,
      LIVE_LINK,
      'We took a second look and approved it.',
    )
    return true
  },

  approveAllPending(): number {
    const waiting = listingsDb.details().filter((d) => d.status === 'PENDING_REVIEW')
    return waiting.filter((d) => listingReview.approve(d.id)).length
  },
}
