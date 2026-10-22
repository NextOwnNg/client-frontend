import { Link } from 'react-router'
import { Deadline } from '@/components/domain/Deadline'
import { Price } from '@/components/domain/Price'
import { AreaLabel } from '@/components/domain/TrustModule'
import { ImageWithFade } from '@/components/ui/ImageWithFade'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { conditionLabel, isAvailable, listingStatus } from '@/lib/copy/status'
import { cx } from '@/lib/cx'
import type { ListingSummary } from '@/types/api'

/** Swap-ok tag when a cash listing also takes swaps; swap-only listings already say "Open to swap". */
function ModeTag({ listing }: { listing: ListingSummary }) {
  if (listing.acceptedModes.includes('SWAP') && listing.askingKobo !== null) {
    return <span className="shrink-0 rounded-full bg-mint px-2 text-caption font-semibold leading-6 whitespace-nowrap text-action">Swap ok</span>
  }
  return null
}

/**
 * The Explore row from the chosen sketch: photo, the Teal margin rule, then the facts on a 24px rhythm.
 * Unavailable listings stay visible but read as unavailable at a glance.
 */
export function ListingRow({ listing }: { listing: ListingSummary }) {
  const available = isAvailable(listing.status)
  const status = listingStatus(listing.status)

  return (
    <Link
      to={`/listings/${listing.slug}`}
      className="group flex h-30 w-full min-w-0 overflow-hidden rounded-card border border-border bg-surface transition-[transform,border-color] duration-120 ease-out active:scale-[0.98] pointer-fine:hover:border-action/40"
    >
      <ImageWithFade
        src={listing.cover.url}
        alt={listing.cover.alt}
        sizes="112px"
        className={cx('h-full w-24 shrink-0 min-[380px]:w-28', !available && 'opacity-60 grayscale-[40%]')}
        aspect="auto"
      />
      <div className="relative flex min-w-0 flex-1 flex-col py-3 pr-3 pl-4">
        <span aria-hidden className="absolute top-3 bottom-3 left-0 w-0.5 rounded-full bg-action" />
        <h3 className="truncate text-body font-semibold text-ink">{listing.title}</h3>
        <p className="truncate text-compact leading-6 text-muted">
          {conditionLabel(listing.condition)}
          {listing.defectSummary && ` · ${listing.defectSummary}`}
        </p>
        <div className="mt-auto flex min-w-0 items-center justify-between gap-2">
          {available ? <Price kobo={listing.askingKobo} /> : <StatusBadge tone={status.tone} icon={status.icon}>{status.label}</StatusBadge>}
          {available && (listing.urgencyEndsAt ? <Deadline endsAt={listing.urgencyEndsAt} variant="compact" /> : <ModeTag listing={listing} />)}
        </div>
        <AreaLabel name={listing.areaName} className="sr-only" />
      </div>
    </Link>
  )
}

/** Grid card for wider screens: same facts, photo on top. */
export function ListingTile({ listing }: { listing: ListingSummary }) {
  const available = isAvailable(listing.status)
  const status = listingStatus(listing.status)

  return (
    <Link
      to={`/listings/${listing.slug}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface transition-[transform,border-color,box-shadow] duration-120 ease-out active:scale-[0.98] pointer-fine:hover:border-action/40 pointer-fine:hover:shadow-card"
    >
      <span className="relative">
        <ImageWithFade
          src={listing.cover.url}
          alt={listing.cover.alt}
          sizes="(min-width: 1024px) 280px, 50vw"
          className={cx(!available && 'opacity-60 grayscale-[40%]')}
        />
        {!available && (
          <StatusBadge tone={status.tone} icon={status.icon} className="absolute top-2 left-2 shadow-card">
            {status.label}
          </StatusBadge>
        )}
        {available && listing.urgencyEndsAt && (
          <Deadline endsAt={listing.urgencyEndsAt} variant="compact" className="absolute top-2 left-2" />
        )}
      </span>
      <div className="relative flex flex-col py-3 pr-3 pl-4">
        <span aria-hidden className="absolute top-3 bottom-3 left-0 w-0.5 rounded-full bg-action" />
        <h3 className="truncate text-body font-semibold text-ink">{listing.title}</h3>
        <p className="truncate text-compact leading-6 text-muted">
          {conditionLabel(listing.condition)} · {listing.areaName}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          {available ? <Price kobo={listing.askingKobo} /> : <span className="text-compact text-muted">Not accepting offers</span>}
          {available && <ModeTag listing={listing} />}
        </div>
      </div>
    </Link>
  )
}
