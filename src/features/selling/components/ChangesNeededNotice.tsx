import { Banner } from '@/components/ui/Banner'
import { reviewCopy } from '@/features/selling/copy'
import type { ListingReviewOutcome } from '@/types/api'

export function ChangesNeededNotice({ review }: { review: ListingReviewOutcome }) {
  return (
    <Banner tone="warning" role="status" title={`${reviewCopy.changesNeeded}: ${review.reasonLabel}`}>
      {review.message && (
        <blockquote className="mb-2 border-l-2 border-warning pl-3 break-words text-ink">
          <span className="sr-only">{reviewCopy.messageLabel}: </span>
          {review.message}
        </blockquote>
      )}
      <p>{reviewCopy.wizardHint}</p>
    </Banner>
  )
}
