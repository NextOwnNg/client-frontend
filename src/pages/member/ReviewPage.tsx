import { zodResolver } from '@hookform/resolvers/zod'
import { Button, toast } from '@heroui/react'
import { Lock, SearchX } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { useTransaction } from '@/features/transactions/api'
import { Stars } from '@/features/transactions/components/Agreement'
import { StarRating } from '@/features/transactions/components/StarRating'
import { useTransactionAction } from '@/features/transactions/use-transaction-action'
import { isMissingOrPrivate } from '@/lib/api/error-checks'
import { copy } from '@/lib/copy/copy'
import { formatWAT } from '@/lib/time/time'
import { useSessionStore } from '@/stores/session'
import type { Transaction } from '@/types/api'

const NOTE_MAX = 500

/** UX-24: `/transactions/:id/review`. The form exists only for a completed deal, whatever the link says. */
export function ReviewPage() {
  const { id = '' } = useParams()
  const userId = useSessionStore((s) => s.userId) ?? ''
  const { data: tx, isPending, isError, error, refetch } = useTransaction(id)

  if (isPending)
    return <div aria-busy="true" aria-label="Loading" className="h-80 animate-pulse rounded-card bg-cloud" />
  if (isError && !tx) {
    if (isMissingOrPrivate(error)) {
      return (
        <EmptyState
          icon={SearchX}
          title="We couldn’t find that deal"
          body="It may not exist, or it isn’t one of yours."
          action={<ButtonLink to="/transactions">Go to your transactions</ButtonLink>}
        />
      )
    }
    return <ErrorState title="We couldn't load this deal" onRetry={() => void refetch()} />
  }

  const other = tx.viewerRole === 'offerer' ? tx.owner : tx.offerer
  if (tx.review.mine) {
    return (
      <Shell title={`You’ve reviewed ${other.displayName}`} tx={tx}>
        <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
          <Stars rating={tx.review.mine.rating} />
          {tx.review.mine.note && <p className="text-body text-ink">“{tx.review.mine.note}”</p>}
          <p className="text-caption text-muted">Posted {formatWAT(tx.review.mine.createdAt)}</p>
        </div>
      </Shell>
    )
  }
  if (!tx.review.eligible) {
    // FE-TRU-04 / QA-20: an old link to an unfinished or cancelled deal never reaches the form
    return (
      <Shell title={`Review ${other.displayName}`} tx={tx}>
        <Banner tone="info" title={copy.reviewGate}>
          {tx.status === 'AWAITING_HANDOVER'
            ? 'Once you’ve both confirmed your sides, you can come back here.'
            : 'This deal didn’t complete, so there’s nothing to review.'}
        </Banner>
      </Shell>
    )
  }
  return <ReviewForm tx={tx} viewerId={userId} otherName={other.displayName} />
}

function Shell({ title, tx, children }: { title: string; tx: Transaction; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <Seo title="Review" noindex />
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 text-ink tablet:text-h1">{title}</h1>
        <p className="text-body text-muted">For the exchange of {tx.agreement.listingItem.title}</p>
      </div>
      {children}
      <ButtonLink to={`/transactions/${tx.id}`} variant="secondary" className="self-start">
        Back to the deal
      </ButtonLink>
    </div>
  )
}

const reviewSchema = z.object({
  // Nothing is chosen at first; the transform turns "nothing" into the message and narrows the type
  rating: z
    .number()
    .int()
    .min(1)
    .max(5)
    .nullable()
    .transform((rating, ctx) => {
      if (rating) return rating
      ctx.addIssue({ code: 'custom', message: 'Choose a rating from 1 to 5 stars.' })
      return z.NEVER
    }),
  note: z.string().trim().max(NOTE_MAX),
})

type ReviewInput = z.input<typeof reviewSchema>
type ReviewForm = z.output<typeof reviewSchema>

function ReviewForm({ tx, viewerId, otherName }: { tx: Transaction; viewerId: string; otherName: string }) {
  const navigate = useNavigate()
  const { run, pending } = useTransactionAction(tx, viewerId)
  const { control, handleSubmit, setError, formState } = useForm<ReviewInput, unknown, ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: null, note: '' },
  })

  const submit = handleSubmit(async ({ rating, note }) => {
    const result = await run({ kind: 'review', rating, note })
    if (result.kind === 'done') {
      toast.success('Review posted.')
      void navigate(`/transactions/${tx.id}`, { replace: true })
    } else if (result.kind === 'refused') setError('root', { message: result.message })
    else if (!(result.kind === 'not-done' && result.silent)) {
      setError('root', { message: 'Your review wasn’t posted. Check your connection and try again.' })
    }
  })

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Seo title="Review" noindex />
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 text-ink tablet:text-h1">Review {otherName}</h1>
        <p className="text-body text-muted">
          For the exchange of {tx.agreement.listingItem.title}
          {tx.completedAt && `, completed ${formatWAT(tx.completedAt, { withTime: false })}`}
        </p>
      </div>
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Controller
          control={control}
          name="rating"
          render={({ field, fieldState }) => (
            <StarRating value={field.value} onChange={field.onChange} error={fieldState.error?.message ?? null} />
          )}
        />
        <Controller
          control={control}
          name="note"
          render={({ field }) => (
            <TextAreaField
              label="Add a few words (optional)"
              hint="Keep it about this exchange: timekeeping, the item, how it went."
              rows={4}
              maxLength={NOTE_MAX}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <p className="flex items-start gap-2 text-compact text-muted">
          <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
          Your review appears on {otherName}’s profile with your name. You can leave one review per exchange.
        </p>
        {formState.errors.root && <Banner tone="danger" title={formState.errors.root.message ?? ''} />}
        <Button type="submit" isPending={pending} className="self-start px-8">
          Post review
        </Button>
      </form>
    </div>
  )
}
