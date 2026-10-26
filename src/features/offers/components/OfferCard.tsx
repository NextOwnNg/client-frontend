import { Clock } from 'lucide-react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ItemThumb } from '@/features/offers/components/OfferParts'
import { counterpartOf, expiryLabel, payerShort, shortModeLabels } from '@/features/offers/offer-terms'
import { offerStatus } from '@/lib/copy/offer-status'
import { cx } from '@/lib/cx'
import type { Offer } from '@/types/api'

/**
 * One negotiation in the inbox (FE-OFF-06): the item, the current terms from the reader's side, and whose
 * move it is. "Your turn" is the strongest thing on the card; the expiry is calm text, never a timer.
 */
export function OfferCard({
  offer,
  viewerId,
  now,
  href,
  current,
}: {
  offer: Offer
  viewerId: string
  now: number
  href: string
  current?: boolean
}) {
  const latest = offer.versions.at(-1)!
  const status = offerStatus(offer, viewerId)
  const other = counterpartOf(offer)
  const yourTurn = offer.turnUserId === viewerId
  const pending = offer.status === 'PENDING'
  const swapThumb = latest.offeredItem?.photos[0]?.url

  return (
    <li>
      <Link
        to={href}
        aria-current={current ? 'page' : undefined}
        className={cx(
          'flex gap-3 rounded-card border bg-surface p-3 transition-[border-color,background-color] duration-120 hover:border-action/40',
          current ? 'border-action shadow-[inset_0_0_0_1px_var(--nx-teal)]' : 'border-border',
        )}
      >
        <span className="relative h-16 w-16 shrink-0">
          <ItemThumb url={offer.listing.cover.url} />
          {swapThumb && (
            <span className="absolute -right-1.5 -bottom-1.5 overflow-hidden rounded-small ring-2 ring-surface">
              <img src={swapThumb} alt="" loading="lazy" className="size-8 object-cover" />
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={status.tone} icon={status.icon}>
              {status.label}
            </StatusBadge>
            {offer.unread && (
              <span className="inline-flex items-center gap-1 text-caption font-semibold text-action">
                <span aria-hidden className="size-2 rounded-full bg-action" />
                New
              </span>
            )}
          </span>
          <span className="truncate text-body font-semibold text-ink">{offer.listing.title}</span>
          <span className="flex flex-wrap gap-x-3 text-compact text-muted">
            <span>{shortModeLabels[latest.mode]}</span>
            <span className="tabular font-semibold text-ink">{payerShort(latest, offer.viewerRole)}</span>
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-compact">
            {pending ? (
              yourTurn ? (
                <span className="font-semibold text-action">Your turn</span>
              ) : (
                <span className="text-muted">Waiting for {other.displayName}</span>
              )
            ) : (
              <span className="text-muted">With {other.displayName}</span>
            )}
            {pending && (
              <span className="tabular inline-flex items-center gap-1 text-muted">
                <Clock aria-hidden className="size-3.5" />
                {expiryLabel(offer.expiresAt, now)}
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  )
}
