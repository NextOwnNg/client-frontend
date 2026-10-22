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
import type { ItemCondition, ListingStatus } from '@/types/api'

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

const conditions: Record<ItemCondition, string> = {
  LIKE_NEW: 'Like new',
  GOOD: 'Good',
  FAIR: 'Fair',
  FOR_PARTS: 'For parts',
}

export function conditionLabel(condition: ItemCondition): string {
  return conditions[condition]
}

/** Listings that can still receive offers. */
export function isAvailable(status: ListingStatus): boolean {
  return status === 'ACTIVE'
}
