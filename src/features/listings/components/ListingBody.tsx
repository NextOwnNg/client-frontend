import { Flag, LifeBuoy } from 'lucide-react'
import { Link } from 'react-router'
import { copy } from '@/lib/copy/copy'
import type { ListingDetail } from '@/types/api'
import { DetailSection } from '@/features/listings/components/DetailSection'

/** Everything after the offer decision point: description, details, extras, swap wishes, safety. */
export function ListingBody({ listing }: { listing: ListingDetail }) {
  return (
    <div className="flex flex-col gap-8">
      {listing.description && (
        <DetailSection title="About this item">
          <p className="max-w-prose text-body text-ink">{listing.description}</p>
        </DetailSection>
      )}
      {listing.categoryFields.length > 0 && (
        <DetailSection title="Details">
          <dl className="tabular grid grid-cols-[auto_1fr] gap-x-6 border-t border-border">
            {listing.categoryFields.map((f) => (
              <div key={f.label} className="col-span-2 grid grid-cols-subgrid border-b border-border py-2.5">
                <dt className="text-compact text-muted">{f.label}</dt>
                <dd className="text-body text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        </DetailSection>
      )}
      {(listing.repairs || listing.accessories) && (
        <DetailSection title="Repairs and what's included">
          {listing.repairs && (
            <p className="text-body text-ink">
              <span className="font-semibold">Repairs: </span>
              {listing.repairs}
            </p>
          )}
          {listing.accessories && (
            <p className="text-body text-ink">
              <span className="font-semibold">Included: </span>
              {listing.accessories}
            </p>
          )}
        </DetailSection>
      )}
      {listing.desiredSwap && listing.acceptedModes.includes('SWAP') && (
        <DetailSection title="Would swap for">
          <p className="text-body text-ink">{listing.desiredSwap}</p>
          <p className="text-compact text-muted">
            You can offer your item, add cash, or ask for cash on top. The offer shows who pays whom.
          </p>
        </DetailSection>
      )}
      <DetailSection title="Before you meet">
        <p className="max-w-prose text-body text-ink">{copy.handoverCaution}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <Link
            to="/support"
            className="inline-flex min-h-11 items-center gap-1.5 text-compact font-semibold text-action underline-offset-4 hover:underline"
          >
            <LifeBuoy aria-hidden className="size-4" />
            Safety tips
          </Link>
          <Link
            to={`/report/listing/${listing.id}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-compact font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            <Flag aria-hidden className="size-4" />
            Report this listing
          </Link>
        </div>
      </DetailSection>
      {listing.sample && (
        <p className="text-caption text-muted">
          Sample listing: fictional data for development. Photo from Wikimedia Commons.
        </p>
      )}
    </div>
  )
}
