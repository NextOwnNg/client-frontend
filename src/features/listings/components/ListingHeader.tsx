import { ArrowLeftRight, Banknote } from 'lucide-react'
import { Deadline } from '@/components/domain/Deadline'
import { Price } from '@/components/domain/Price'
import { AreaLabel } from '@/components/domain/TrustModule'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { copy } from '@/lib/copy/copy'
import { isAvailable, listingStatus } from '@/lib/copy/status'
import { cx } from '@/lib/cx'
import { formatWAT } from '@/lib/time/time'
import type { ListingDetail } from '@/types/api'

/** Status, area, title, price, accepted modes and any real Quick Sell deadline. */
export function ListingHeader({ listing, titleAs: Title = 'h1' }: { listing: ListingDetail; titleAs?: 'h1' | 'h2' }) {
  const available = isAvailable(listing.status)
  const status = listingStatus(listing.status)

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {!available && (
          <StatusBadge tone={status.tone} icon={status.icon}>
            {status.label}
          </StatusBadge>
        )}
        <AreaLabel name={listing.areaName} />
        <span className="text-compact text-muted">Listed {formatWAT(listing.publishedAt, { withTime: false })}</span>
      </div>
      <Title className={cx('text-h2 desktop:text-h1', available ? 'text-ink' : 'text-muted')}>{listing.title}</Title>
      <Price kobo={listing.askingKobo} size="lg" className={cx(!available && 'text-muted')} />
      <ul aria-label="Accepted offers" className="flex flex-wrap gap-2">
        {listing.acceptedModes.includes('CASH') && listing.askingKobo !== null && (
          <li className="inline-flex h-8 items-center gap-1.5 rounded-full bg-mint px-3 text-compact font-semibold text-action">
            <Banknote aria-hidden className="size-4" />
            Cash offers
          </li>
        )}
        {listing.acceptedModes.includes('SWAP') && (
          <li className="inline-flex h-8 items-center gap-1.5 rounded-full bg-mint px-3 text-compact font-semibold text-action">
            <ArrowLeftRight aria-hidden className="size-4" />
            Open to swap
          </li>
        )}
      </ul>
      {available && listing.urgencyEndsAt && (
        <div className="flex flex-col gap-1">
          <Deadline endsAt={listing.urgencyEndsAt} variant="detail" />
          <p className="text-caption text-muted">{copy.quickSellNote}</p>
        </div>
      )}
    </header>
  )
}
