import { ButtonLink } from '@/components/ui/Button'
import { tradeSentence } from '@/features/offers/offer-terms'
import { cx } from '@/lib/cx'
import { timeAgo } from '@/lib/time/time'
import type { ChatMessage, OfferStatus } from '@/types/api'

const closedLabels: Record<Exclude<OfferStatus, 'PENDING'>, string> = {
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
  CLOSED_UNAVAILABLE: 'No longer available',
}

/**
 * An offer version in the thread (ruling R6-6). Its terms come from the offer, never from typed text, and it
 * opens the offer page, where accepting and countering check the version is still current.
 */
export function OfferCardBubble({
  message,
  viewerId,
  viewerRole,
  otherName,
  now,
}: {
  message: ChatMessage
  viewerId: string
  viewerRole: 'offerer' | 'owner'
  otherName: string
  now: number
}) {
  const card = message.offer!
  const byMe = card.authorId === viewerId
  const status = !card.current
    ? 'Earlier version'
    : card.offerStatus === 'PENDING'
      ? byMe
        ? `Waiting for ${otherName}`
        : 'Your decision'
      : closedLabels[card.offerStatus]
  const decide = card.current && card.offerStatus === 'PENDING' && !byMe

  return (
    <section
      aria-label={`Offer, version ${card.versionNumber}`}
      className={cx(
        'mx-auto flex w-full max-w-md flex-col gap-2 rounded-card border bg-surface p-4',
        card.current ? 'border-action/40' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption font-semibold tracking-wide text-muted uppercase">
          {card.versionNumber === 1 ? 'Offer' : 'Counteroffer'} · version {card.versionNumber}
        </p>
        <span
          className={cx(
            'rounded-full px-2 text-caption leading-6 font-semibold',
            card.current ? 'bg-mint text-action' : 'bg-cloud text-muted',
          )}
        >
          {status}
        </span>
      </div>
      <p className={cx('text-body font-semibold', card.current ? 'text-ink' : 'text-muted')}>
        {tradeSentence(
          { terms: card.terms, listingTitle: card.listingTitle, itemTitle: card.itemTitle },
          viewerRole,
          card.offerStatus === 'ACCEPTED',
        )}
      </p>
      <p className="text-caption text-muted">
        From {byMe ? 'you' : otherName} · {timeAgo(message.createdAt, now)}
      </p>
      {card.current && (
        <ButtonLink
          to={`/offers/${card.offerId}`}
          variant={decide ? 'primary' : 'secondary'}
          size="sm"
          className="self-start"
        >
          {decide ? 'Review offer' : 'Open offer'}
        </ButtonLink>
      )}
    </section>
  )
}
