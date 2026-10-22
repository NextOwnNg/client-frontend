import { MapPin, Phone, Star } from 'lucide-react'
import { useId, useState } from 'react'
import { copy } from '@/lib/copy/copy'
import { cx } from '@/lib/cx'

/** Coarse public location only; never an address (PRD FE-LDT-05). */
export function AreaLabel({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cx('inline-flex min-w-0 items-center gap-1 text-compact text-muted', className)}>
      <MapPin aria-hidden className="size-3.5 shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  )
}

type TrustModuleProps = {
  phoneConfirmed: boolean
  reviewCount: number
  rating?: number
}

/** Facts, not badges: phone confirmation explained in place, and ratings always with their count. */
export function TrustModule({ phoneConfirmed, reviewCount, rating }: TrustModuleProps) {
  const [open, setOpen] = useState(false)
  const explainerId = useId()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {phoneConfirmed && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={explainerId}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex min-h-11 items-center gap-1.5 text-compact font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-action"
          >
            <Phone aria-hidden className="size-4 text-action" />
            Phone confirmed
          </button>
        )}
        <span className="tabular inline-flex items-center gap-1.5 text-compact text-ink">
          {reviewCount === 0 || rating === undefined ? (
            <span className="text-muted">No reviews yet</span>
          ) : (
            <>
              <Star aria-hidden className="size-4 fill-highlight text-highlight" />
              <span className="font-semibold">{rating.toFixed(1)}</span>
              <span className="text-muted">
                · {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
              </span>
            </>
          )}
        </span>
      </div>
      {open && (
        <p id={explainerId} className="rounded-control bg-cloud p-3 text-compact text-muted">
          {copy.phoneBadgeExplainer}
        </p>
      )}
    </div>
  )
}
