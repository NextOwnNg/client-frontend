import { Clock, Info, LifeBuoy } from 'lucide-react'
import { type ReactNode } from 'react'
import { Link } from 'react-router'
import { OfferSum } from '@/components/domain/OfferSum'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { offerOnlyNote } from '@/features/offers/components/OfferItemForm'
import { SideCard, type SideEntry } from '@/features/offers/components/OfferParts'
import {
  modeLabels,
  NOTE_MAX,
  offerSum,
  tradeSentence,
  viewerPays,
  type TradeParts,
} from '@/features/offers/offer-terms'
import { draftTerms } from '@/features/offers/use-offer-draft'
import { copy } from '@/lib/copy/copy'
import { useServerNow } from '@/lib/time/server-clock'
import { formatWAT } from '@/lib/time/time'
import type { SwapItem } from '@/types/api'
import { type StepProps, stepHeading } from '@/features/offers/components/composer-step'
import { FieldAnchor } from '@/components/ui/FieldAnchor'

export function ReviewStep({
  listing,
  draft,
  change,
  errors,
  item,
  lifetimeHours,
  status,
}: StepProps & { item?: SwapItem; lifetimeHours: number; status?: ReactNode }) {
  const now = useServerNow()
  const terms = draftTerms(draft)
  const parts: TradeParts = { terms, listingTitle: listing.title, itemTitle: item?.title ?? null }
  const sum = offerSum(parts, 'offerer')
  const cash = terms.cashDirection !== 'NONE' && terms.cashKobo > 0
  const iPay = viewerPays(terms, 'offerer')
  const expiresAt = new Date(now + lifetimeHours * 3_600_000).toISOString()

  const give: SideEntry[] = []
  if (item) {
    give.push({
      kind: 'item',
      title: item.title,
      photoUrl: item.photos[0]?.url,
      condition: item.condition,
      defects: item.defects,
      href: item.listingSlug ? `/listings/${item.listingSlug}` : undefined,
      privateNote: item.source === 'offer-only' ? offerOnlyNote : undefined,
    })
  }
  if (cash && iPay) give.push({ kind: 'cash', kobo: terms.cashKobo })
  const receive: SideEntry[] = [
    {
      kind: 'item',
      title: listing.title,
      photoUrl: listing.cover.url,
      condition: listing.condition,
      defects: listing.defects,
      href: `/listings/${listing.slug}`,
    },
  ]
  if (cash && !iPay) receive.push({ kind: 'cash', kobo: terms.cashKobo })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className={stepHeading}>Check your offer</h2>
        <p className="text-compact text-muted">{modeLabels[terms.mode]}</p>
        <p className="max-w-prose text-body font-semibold text-ink">{tradeSentence(parts, 'offerer')}</p>
      </div>

      <OfferSum {...sum} animateIn />

      <div className="grid gap-3 tablet:grid-cols-2">
        <SideCard title="You give" entries={give} />
        <SideCard title="You receive" entries={receive} />
      </div>

      <FieldAnchor className="flex flex-col gap-1" name="note">
        <TextAreaField
          label="Add a note (optional)"
          hint="Sent with your offer. The terms above are what count, not the note."
          rows={3}
          maxLength={NOTE_MAX}
          value={draft.note}
          onChange={(e) => change({ note: e.target.value })}
          error={errors.note}
        />
      </FieldAnchor>

      <p className="flex items-start gap-2 text-compact text-ink">
        <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
        <span>
          If {listing.seller.displayName} doesn’t answer, this offer expires{' '}
          <span className="tabular font-semibold">{formatWAT(expiresAt)}</span> (in {lifetimeHours} hours).
        </span>
      </p>

      <ul className="flex flex-col gap-2 rounded-control border border-border bg-surface p-4 text-compact text-ink">
        <li className="flex items-start gap-2">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
          {copy.beforeSend}
        </li>
        <li className="flex items-start gap-2">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
          This is an offer, not a completed transaction.
        </li>
        <li className="flex items-start gap-2">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
          <span>
            <span>{copy.handoverCaution}</span>{' '}
            <Link
              to="/support"
              className="inline-flex items-center gap-1 font-semibold text-action underline-offset-4 hover:underline"
            >
              <LifeBuoy aria-hidden className="size-3.5" />
              Safety tips
            </Link>
          </span>
        </li>
      </ul>

      {status}
    </div>
  )
}
