import { SearchX } from 'lucide-react'
import { useParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useTransaction } from '@/features/transactions/api'
import { isMissingOrPrivate } from '@/lib/api/error-checks'
import { useSessionStore } from '@/stores/session'
import { Deal } from '@/features/transactions/components/Deal'

/** UX-21..23: `/transactions/:id`, for the two people in the deal only. */
export function TransactionPage() {
  const { id = '' } = useParams()
  const userId = useSessionStore((s) => s.userId) ?? ''
  const { data: tx, isPending, isError, error, refetch } = useTransaction(id)

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading deal" className="flex flex-col gap-4">
        <div className="h-24 animate-pulse rounded-card bg-cloud" />
        <div className="h-96 animate-pulse rounded-card bg-cloud" />
      </div>
    )
  }
  if (isError && !tx) {
    // Not found and not yours look the same, so a deal's existence never leaks (QA-16)
    if (isMissingOrPrivate(error)) {
      return (
        <>
          <Seo title="Transaction" noindex />
          <EmptyState
            icon={SearchX}
            title="We couldn’t find that deal"
            body="It may not exist, or it isn’t one of yours."
            action={<ButtonLink to="/transactions">Go to your transactions</ButtonLink>}
          />
        </>
      )
    }
    return <ErrorState title="We couldn't load this deal" onRetry={() => void refetch()} />
  }

  return <Deal key={tx.id} tx={tx} viewerId={userId} onRefetch={() => void refetch()} />
}
