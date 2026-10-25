import { Banknote, ImageOff, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Price } from '@/components/domain/Price'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { conditionLabel, isAvailable, listingStatus } from '@/lib/copy/status'
import { cx } from '@/lib/cx'
import { formatNaira } from '@/lib/money/money'
import type { ItemCondition, ListingSummary } from '@/types/api'

/** A square photo, or a calm placeholder when there is none (low data: the action never waits on it). */
export function ItemThumb({ url, size = 'md' }: { url?: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cx(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-small bg-cloud text-muted',
        size === 'sm' ? 'size-12' : 'size-16',
      )}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <ImageOff aria-hidden className="size-5" />
      )}
    </span>
  )
}

/** The listing an offer is for, pinned above the composer and the thread (UX-15). */
export function ListingPin({
  listing,
  ownerName,
  label = 'Offering for',
}: {
  listing: ListingSummary
  ownerName: string
  label?: string
}) {
  const available = isAvailable(listing.status)
  const status = listingStatus(listing.status)
  return (
    <section
      aria-label={label}
      className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 tablet:gap-4"
    >
      <ItemThumb url={listing.cover.url} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          to={`/listings/${listing.slug}`}
          className="truncate text-body font-semibold text-ink underline-offset-4 hover:underline"
        >
          {listing.title}
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {available ? (
            <Price kobo={listing.askingKobo} />
          ) : (
            <StatusBadge tone={status.tone} icon={status.icon}>
              {status.label}
            </StatusBadge>
          )}
          <span className="text-compact text-muted">Listed by {ownerName}</span>
        </div>
      </div>
    </section>
  )
}

export type SideEntry =
  | {
      kind: 'item'
      title: string
      photoUrl?: string
      condition?: ItemCondition
      defects?: string[]
      /** For a listing summary that only carries the one-line defect note. */
      defectSummary?: string
      href?: string
      privateNote?: string
    }
  | { kind: 'cash'; kobo: number }

/**
 * One side of the trade (UX-18): "You give" or "You receive". Items show their condition and disclosed
 * defects, so nobody accepts terms without seeing them; cash says it changes hands directly.
 */
export function SideCard({ title, entries, icon: Icon }: { title: string; entries: SideEntry[]; icon?: LucideIcon }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <h3 className="flex items-center gap-1.5 text-caption font-semibold text-muted">
        {Icon && <Icon aria-hidden className="size-4" />}
        {title}
      </h3>
      <ul className="flex flex-col gap-4">
        {entries.map((entry) =>
          entry.kind === 'cash' ? (
            <li key="cash" className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-small bg-mint text-action">
                <Banknote aria-hidden className="size-5" />
              </span>
              <p className="flex flex-col">
                <span className="tabular text-price-sm font-bold text-ink">{formatNaira(entry.kobo)}</span>
                <span className="text-compact text-muted">Cash, paid directly at the exchange</span>
              </p>
            </li>
          ) : (
            <li key={entry.title} className="flex gap-3">
              <ItemThumb url={entry.photoUrl} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-body font-semibold text-ink">{entry.title}</p>
                {entry.condition && (
                  <p className="text-compact text-muted">{conditionLabel(entry.condition)} condition</p>
                )}
                <Defects entry={entry} />
                {entry.privateNote && <p className="text-caption text-muted">{entry.privateNote}</p>}
                {entry.href && (
                  <Link
                    to={entry.href}
                    className="inline-flex min-h-11 items-center self-start text-compact font-semibold text-action underline-offset-4 hover:underline"
                  >
                    See the full listing
                  </Link>
                )}
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  )
}

function Defects({ entry }: { entry: Extract<SideEntry, { kind: 'item' }> }) {
  if (entry.defects) {
    return entry.defects.length ? (
      <ul aria-label={`Defects of ${entry.title}`} className="flex flex-col gap-0.5">
        {entry.defects.map((d) => (
          <li key={d} className="flex gap-2 text-compact text-ink">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-warning" />
            {d}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-compact text-muted">No defects disclosed</p>
    )
  }
  return entry.defectSummary ? <p className="text-compact text-ink">{entry.defectSummary}</p> : null
}

/** A full-page "you can't do this here", with the reason and the next step (FE-OFF-01 blocked states). */
export function OfferBlocked({
  icon: Icon,
  title,
  children,
  actions,
  pin,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
  actions?: ReactNode
  pin?: ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {pin}
      <div className="flex flex-col items-start gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-cloud text-muted ring-1 ring-border">
          <Icon aria-hidden className="size-6" />
        </span>
        <h1 className="text-h2 text-balance text-ink tablet:text-h1">{title}</h1>
        <div className="max-w-prose text-body text-muted">{children}</div>
        {actions && <div className="mt-2 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  )
}
