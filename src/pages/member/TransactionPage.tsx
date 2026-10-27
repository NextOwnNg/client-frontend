import { Button, toast } from '@heroui/react'
import { ArrowLeft, CircleCheck, Flag, LifeBuoy, LoaderCircle, SearchX, Undo2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { ButtonLink } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ProgressLine } from '@/components/ui/ProgressLine'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { FieldErrors } from '@/features/selling/listing-input'
import { useTransaction } from '@/features/transactions/api'
import { AgreementSnapshotView, ExchangeRecord } from '@/features/transactions/components/Agreement'
import { CancelSheet, ConfirmSheet, ReportSheet } from '@/features/transactions/components/DealSheets'
import { MeetingSection } from '@/features/transactions/components/MeetingSection'
import {
  cancelReasonLabel,
  otherRole,
  RESERVATION_WARNING_MS,
  transactionSteps,
} from '@/features/transactions/transaction-view'
import { useTransactionAction, type ActionResult } from '@/features/transactions/use-transaction-action'
import { useOnline } from '@/hooks/useOnline'
import { isMissingOrPrivate } from '@/lib/api/error-checks'
import { copy, disputeRecorded } from '@/lib/copy/copy'
import { transactionStatus } from '@/lib/copy/transaction-status'
import { cx } from '@/lib/cx'
import { useServerNow } from '@/lib/time/server-clock'
import { formatWAT, relativeDeadline } from '@/lib/time/time'
import { useSessionStore } from '@/stores/session'
import type { Transaction } from '@/types/api'

const titles: Record<Transaction['status'], string> = {
  AWAITING_HANDOVER: 'Offer accepted',
  COMPLETED: 'Exchange completed',
  DISPUTED: 'Under review',
  CANCELLED: 'Deal cancelled',
  EXPIRED: 'Reservation ended',
}

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

type Sheet = 'confirm' | 'cancel' | 'report' | 'agree-cancel' | null
type Notice = 'not-done' | 'unknown' | { refused: string } | null

function Deal({ tx, viewerId, onRefetch }: { tx: Transaction; viewerId: string; onRefetch: () => void }) {
  const now = useServerNow()
  const online = useOnline()
  const { run, pending, checking } = useTransactionAction(tx, viewerId)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [caseRef, setCaseRef] = useState<string | null>(null)
  const [reportFailure, setReportFailure] = useState<string | null>(null)

  const me = tx.viewerRole
  const other = me === 'offerer' ? tx.owner : tx.offerer
  const status = transactionStatus(tx)
  const open = tx.status === 'AWAITING_HANDOVER'
  const iConfirmed = Boolean(tx.confirmations[me])
  const theyConfirmed = Boolean(tx.confirmations[otherRole(me)])
  const anyConfirmed = iConfirmed || theyConfirmed
  const canAct = online && !pending

  /** Every action ends here: done, or what happened instead, said plainly (PRD §7.5). */
  async function act(
    action: Parameters<typeof run>[0],
    after?: (result: Extract<ActionResult, { kind: 'done' }>) => void,
  ) {
    setNotice(null)
    const result = await run(action)
    if (result.kind === 'done') {
      setErrors({})
      after?.(result)
      return true
    }
    if (result.kind === 'invalid') setErrors(result.fieldErrors)
    else if (result.kind === 'refused') setNotice({ refused: result.message })
    else if (!(result.kind === 'not-done' && result.silent)) setNotice(result.kind)
    return false
  }

  const closeSheet = () => {
    setSheet(null)
    setErrors({})
  }

  return (
    <article className={cx('flex flex-col gap-6', open && !iConfirmed && 'pb-28 desktop:pb-0')}>
      <Seo title={titles[tx.status]} noindex />
      <Link
        to="/transactions"
        className="-ml-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-control px-2 text-compact font-semibold text-muted transition-colors duration-120 hover:bg-cloud hover:text-ink print:hidden"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Transactions
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusBadge tone={status.tone} icon={status.icon}>
            {status.label}
          </StatusBadge>
          <span className="tabular text-caption text-muted">Transaction {tx.id}</span>
        </div>
        <h1 className="flex items-center gap-2 text-h2 text-balance text-ink tablet:text-h1">
          {tx.status === 'COMPLETED' && (
            <CircleCheck aria-hidden className="size-7 shrink-0 animate-pop text-success tablet:size-9" />
          )}
          {titles[tx.status]}
        </h1>
        <p className="text-body text-muted">
          With {other.displayName} · {tx.viewerRole === 'offerer' ? 'your offer' : 'their offer'} on{' '}
          {tx.agreement.listingItem.title}
        </p>
        {tx.status === 'AWAITING_HANDOVER' && <p className="max-w-prose text-body text-ink">{copy.offerAccepted}</p>}
      </header>

      <Notices
        tx={tx}
        now={now}
        checking={checking}
        notice={notice}
        canAct={canAct}
        onRetryCheck={onRefetch}
        act={act}
        openAgreeCancel={() => setSheet('agree-cancel')}
      />

      <div className="flex flex-col gap-6 desktop:grid desktop:grid-cols-[minmax(0,1fr)_24rem] desktop:items-start desktop:gap-10">
        <div className="flex flex-col gap-6 desktop:col-start-2 desktop:row-start-1">
          <section aria-label="Progress" className="rounded-card border border-border bg-surface p-4 print:hidden">
            <ProgressLine label="Deal progress" steps={transactionSteps(tx)} />
          </section>

          {open && (
            <ConfirmPanel>
              {iConfirmed ? (
                <p className="text-body text-ink">{copy.partialConfirmation}</p>
              ) : (
                <>
                  <p className="text-compact text-ink">
                    {theyConfirmed
                      ? `${other.displayName} has confirmed their side. Confirm yours once you’ve exchanged.`
                      : 'After you meet and exchange, confirm your side. You each confirm separately.'}
                  </p>
                  {!online && <p className="text-compact text-muted">You’re offline. Confirming needs a connection.</p>}
                  <Button isDisabled={!canAct} onPress={() => setSheet('confirm')} className="w-full">
                    Confirm my side
                  </Button>
                </>
              )}
            </ConfirmPanel>
          )}

          {(open || tx.meeting) && (
            <MeetingSection
              meeting={tx.meeting}
              viewerId={viewerId}
              otherName={other.displayName}
              open={open && canAct}
              pending={pending}
              errors={errors}
              transactionId={tx.id}
              onPropose={(meeting) => act({ kind: 'meeting', ...meeting })}
              onAgree={() => void act({ kind: 'agree-meeting' })}
            />
          )}

          {open && <HandoverNotice />}
        </div>

        {/* Once a deal is over, its record comes first on phones; the handover tools matter less */}
        <div
          className={cx(
            'flex flex-col gap-6 desktop:col-start-1 desktop:row-start-1',
            !open && 'order-first desktop:order-none',
          )}
        >
          {tx.status === 'COMPLETED' && <ExchangeRecord tx={tx} />}
          <AgreementSnapshotView tx={tx} />
          <OffRamps
            tx={tx}
            anyConfirmed={anyConfirmed}
            canAct={canAct}
            onCancel={() => setSheet('cancel')}
            onReport={() => {
              setCaseRef(null)
              setReportFailure(null)
              setSheet('report')
            }}
          />
        </div>
      </div>

      {sheet === 'confirm' && (
        <ConfirmSheet
          tx={tx}
          open
          pending={pending}
          onOpenChange={(next) => !next && closeSheet()}
          onConfirm={(checks) => void act({ kind: 'confirm', checks }).then(() => closeSheet())}
        />
      )}
      {sheet === 'cancel' && (
        <CancelSheet
          otherName={other.displayName}
          open
          pending={pending}
          errors={errors}
          onOpenChange={(next) => !next && closeSheet()}
          onSubmit={(reason, note) =>
            void act({ kind: 'cancel-request', reason, note }, () =>
              toast(`Request sent to ${other.displayName}.`),
            ).then((ok) => ok && closeSheet())
          }
        />
      )}
      {sheet === 'report' && (
        <ReportSheet
          open
          pending={pending}
          caseRef={caseRef}
          serverErrors={errors}
          failure={reportFailure}
          onOpenChange={(next) => !next && closeSheet()}
          onSubmit={(report) =>
            void run({ kind: 'dispute', ...report }).then((result) => {
              if (result.kind === 'done') return setCaseRef(result.tx.dispute?.caseRef ?? null)
              if (result.kind === 'invalid') return setErrors(result.fieldErrors)
              setReportFailure(
                result.kind === 'refused'
                  ? result.message
                  : 'Your report wasn’t sent. Check your connection and try again; nothing you typed is lost.',
              )
            })
          }
        />
      )}
      <ConfirmModal
        open={sheet === 'agree-cancel'}
        onOpenChange={(next) => !next && setSheet(null)}
        title="Cancel this deal?"
        body="Both items are released and can take offers again. This can’t be undone."
        confirmLabel="Cancel deal"
        cancelLabel="Go back"
        tone="danger"
        onConfirm={async () => {
          if (!(await act({ kind: 'cancel-accept' }))) throw new Error('not cancelled')
        }}
      />
    </article>
  )
}

/** Fixed above the tab bar on phones so the next step is in reach (UX-21); a card on desktop. */
function ConfirmPanel({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Confirm the exchange"
      className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 flex flex-col gap-2 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm desktop:static desktop:rounded-card desktop:border desktop:bg-surface desktop:p-4 desktop:backdrop-blur-none print:hidden"
    >
      {children}
    </section>
  )
}

/** FE-TRX-04: on every handover screen, with safe-meetup tips a tap away. */
function HandoverNotice() {
  return (
    <section
      aria-label="Before you meet"
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
    >
      <p className="text-compact text-ink">{copy.handoverNotice}</p>
      <details className="group text-compact">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-action underline-offset-4 hover:underline">
          Meeting safely
        </summary>
        <ul className="ml-4 flex list-disc flex-col gap-1 pb-1 text-ink">
          <li>Meet in a busy public place, in daylight if you can, and bring someone along.</li>
          <li>Check the item works before any money changes hands.</li>
          <li>Never share your bank PIN or a one-time code, whatever the reason.</li>
          <li>Keep agreements in the app. Cash is handled between you, and NextOwn can’t reverse a transfer.</li>
        </ul>
      </details>
      <Link
        to="/support"
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-compact font-semibold text-action underline-offset-4 hover:underline"
      >
        <LifeBuoy aria-hidden className="size-4" />
        Safety tips
      </Link>
    </section>
  )
}

function OffRamps({
  tx,
  anyConfirmed,
  canAct,
  onCancel,
  onReport,
}: {
  tx: Transaction
  anyConfirmed: boolean
  canAct: boolean
  onCancel: () => void
  onReport: () => void
}) {
  const open = tx.status === 'AWAITING_HANDOVER'
  const canCancel = open && !anyConfirmed && !tx.cancellation
  const canReport = ['AWAITING_HANDOVER', 'COMPLETED', 'EXPIRED'].includes(tx.status)
  if (!canCancel && !canReport) return null
  return (
    <section aria-labelledby="offramps-heading" className="flex flex-col gap-2 print:hidden">
      <h2 id="offramps-heading" className="text-h3 text-ink">
        Something wrong?
      </h2>
      <p className="text-compact text-muted">
        {canCancel
          ? 'You can ask to cancel before anyone confirms. If something went wrong, report it and support will look into it.'
          : 'Report it and support will look into it. They can pause the deal while they do.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {canCancel && (
          <Button variant="secondary" isDisabled={!canAct} onPress={onCancel}>
            <Undo2 aria-hidden className="size-4" />
            Ask to cancel
          </Button>
        )}
        {canReport && (
          <Button variant="tertiary" isDisabled={!canAct} onPress={onReport}>
            <Flag aria-hidden className="size-4" />
            Report a problem
          </Button>
        )}
      </div>
    </section>
  )
}

function Notices({
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
