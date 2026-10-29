import { SearchX } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useBlockedPeople, useReportTarget } from '@/features/trust/api'
import { ReportDone } from '@/features/trust/components/ReportDone'
import { ReportForm } from '@/features/trust/components/ReportForm'
import { targetNoun } from '@/features/trust/copy'
import { isMissingOrPrivate } from '@/lib/api/error-checks'
import { useSessionStore } from '@/stores/session'
import type { ReportReceipt, ReportTarget, ReportTargetType } from '@/types/api'

/** Where "back" goes once the report is in. */
function backTo({ type, id }: ReportTarget): { to: string; label: string } {
  const paths: Partial<Record<ReportTargetType, string>> = {
    listing: `/listings/${id}`,
    post: `/feed?post=${id}`,
    comment: '/feed',
    conversation: `/messages/${id}`,
    offer: `/offers/${id}`,
    user: `/users/${id}`,
  }
  return { to: paths[type] ?? '/', label: type === 'comment' ? 'Back to the feed' : `Back to the ${targetNoun[type]}` }
}

/** UX-23 / FE-TRU-01: `/report/:type/:id`, signed in only. What's reported is named before anything is asked. */
export function ReportPage() {
  const { type = '', id = '' } = useParams()
  const viewerId = useSessionStore((s) => s.userId)
  const { data: target, isPending, isError, error, refetch } = useReportTarget(type, id)
  const { data: blocked } = useBlockedPeople()
  const [done, setDone] = useState<{ receipt: ReportReceipt; blocked: boolean } | null>(null)

  if (isPending) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading"
        className="mx-auto h-96 w-full max-w-xl animate-pulse rounded-card bg-cloud"
      />
    )
  }
  if (isError || !target) {
    if (isMissingOrPrivate(error)) {
      return (
        <>
          <Seo title="Report" noindex />
          <EmptyState
            icon={SearchX}
            title="There’s nothing to report here"
            body="It may have been removed already, or the link is incomplete. If something else is wrong, the safety guide explains your options."
            action={<ButtonLink to="/support">Safety and help</ButtonLink>}
          />
        </>
      )
    }
    return <ErrorState title="We couldn't load this report form" onRetry={() => void refetch()} />
  }

  const noun = targetNoun[target.type]
  const author = target.author
  const canBlock = Boolean(author && author.id !== viewerId && !blocked?.some((p) => p.id === author.id))

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Seo title={`Report this ${noun}`} noindex />
      <div className="flex flex-col gap-3">
        <h1 className="text-h2 text-ink tablet:text-h1">{done ? 'Report received' : `Report this ${noun}`}</h1>
        <div className="flex flex-col gap-0.5 rounded-control border border-border bg-surface px-4 py-3">
          <p className="text-body font-semibold break-words text-ink">{target.label}</p>
          {author && target.type !== 'user' && <p className="text-compact text-muted">by {author.displayName}</p>}
        </div>
      </div>
      {done ? (
        <ReportDone
          receipt={done.receipt}
          blockedName={done.blocked ? (author?.displayName ?? null) : null}
          back={backTo(target)}
        />
      ) : (
        <ReportForm
          target={target}
          canBlock={canBlock}
          onDone={(receipt, alsoBlocked) => {
            setDone({ receipt, blocked: alsoBlocked })
            window.scrollTo({ top: 0 })
          }}
        />
      )}
    </div>
  )
}
