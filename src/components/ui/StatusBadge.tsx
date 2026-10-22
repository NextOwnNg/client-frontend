import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import type { StatusTone } from '@/lib/copy/status'

const tones: Record<StatusTone, string> = {
  neutral: 'bg-cloud text-muted ring-1 ring-border',
  info: 'bg-mint text-action',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  highlight: 'bg-highlight text-highlight-foreground',
}

/** Status is always text + icon; colour only reinforces it (Brand §2.1). */
export function StatusBadge({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: StatusTone
  icon?: LucideIcon
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex h-6 max-w-full items-center gap-1 rounded-full px-2 text-caption font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={2.25} />}
      <span className="truncate">{children}</span>
    </span>
  )
}
