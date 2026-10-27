import { Button } from '@heroui/react'
import { LifeBuoy, LoaderCircle } from 'lucide-react'
import { type ReactNode } from 'react'
import { Banner } from '@/components/ui/Banner'
import { ButtonLink } from '@/components/ui/Button'
import { cancelReasonLabel, RESERVATION_WARNING_MS } from '@/features/transactions/transaction-view'
import { type useTransactionAction } from '@/features/transactions/use-transaction-action'
import { copy, disputeRecorded } from '@/lib/copy/copy'
import { formatWAT, relativeDeadline } from '@/lib/time/time'
import type { Transaction } from '@/types/api'

export type Notice = 'not-done' | 'unknown' | { refused: string } | null

export function DealNotices({
  tx,
  now,
  checking,
  notice,
  canAct,
  onRetryCheck,
  act,
  openAgreeCancel,
}: {
  tx: Transaction
  now: number
  checking: boolean
  notice: Notice
  canAct: boolean
  onRetryCheck: () => void
  act: (action: Parameters<ReturnType<typeof useTransactionAction>['run']>[0]) => Promise<boolean>
  openAgreeCancel: () => void
}) {
  const other = tx.viewerRole === 'offerer' ? tx.owner : tx.offerer
  const items: ReactNode[] = []

  if (checking) {
    items.push(
      <div
        key="checking"
        role="status"
        className="flex items-center gap-3 rounded-control bg-mint p-4 text-body text-ink"
      >
        <LoaderCircle aria-hidden className="size-5 shrink-0 animate-spin text-action" />
        Checking the latest status…
      </div>,
    )
  } else if (notice === 'not-done') {
    items.push(
      <Banner key="nd" tone="warning" title="That didn’t go through">
        Nothing changed. Check your connection and try again.
      </Banner>,
    )
  } else if (notice === 'unknown') {
    items.push(
      <Banner
        key="unknown"
        tone="warning"
        title="We couldn’t confirm what happened"
        action={
          <Button variant="secondary" size="sm" onPress={onRetryCheck}>
            Check again
          </Button>
        }
      >
        Check your connection, then check again. Trying again can’t record the same thing twice.
      </Banner>,
    )
  } else if (notice) {
    items.push(
      <Banner key="refused" tone="warning" title={notice.refused}>
        The page now shows the latest state.
      </Banner>,
    )
  }

  if (tx.status === 'AWAITING_HANDOVER') {
    const left = Date.parse(tx.reservationExpiresAt) - now
    if (left > 0 && left < RESERVATION_WARNING_MS) {
      const { label } = relativeDeadline(tx.reservationExpiresAt, now)
      items.push(
        <Banner key="reservation" tone="warning" title={`The reservation ${label.replace('Ends', 'ends')}`}>
          It ends {formatWAT(tx.reservationExpiresAt)}. Confirm before then, or ask to cancel. If neither of you
          confirms, both items are released.
        </Banner>,
      )
    }
    const request = tx.cancellation
    if (request && request.requestedBy === tx[tx.viewerRole].id) {
      items.push(
        <Banner
          key="cancel-mine"
          tone="info"
          title="You asked to cancel"
          action={
            <Button
              variant="secondary"
              size="sm"
              isDisabled={!canAct}
              onPress={() => void act({ kind: 'cancel-withdraw' })}
            >
              Withdraw request
            </Button>
          }
        >
          Waiting for {other.displayName} to answer. Reason: {cancelReasonLabel(request.reason)}.
        </Banner>,
      )
    } else if (request) {
      items.push(
        <Banner
          key="cancel-theirs"
          tone="warning"
          title={`${other.displayName} asked to cancel`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" isDisabled={!canAct} onPress={openAgreeCancel}>
                Agree to cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                isDisabled={!canAct}
                onPress={() => void act({ kind: 'cancel-decline' })}
              >
                Keep the deal
              </Button>
            </div>
          }
        >
          Reason: {cancelReasonLabel(request.reason)}.{request.note && ` “${request.note}”`}
        </Banner>,
      )
    }
  }

  if (tx.status === 'DISPUTED' && tx.dispute) {
    const mine = tx.dispute.openedBy === tx[tx.viewerRole].id
    items.push(
      <Banner key="dispute" tone="warning" title="Under review">
        <span className="flex flex-col gap-1">
          <span>
            {mine
              ? disputeRecorded(tx.dispute.caseRef)
              : `${other.displayName} reported a problem with this deal. Case reference ${tx.dispute.caseRef}. Support will review it and may contact you.`}
          </span>
          <span>Confirming and reviews are paused until support finishes. {copy.supportLimit}</span>
        </span>
      </Banner>,
    )
  }
  if (tx.status === 'CANCELLED') {
    items.push(
      <Banner key="cancelled" tone="info" title="This deal was cancelled">
        {tx.endedReason}
      </Banner>,
    )
  }
  if (tx.status === 'EXPIRED') {
    items.push(
      <Banner
        key="expired"
        tone="warning"
        title="The reservation ended"
        action={
          <ButtonLink to="/support" variant="secondary" size="sm">
            <LifeBuoy aria-hidden className="size-4" />
            Contact support
          </ButtonLink>
        }
      >
        {tx.endedReason}
      </Banner>,
    )
  }

  return items.length ? <div className="flex flex-col gap-3 print:hidden">{items}</div> : null
}
