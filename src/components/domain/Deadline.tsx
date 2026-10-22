import { Timer } from 'lucide-react'
import { cx } from '@/lib/cx'
import { useServerNow } from '@/lib/time/server-clock'
import { formatWAT, relativeDeadline } from '@/lib/time/time'

type DeadlineProps = {
  endsAt: string
  startedAt?: string
  variant: 'compact' | 'detail'
  className?: string
}

/**
 * Quick Sell deadline. The bar's length is the real share of time left (Labanotation raise);
 * it never animates or ticks by the second.
 */
export function Deadline({ endsAt, startedAt, variant, className }: DeadlineProps) {
  const now = useServerNow()
  const { label, ended, fractionLeft } = relativeDeadline(endsAt, now, startedAt)

  if (variant === 'compact') {
    return (
      <span
        className={cx(
          'inline-flex h-6 items-center gap-1 rounded-full px-2 text-caption font-semibold whitespace-nowrap',
          ended ? 'bg-cloud text-muted ring-1 ring-border' : 'bg-highlight text-highlight-foreground',
          className,
        )}
      >
        <Timer aria-hidden className="size-3.5" strokeWidth={2.25} />
        {ended ? (
          'Quick Sell ended'
        ) : (
          <>
            {/* On the narrowest phones the Gold tag and timer carry "Quick Sell"; screen readers still hear it */}
            <span className="max-[379px]:sr-only">Quick Sell · </span>
            {label.replace('Ends in ', '')}
          </>
        )}
      </span>
    )
  }

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <p className="flex items-center gap-1.5 text-compact font-semibold text-ink">
        <Timer aria-hidden className="size-4 text-warning" />
        {ended ? 'Quick Sell ended' : `Quick Sell · ${label}`}
      </p>
      <p className="tabular text-caption text-muted">
        {ended ? 'Ended' : 'Ends'} {formatWAT(endsAt)}
      </p>
      {startedAt && !ended && (
        <span
          aria-hidden
          className="relative h-1 w-full overflow-hidden rounded-full bg-mint"
          style={{ ['--left' as string]: `${Math.round(fractionLeft * 100)}%` }}
        >
          <span className="absolute inset-y-0 left-0 w-(--left) rounded-full bg-highlight" />
        </span>
      )}
    </div>
  )
}
