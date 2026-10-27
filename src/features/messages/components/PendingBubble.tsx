import { RotateCw } from 'lucide-react'
import { bubbleText } from '@/features/messages/components/bubble-styles'
import type { PendingMessage } from '@/features/messages/use-send-message'
import { cx } from '@/lib/cx'

/** A message the server doesn't have yet: "Sending…", or "Not sent" with Retry and Remove (FE-MSG-02). */
export function PendingBubble({
  message,
  onRetry,
  onDiscard,
}: {
  message: PendingMessage
  onRetry: () => void
  onDiscard: () => void
}) {
  const failed = message.status === 'failed'
  return (
    <div className="flex flex-col items-end gap-1">
      <p
        className={cx(
          'max-w-[85%] rounded-card rounded-br-small px-3 py-2',
          bubbleText,
          failed ? 'border border-danger/40 bg-surface text-ink' : 'bg-action/70 text-action-foreground',
        )}
      >
        {message.body}
      </p>
      {failed ? (
        <p className="flex flex-wrap items-center justify-end gap-x-1 text-caption">
          <span className="font-semibold text-danger">Not sent.</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-8 items-center gap-1 rounded-control px-1.5 font-semibold text-action pointer-fine:hover:bg-mint"
          >
            <RotateCw aria-hidden className="size-3.5" />
            Retry
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex min-h-8 items-center rounded-control px-1.5 text-muted pointer-fine:hover:bg-cloud"
          >
            Remove
          </button>
        </p>
      ) : (
        <span className="px-1 text-caption text-muted">Sending…</span>
      )}
    </div>
  )
}
