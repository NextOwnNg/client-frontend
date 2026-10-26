import { Star } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { ErrorState } from '@/components/ui/States'
import { useMyReviews } from '@/features/transactions/api'
import { Stars } from '@/features/transactions/components/Agreement'
import { formatWAT } from '@/lib/time/time'
import type { ReviewWithContext } from '@/types/api'

/** UX-24 history: reviews other people left about the member, and the ones the member left. */
export function MyReviewsPage() {
  const { data, isPending, isError, refetch } = useMyReviews()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Seo title="Reviews" noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">Reviews</h1>
      {isPending ? (
        <div aria-busy="true" aria-label="Loading reviews" className="h-48 animate-pulse rounded-card bg-cloud" />
      ) : isError ? (
        <ErrorState title="We couldn't load your reviews" onRetry={() => void refetch()} />
      ) : (
        <>
          <ReviewList
            title="About you"
            reviews={data.received}
            empty="No one has reviewed you yet. Reviews appear after both people confirm an exchange."
            who={(r) => r.authorName}
          />
          <ReviewList
            title="By you"
            reviews={data.given}
            empty="You haven’t reviewed anyone yet. You can review a person after an exchange you both confirmed."
            who={(r) => `About ${r.subjectName}`}
          />
        </>
      )}
    </div>
  )
}

function ReviewList({
  title,
  reviews,
  empty,
  who,
}: {
  title: string
  reviews: ReviewWithContext[]
  empty: string
  who: (review: ReviewWithContext) => string
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-h3 text-ink">
        {title}
      </h2>
      {reviews.length === 0 ? (
        <p className="flex items-start gap-2 text-body text-muted">
          <Star aria-hidden className="mt-1 size-4 shrink-0" />
          {empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => (
            <li
              key={`${review.transactionId}-${review.authorId}`}
              className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars rating={review.rating} />
                <span className="tabular text-caption text-muted">
                  {formatWAT(review.createdAt, { withTime: false })}
                </span>
              </div>
              <p className="text-compact font-semibold text-ink">{who(review)}</p>
              {review.note && <p className="text-body text-ink">“{review.note}”</p>}
              <Link
                to={`/transactions/${review.transactionId}`}
                className="text-compact text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                {review.itemTitle}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
