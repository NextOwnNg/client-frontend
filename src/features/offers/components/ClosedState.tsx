import { ButtonLink } from '@/components/ui/Button'
import { counterpartOf } from '@/features/offers/offer-terms'
import { copy } from '@/lib/copy/copy'
import { isAvailable } from '@/lib/copy/status'
import type { Offer, TransactionStatus } from '@/types/api'

/** An accepted offer whose deal has since moved on. Awaiting handover keeps the "accepted" wording. */
const dealOutcomes: Partial<Record<TransactionStatus, { title: string; body: string }>> = {
  COMPLETED: { title: 'Exchange completed', body: 'You both confirmed the exchange.' },
  CANCELLED: { title: 'The deal was cancelled', body: 'Both people agreed to cancel, and the items were released.' },
  EXPIRED: { title: 'Reservation ended', body: 'The deal’s reservation ended before both people confirmed.' },
  DISPUTED: { title: 'Under review', body: 'A problem was reported with this deal. Support will review it.' },
}

export function ClosedState({ offer, expiredOnScreen }: { offer: Offer; expiredOnScreen: boolean }) {
  const other = counterpartOf(offer)
  const mine = offer.viewerRole
  if (expiredOnScreen || offer.status === 'EXPIRED') {
    const canOfferAgain = mine === 'offerer' && isAvailable(offer.listing.status)
    return (
      <div className="flex flex-col gap-2">
        <p className="text-body font-semibold text-ink">Offer expired</p>
        <p className="text-compact text-muted">
          No one decided in time, so this offer closed. Its terms can’t be accepted any more.
        </p>
        {canOfferAgain && (
          <ButtonLink to={`/offers/new?listing=${offer.listing.id}`} variant="secondary" className="self-start">
            Make a new offer
          </ButtonLink>
        )}
      </div>
    )
  }
  switch (offer.status) {
    case 'ACCEPTED': {
      // The deal moves on after acceptance: say where it stands now, not what was true then (FE-NTF-01)
      const ended = dealOutcomes[offer.transactionStatus ?? 'AWAITING_HANDOVER']
      return (
        <div className="flex flex-col gap-2">
          <p className="text-body font-semibold text-ink">{ended?.title ?? 'Offer accepted'}</p>
          {ended ? (
            <p className="text-compact text-ink">{ended.body}</p>
          ) : (
            <>
              <p className="text-compact text-ink">{copy.offerAccepted}</p>
              <p className="text-compact text-muted">{copy.handoverCaution}</p>
            </>
          )}
          {offer.transactionId && (
            <ButtonLink
              to={`/transactions/${offer.transactionId}`}
              variant={ended ? 'secondary' : 'primary'}
              className="self-start"
            >
              {ended ? 'View the deal' : 'View the agreement'}
            </ButtonLink>
          )}
        </div>
      )
    }
    case 'REJECTED':
      return (
        <p className="text-body text-ink">
          {mine === 'owner' ? 'You declined this offer.' : `${other.displayName} declined this offer.`}
        </p>
      )
    case 'WITHDRAWN':
      return (
        <p className="text-body text-ink">
          {mine === 'offerer' ? 'You withdrew this offer.' : `${other.displayName} withdrew this offer.`}
        </p>
      )
    case 'CLOSED_UNAVAILABLE':
      return (
        <div className="flex flex-col gap-1">
          <p className="text-body font-semibold text-ink">No longer available</p>
          <p className="text-compact text-muted">{offer.closedReason ?? 'The item is no longer available.'}</p>
        </div>
      )
    default:
      return null
  }
}
