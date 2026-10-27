import { conditionLabel } from '@/lib/copy/status'
import type { ListingDetail } from '@/types/api'
import { sectionHeading } from '@/features/listings/components/listing-styles'

/** Disclosed defects sit above the offer button (FE-LDT-01), written out like the rest of the working. */
export function ConditionAndDefects({ listing }: { listing: ListingDetail }) {
  return (
    <section aria-labelledby="condition-heading" className="relative flex flex-col gap-2 pl-4">
      <span aria-hidden className="absolute top-1 bottom-1 left-0 w-0.5 rounded-full bg-action" />
      <h2 id="condition-heading" className={sectionHeading}>
        Condition and defects
      </h2>
      <p className="text-body text-ink">
        <span className="font-semibold">{conditionLabel(listing.condition)}</span>
        <span className="text-muted"> condition</span>
      </p>
      {listing.defects.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {listing.defects.map((d) => (
            <li key={d} className="flex gap-2 text-body leading-6 text-ink">
              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-warning" />
              {d}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-compact text-muted">No defects disclosed by the seller. Inspect the item before you pay.</p>
      )}
    </section>
  )
}
