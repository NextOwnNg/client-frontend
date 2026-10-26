import { Archive, CircleCheck, Handshake } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ItemThumb } from '@/features/offers/components/OfferParts'
import { useTransactions } from '@/features/transactions/api'
import { otherRole, transactionTab, type TransactionTab } from '@/features/transactions/transaction-view'
import { transactionStatus } from '@/lib/copy/transaction-status'
import { cx } from '@/lib/cx'
import { formatWAT } from '@/lib/time/time'
import type { Transaction } from '@/types/api'

const tabs: { id: TransactionTab; label: string; empty: { title: string; body: string; icon: typeof Handshake } }[] = [
  {
    id: 'active',
    label: 'Active',
    empty: {
      title: 'No deals in progress',
      body: 'When an offer is accepted, the deal appears here until you’ve both confirmed the exchange.',
      icon: Handshake,
    },
  },
  {
    id: 'completed',
    label: 'Completed',
    empty: { title: 'No completed deals', body: 'Exchanges you’ve both confirmed are kept here.', icon: CircleCheck },
  },
  {
    id: 'ended',
    label: 'Ended',
    empty: {
      title: 'No ended deals',
      body: 'Cancelled deals and reservations that ran out are kept here.',
      icon: Archive,
    },
  },
]

/** What the reader should do next, or what they're waiting for: one short line per card. */
function nextStep(tx: Transaction) {
  const other = tx.viewerRole === 'offerer' ? tx.owner : tx.offerer
  switch (tx.status) {
    case 'AWAITING_HANDOVER':
      if (tx.cancellation) return 'Cancellation requested'
      if (tx.confirmations[tx.viewerRole]) return `Waiting for ${other.displayName} to confirm`
      if (tx.confirmations[otherRole(tx.viewerRole)]) return 'Next: confirm your side'
      if (!tx.meeting) return 'Next: agree where to meet'
      if (tx.meeting.agreedBy.length < 2) return 'Meeting suggested, not yet agreed'
      return `Meeting ${formatWAT(tx.meeting.time)}`
    case 'DISPUTED':
      return `Case ${tx.dispute?.caseRef ?? ''} with support`
    case 'COMPLETED':
      return tx.review.eligible && !tx.review.mine
        ? `Next: review ${other.displayName}`
        : `Completed ${formatWAT(tx.completedAt ?? tx.updatedAt, { withTime: false })}`
    default:
      return `Ended ${formatWAT(tx.endedAt ?? tx.updatedAt, { withTime: false })}`
  }
}

/** `/transactions`: every agreed deal by where it stands, with the tab in the URL. */
export function TransactionsPage() {
  const [params] = useSearchParams()
  const current = tabs.find((t) => t.id === params.get('tab')) ?? tabs[0]!
  const { data, isPending, isError, refetch } = useTransactions()
  const count = (tab: TransactionTab) => data?.filter((t) => transactionTab(t) === tab).length ?? 0
  const items = data?.filter((t) => transactionTab(t) === current.id) ?? []

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Seo title="Transactions" noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">Transactions</h1>

      <nav aria-label="Deal status">
        <ul className="flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <Link
                to={`?tab=${tab.id}`}
                replace
                aria-current={tab.id === current.id ? 'page' : undefined}
                className={cx(
                  '-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-compact font-semibold transition-colors duration-120',
                  tab.id === current.id ? 'border-action text-ink' : 'border-transparent text-muted hover:text-ink',
                )}
              >
                {tab.label}
                <span
                  className={cx(
                    'tabular rounded-full px-1.5 text-caption',
                    tab.id === current.id ? 'bg-mint text-action' : 'bg-cloud text-muted',
                  )}
                >
                  {data ? count(tab.id) : '·'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {isPending ? (
        <div aria-busy="true" aria-label="Loading your deals" className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-cloud" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="We couldn't load your deals" onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={current.empty.icon}
          title={current.empty.title}
          body={current.empty.body}
          action={current.id === 'active' ? <ButtonLink to="/offers">Go to your offers</ButtonLink> : undefined}
        />
      ) : (
        <ul aria-label={`${current.label} deals`} className="flex flex-col gap-2">
          {items.map((tx) => {
            const status = transactionStatus(tx)
            const other = tx.viewerRole === 'offerer' ? tx.owner : tx.offerer
            const next = nextStep(tx)
            return (
              <li key={tx.id}>
                <Link
                  to={`/transactions/${tx.id}`}
                  className="flex gap-3 rounded-card border border-border bg-surface p-3 transition-colors duration-120 hover:border-action/40"
                >
                  <ItemThumb url={tx.agreement.listingItem.photos[0]?.url} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={status.tone} icon={status.icon}>
                        {status.label}
                      </StatusBadge>
                    </span>
                    <span className="truncate text-body font-semibold text-ink">{tx.agreement.listingItem.title}</span>
                    <span className="text-compact text-muted">With {other.displayName}</span>
                    <span
                      className={cx(
                        'text-compact',
                        next.startsWith('Next:') ? 'font-semibold text-action' : 'text-muted',
                      )}
                    >
                      {next}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
