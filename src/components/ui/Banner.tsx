import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

type BannerTone = 'info' | 'success' | 'warning' | 'danger'

const tones: Record<BannerTone, { className: string; icon: LucideIcon; role: 'status' | 'alert' }> = {
  info: { className: 'bg-mint text-ink', icon: Info, role: 'status' },
  success: { className: 'bg-success/10 text-ink', icon: CircleCheck, role: 'status' },
  warning: { className: 'bg-warning/10 text-ink', icon: TriangleAlert, role: 'alert' },
  danger: { className: 'bg-danger/10 text-ink', icon: CircleAlert, role: 'alert' },
}

const iconColour: Record<BannerTone, string> = {
  info: 'text-action',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

/** Persistent inline message. Critical transaction errors use this, never an auto-dismissing toast. */
export function Banner({
  tone,
  title,
  children,
  action,
  className,
}: {
  tone: BannerTone
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const { className: toneClass, icon: Icon, role } = tones[tone]
  return (
    <div role={role} className={cx('flex gap-3 rounded-control p-4', toneClass, className)}>
      <Icon aria-hidden className={cx('mt-0.5 size-5 shrink-0', iconColour[tone])} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-body font-semibold">{title}</p>
        {children && <div className="text-compact text-muted">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}
