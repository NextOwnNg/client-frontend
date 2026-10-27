import { LifeBuoy } from 'lucide-react'
import { Link } from 'react-router'
import { copy } from '@/lib/copy/copy'

/** FE-TRX-04: on every handover screen, with safe-meetup tips a tap away. */
export function HandoverNotice() {
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
