import { Button, toast } from '@heroui/react'
import { ArrowLeft, CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { Seo } from '@/components/seo/Seo'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ProgressLine } from '@/components/ui/ProgressLine'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { FieldErrors } from '@/features/selling/listing-input'
import { AgreementSnapshotView, ExchangeRecord } from '@/features/transactions/components/Agreement'
import { CancelSheet } from '@/features/transactions/components/CancelSheet'
import { ConfirmSheet } from '@/features/transactions/components/ConfirmSheet'
import { ReportSheet } from '@/features/transactions/components/ReportProblemSheet'
import { MeetingSection } from '@/features/transactions/components/MeetingSection'
import { otherRole, transactionSteps } from '@/features/transactions/transaction-view'
import { useTransactionAction, type ActionResult } from '@/features/transactions/use-transaction-action'
import { useOnline } from '@/hooks/useOnline'
import { copy } from '@/lib/copy/copy'
import { transactionStatus } from '@/lib/copy/transaction-status'
import { cx } from '@/lib/cx'
import { useServerNow } from '@/lib/time/server-clock'
import type { Transaction } from '@/types/api'
import { type Notice, DealNotices } from '@/features/transactions/components/DealNotices'
import { ConfirmPanel } from '@/features/transactions/components/ConfirmPanel'
import { HandoverNotice } from '@/features/transactions/components/HandoverNotice'
import { OffRamps } from '@/features/transactions/components/OffRamps'

const titles: Record<Transaction['status'], string> = {
  AWAITING_HANDOVER: 'Offer accepted',
  COMPLETED: 'Exchange completed',
  DISPUTED: 'Under review',
  CANCELLED: 'Deal cancelled',
  EXPIRED: 'Reservation ended',
}

type Sheet = 'confirm' | 'cancel' | 'report' | 'agree-cancel' | null

export function Deal({ tx, viewerId, onRefetch }: { tx: Transaction; viewerId: string; onRefetch: () => void }) {
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

      {/* Letterhead for the printed record: printing hides the site header and its logo */}
      <div className="hidden border-b border-border pb-4 print:block">
        <Logo height={32} />
      </div>

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

      <DealNotices
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
