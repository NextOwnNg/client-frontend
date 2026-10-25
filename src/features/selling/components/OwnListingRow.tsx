import { ImageOff } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Deadline } from '@/components/domain/Deadline'
import { Price } from '@/components/domain/Price'
import { ButtonLink, PlainButton } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useDiscardDraft, useListingAction } from '@/features/selling/api'
import { listingStatus } from '@/lib/copy/status'
import { formatWAT } from '@/lib/time/time'
import type { OwnListing } from '@/types/api'

const RenewSheet = lazy(() =>
  import('@/features/selling/components/RenewSheet').then((m) => ({ default: m.RenewSheet })),
)

function metaLine(listing: OwnListing) {
  const date = (iso?: string) => (iso ? formatWAT(iso, { withTime: false }) : '')
  switch (listing.status) {
    case 'DRAFT':
      return `Last saved ${date(listing.updatedAt)}`
    case 'PENDING_REVIEW':
      return 'We’re checking it against the community rules.'
    case 'RESERVED':
      return 'Reserved for an agreed deal. Agreed terms won’t change if you edit.'
    case 'EXPIRED':
      return listing.urgencyEndsAt ? `Quick Sell ended ${date(listing.urgencyEndsAt)}` : 'This listing has ended.'
    default:
      return listing.publishedAt ? `Listed ${date(listing.publishedAt)}` : ''
  }
}

/** One of the owner's listings with what they can do next (FE-LST-08). */
export function OwnListingRow({ listing, quickSellOptions }: { listing: OwnListing; quickSellOptions: number[] }) {
  const [confirm, setConfirm] = useState<'close' | 'discard' | null>(null)
  const [renewing, setRenewing] = useState(false)
  const action = useListingAction()
  const discard = useDiscardDraft()
  const status = listingStatus(listing.status)
  const cover = listing.photos[0]
  const { id, slug } = listing
  const live = listing.status === 'ACTIVE'
  const closed = ['CLOSED', 'COMPLETED', 'REMOVED'].includes(listing.status)

  return (
    <li className="flex gap-3 rounded-card border border-border bg-surface p-3 tablet:gap-4 tablet:p-4">
      <div className="size-20 shrink-0 overflow-hidden rounded-control bg-cloud tablet:size-24">
        {cover ? (
          <img src={cover.url} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-muted">
            <ImageOff aria-hidden className="size-6" />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {live && listing.urgencyEndsAt ? (
            <Deadline endsAt={listing.urgencyEndsAt} variant="compact" />
          ) : (
            <StatusBadge tone={status.tone} icon={status.icon}>
              {status.label}
            </StatusBadge>
          )}
        </div>
        <p className="truncate text-body font-semibold text-ink">{listing.title.trim() || 'Untitled draft'}</p>
        {listing.modes.length > 0 && <Price kobo={listing.modes.includes('CASH') ? listing.askingKobo : null} />}
        <p className="text-compact text-muted">{metaLine(listing)}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {listing.status === 'DRAFT' && (
            <>
              <ButtonLink to={`/listings/${id}/edit`} size="sm">
                Continue
              </ButtonLink>
              <PlainButton variant="tertiary" size="sm" onClick={() => setConfirm('discard')}>
                Discard
              </PlainButton>
            </>
          )}
          {listing.status === 'EXPIRED' && (
            <PlainButton size="sm" onClick={() => setRenewing(true)}>
              Renew
            </PlainButton>
          )}
          {listing.status === 'PENDING_REVIEW' && (
            <ButtonLink to={`/listings/${id}/edit?step=preview`} variant="secondary" size="sm">
              Preview
            </ButtonLink>
          )}
          {(live || listing.status === 'RESERVED' || closed) && listing.status !== 'REMOVED' && (
            <ButtonLink to={`/listings/${slug}`} variant="secondary" size="sm">
              View
            </ButtonLink>
          )}
          {!closed && listing.status !== 'DRAFT' && (
            <ButtonLink to={`/listings/${id}/edit`} variant="secondary" size="sm">
              Edit
            </ButtonLink>
          )}
          {(live || listing.status === 'PENDING_REVIEW' || listing.status === 'EXPIRED') && (
            <PlainButton variant="tertiary" size="sm" onClick={() => setConfirm('close')}>
              Close
            </PlainButton>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirm === 'close'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Close this listing?"
        body="It stops showing on Explore and can’t take new offers. You can still see it under Closed."
        confirmLabel="Close listing"
        tone="danger"
        onConfirm={async () => {
          await action.mutateAsync({ id, action: 'close' })
        }}
      />
      <ConfirmModal
        open={confirm === 'discard'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Discard this draft?"
        body="The draft and its photos are deleted. This can’t be undone."
        confirmLabel="Discard draft"
        tone="danger"
        onConfirm={async () => {
          await discard.mutateAsync(id)
        }}
      />
      {renewing && (
        <Suspense fallback={null}>
          <RenewSheet listing={listing} options={quickSellOptions} open={renewing} onOpenChange={setRenewing} />
        </Suspense>
      )}
    </li>
  )
}
