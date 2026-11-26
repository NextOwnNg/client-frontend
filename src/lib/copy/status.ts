import {
  Ban,
  CircleCheck,
  CircleDot,
  CircleSlash,
  Clock,
  Eye,
  Handshake,
  PencilLine,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import type { ListingStatus, OwnListing } from '@/types/api'

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'highlight'

export type StatusDisplay = { label: string; tone: StatusTone; icon: LucideIcon }

const listingStatuses: Record<ListingStatus, StatusDisplay> = {
  DRAFT: { label: 'Draft', tone: 'neutral', icon: PencilLine },
  PENDING_REVIEW: { label: 'Under review', tone: 'info', icon: Eye },
  ACTIVE: { label: 'Available', tone: 'info', icon: CircleDot },
  RESERVED: { label: 'Reserved', tone: 'warning', icon: Handshake },
  EXPIRED: { label: 'Expired', tone: 'neutral', icon: Clock },
  COMPLETED: { label: 'Completed', tone: 'success', icon: CircleCheck },
  CLOSED: { label: 'Closed', tone: 'neutral', icon: CircleSlash },
  REMOVED: { label: 'No longer available', tone: 'neutral', icon: Ban },
}

/** Single source for listing state labels (PRD §7.6). */
export function listingStatus(status: ListingStatus, opts: { urgencyLabel?: string } = {}): StatusDisplay {
  if (status === 'ACTIVE' && opts.urgencyLabel) {
    return { label: `Quick Sell · ${opts.urgencyLabel}`, tone: 'highlight', icon: Timer }
  }
  return listingStatuses[status]
}

export { conditionLabel } from '@/lib/copy/labels'

/** Listings that can still receive offers. */
export function isAvailable(status: ListingStatus): boolean {
  return status === 'ACTIVE'
}

type Reviewed = Pick<OwnListing, 'status' | 'review'>

/** A draft the review team sent back (a rejection, or a listing taken down after approval). */
export function needsChanges(listing: Reviewed): boolean {
  return listing.status === 'DRAFT' && listing.review?.outcome === 'changes_needed'
}

/** A listing sent back for changes that the seller has resubmitted and is being checked again. */
export function isResubmission(listing: Reviewed): boolean {
  return listing.status === 'PENDING_REVIEW' && listing.review?.outcome === 'changes_needed'
}

const changesNeeded: StatusDisplay = { label: 'Changes needed', tone: 'warning', icon: PencilLine }

/** The owner's view of a listing's state: a draft sent back for changes reads as such, not as a plain draft. */
export function ownListingStatus(listing: Reviewed): StatusDisplay {
  return needsChanges(listing) ? changesNeeded : listingStatus(listing.status)
}
