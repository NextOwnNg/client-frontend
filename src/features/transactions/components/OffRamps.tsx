import { Button } from '@heroui/react'
import { Flag, Undo2 } from 'lucide-react'
import type { Transaction } from '@/types/api'

export function OffRamps({
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
