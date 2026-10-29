import { Flag } from 'lucide-react'
import { Link } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useMyReports } from '@/features/trust/api'
import { reasonLabel, reportStatuses, targetNoun } from '@/features/trust/copy'
import { copy } from '@/lib/copy/copy'
import { formatWAT } from '@/lib/time/time'

/** FE-TRU-03: `/me/reports`. Each case's reference and status, and what the status means. Never moderator notes. */
export function MyReportsPage() {
  const { data: reports, isPending, isError, refetch } = useMyReports()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Seo title="My reports" noindex />
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 text-ink tablet:text-h1">My reports</h1>
        <p className="text-body text-muted">
          Reports you made and problems with deals. Only the status is shown here; the safety team’s notes stay private.
        </p>
      </div>
      {isPending ? (
        <div aria-busy="true" aria-label="Loading your reports" className="h-48 animate-pulse rounded-card bg-cloud" />
      ) : isError ? (
        <ErrorState title="We couldn't load your reports" onRetry={() => void refetch()} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="You haven’t reported anything"
          body="If something looks wrong on a listing, a post, a profile or in messages, use Report there."
        />
      ) : (
        <ul aria-label="Your reports" className="flex flex-col gap-3">
          {reports.map((report) => {
            const status = reportStatuses[report.status]
            return (
              <li
                key={report.id}
                className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4 tablet:flex-row tablet:items-start tablet:justify-between tablet:gap-6"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-caption font-semibold text-muted">
                    <span className="tabular">{report.caseRef}</span> · {targetNoun[report.targetType]}
                  </p>
                  <p className="text-body font-semibold break-words text-ink">{report.targetLabel}</p>
                  <p className="text-compact text-muted">
                    {reasonLabel(report.reason)} · Reported {formatWAT(report.createdAt, { withTime: false })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 tablet:items-end tablet:text-right">
                  <StatusBadge tone={status.tone} icon={status.icon} className="self-start tablet:self-end">
                    {status.label}
                  </StatusBadge>
                  <p className="text-caption text-muted">{status.meaning}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-compact text-muted">{copy.supportLimit}</p>
        <Link
          to="/support"
          className="inline-flex min-h-11 items-center self-start text-compact font-semibold text-action underline-offset-4 hover:underline"
        >
          Safety and help
        </Link>
      </div>
    </div>
  )
}
