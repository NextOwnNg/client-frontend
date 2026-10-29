import { Inbox, UserX } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { endsWith, reportReceived } from '@/features/trust/copy'
import { copy } from '@/lib/copy/copy'
import type { ReportReceipt } from '@/types/api'

/** The case reference, what happens next, and the limits of support. No celebration: someone had a problem. */
export function ReportDone({
  receipt,
  blockedName,
  back,
}: {
  receipt: ReportReceipt
  /** Set when the author was blocked in the same step. */
  blockedName: string | null
  back: { to: string; label: string }
}) {
  const { caseRef } = receipt.report
  return (
    <div className="flex flex-col gap-5">
      <div role="status" className="flex items-start gap-3 rounded-card border border-border bg-surface p-4">
        <Inbox aria-hidden className="mt-0.5 size-5 shrink-0 text-action" />
        <div className="flex flex-col gap-1">
          <p className="text-body font-semibold text-ink">
            {receipt.duplicate
              ? `You already reported this. Your case reference is ${caseRef}.`
              : reportReceived(caseRef)}
          </p>
          <p className="text-compact text-muted">
            The safety team reviews reports in order of urgency. You can follow this case in My reports, which shows its
            status.
          </p>
        </div>
      </div>
      {blockedName && (
        <p className="flex items-start gap-2 text-compact text-ink">
          <UserX aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
          You blocked {endsWith(blockedName)} You can unblock them in Settings at any time.
        </p>
      )}
      <p className="text-compact text-muted">{copy.supportLimit}</p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink to="/me/reports">See my reports</ButtonLink>
        <ButtonLink to={back.to} variant="secondary">
          {back.label}
        </ButtonLink>
      </div>
    </div>
  )
}
