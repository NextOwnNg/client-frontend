import { PlainButton } from '@/components/ui/Button'
import { CloudOff, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** Calm empty state that always offers a next step. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon
  title: string
  body?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-mint text-action">
        <Icon aria-hidden className="size-6" />
      </span>
      <h2 className="text-h3 text-ink">{title}</h2>
      {body && <p className="max-w-sm text-body text-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Load failure with a retry. Keeps the page structure so nothing jumps when it recovers. */
export function ErrorState({
  title = "We couldn't load this",
  body = 'Check your connection and try again.',
  onRetry,
}: {
  title?: string
  body?: ReactNode
  onRetry?: () => void
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-cloud text-muted ring-1 ring-border">
        <CloudOff aria-hidden className="size-6" />
      </span>
      <h2 className="text-h3 text-ink">{title}</h2>
      <p className="max-w-sm text-body text-muted">{body}</p>
      {onRetry && (
        <PlainButton variant="secondary" onClick={onRetry} className="mt-2">
          Try again
        </PlainButton>
      )}
    </div>
  )
}
