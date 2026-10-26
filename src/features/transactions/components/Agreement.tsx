import { Printer, Star } from 'lucide-react'
import { useId } from 'react'
import { OfferSum } from '@/components/domain/OfferSum'
import { ButtonLink, PlainButton } from '@/components/ui/Button'
import { SideCard, type SideEntry } from '@/features/offers/components/OfferParts'
import { modeLabels, offerSum, tradeSentence } from '@/features/offers/offer-terms'
import { agreementParts, otherRole, sidesOf } from '@/features/transactions/transaction-view'
import { formatWAT } from '@/lib/time/time'
import type { SnapshotItem, Transaction } from '@/types/api'

const itemEntry = (item: SnapshotItem): SideEntry => ({
  kind: 'item',
  title: item.title,
  photoUrl: item.photos[0]?.url,
  condition: item.condition,
  defects: item.defects,
})

/**
 * The frozen agreement (FE-TRX-01): both items with their disclosed defects and who pays whom, exactly as
 * accepted. It's read from the deal, never from the listing, so later edits can't change it (QA-08).
 */
export function AgreementSnapshotView({ tx }: { tx: Transaction }) {
  const headingId = useId()
  const { agreement, viewerRole } = tx
  const parts = agreementParts(agreement)
  const sides = sidesOf(agreement, viewerRole)
  const give: SideEntry[] = [
    ...(sides.mine ? [itemEntry(sides.mine)] : []),
    ...(sides.iPayCash ? [{ kind: 'cash', kobo: sides.cashKobo } as const] : []),
  ]
  const receive: SideEntry[] = [
    ...(sides.theirs ? [itemEntry(sides.theirs)] : []),
    ...(sides.iGetCash ? [{ kind: 'cash', kobo: sides.cashKobo } as const] : []),
  ]

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-h3 text-ink">
          What you agreed
        </h2>
        <p className="text-compact text-muted">
          {modeLabels[agreement.mode]} · version {agreement.versionNumber}, accepted {formatWAT(agreement.acceptedAt)}
        </p>
      </div>
      <p className="max-w-prose text-body font-semibold text-ink">{tradeSentence(parts, viewerRole, true)}</p>
      <OfferSum {...offerSum(parts, viewerRole)} heading="The agreed trade, worked out" />
      <div className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-1 wide:grid-cols-2">
        <SideCard title="You give" entries={give} />
        <SideCard title="You receive" entries={receive} />
      </div>
      <p className="text-caption text-muted">
        This is a record of the accepted offer. Changes to either listing don’t change it.
      </p>
    </section>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={n <= rating ? 'size-4 fill-highlight text-highlight' : 'size-4 text-border'}
        />
      ))}
    </span>
  )
}

/**
 * The completed exchange (FE-TRX-07, FE-TRX-10): both confirmation times and factual wording. It says both
 * people confirmed; it never says the payment was checked. Printing leaves the meeting details out.
 */
export function ExchangeRecord({ tx }: { tx: Transaction }) {
  const headingId = useId()
  const me = tx.viewerRole
  const them = otherRole(me)
  const person = (role: typeof me) => (role === 'offerer' ? tx.offerer : tx.owner)
  const line = (role: typeof me) => {
    const at = tx.confirmations[role]
    const name = `${person(role).displayName}${role === me ? ' (you)' : ''}`
    return at ? `${name} confirmed ${formatWAT(at)}` : `${name} hasn’t confirmed`
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 print:border-0 print:p-0"
    >
      <h2 id={headingId} className="text-h3 text-ink">
        Exchange record
      </h2>
      <ul className="tabular flex flex-col gap-1 text-compact text-ink">
        <li>{line('offerer')}</li>
        <li>{line('owner')}</li>
        {tx.completedAt && <li>Completed {formatWAT(tx.completedAt)}</li>}
      </ul>
      <p className="max-w-prose text-compact text-muted">
        Both people confirmed the exchange. Any payment was arranged between them and is self-reported; NextOwn didn’t
        handle it.
      </p>

      {tx.review.theirs && (
        <div className="flex flex-col gap-1 border-t border-border pt-3">
          <p className="flex flex-wrap items-center gap-2 text-compact text-ink">
            <span className="font-semibold">{person(them).displayName} reviewed you</span>
            <Stars rating={tx.review.theirs.rating} />
          </p>
          {tx.review.theirs.note && <p className="text-compact text-muted">“{tx.review.theirs.note}”</p>}
        </div>
      )}
      {tx.review.mine ? (
        <p className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-compact text-ink">
          <span className="font-semibold">Your review</span>
          <Stars rating={tx.review.mine.rating} />
        </p>
      ) : (
        tx.review.eligible && (
          <div className="flex flex-col gap-2 border-t border-border pt-3 print:hidden">
            <p className="text-body text-ink">How did the exchange with {person(them).displayName} go?</p>
            <ButtonLink to={`/transactions/${tx.id}/review`} className="self-start">
              Review {person(them).displayName}
            </ButtonLink>
          </div>
        )
      )}

      <PlainButton variant="secondary" size="sm" onClick={() => window.print()} className="self-start print:hidden">
        <Printer aria-hidden className="size-4" />
        Print or save
      </PlainButton>
    </section>
  )
}

export { Stars }
