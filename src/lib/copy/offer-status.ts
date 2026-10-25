import { Ban, CircleSlash, Clock, Handshake, Inbox, Reply, Send } from 'lucide-react'
import type { StatusDisplay } from '@/lib/copy/status'
import type { Offer, OfferStatus } from '@/types/api'

/* Offer labels live apart from listing labels so the offer icons stay out of the first-load chunk. */
const closedOffers: Record<Exclude<OfferStatus, 'PENDING'>, StatusDisplay> = {
  ACCEPTED: { label: 'Accepted', tone: 'success', icon: Handshake },
  REJECTED: { label: 'Declined', tone: 'neutral', icon: CircleSlash },
  WITHDRAWN: { label: 'Withdrawn', tone: 'neutral', icon: CircleSlash },
  EXPIRED: { label: 'Expired', tone: 'neutral', icon: Clock },
  CLOSED_UNAVAILABLE: { label: 'No longer available', tone: 'neutral', icon: Ban },
}

/** Single source for offer state labels, from the reader's side (PRD §7.6). */
export function offerStatus(offer: Pick<Offer, 'status' | 'turnUserId' | 'versions'>, viewerId: string): StatusDisplay {
  if (offer.status !== 'PENDING') return closedOffers[offer.status]
  const countered = offer.versions.length > 1
  if (offer.turnUserId === viewerId) {
    return countered
      ? { label: 'Counteroffer received', tone: 'info', icon: Reply }
      : { label: 'Offer received', tone: 'info', icon: Inbox }
  }
  return { label: countered ? 'Counteroffer sent' : 'Offer sent', tone: 'info', icon: Send }
}
