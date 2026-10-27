import { bubbleText } from '@/features/messages/components/bubble-styles'
import { cx } from '@/lib/cx'
import { timeAgo } from '@/lib/time/time'
import type { ChatMessage } from '@/types/api'

/** A sent message: the reader's on the right in Teal, the other person's on the left. */
export function TextBubble({
  message,
  mine,
  now,
}: {
  message: Pick<ChatMessage, 'body' | 'moderated' | 'createdAt'>
  mine: boolean
  now: number
}) {
  return (
    <div className={cx('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
      {message.moderated ? (
        <p className="max-w-[85%] rounded-card border border-dashed border-border px-3 py-2 text-compact text-muted">
          This message was removed by moderators.
        </p>
      ) : (
        <p
          className={cx(
            'max-w-[85%] rounded-card px-3 py-2',
            bubbleText,
            mine
              ? 'rounded-br-small bg-action text-action-foreground'
              : 'rounded-bl-small border border-border bg-surface text-ink',
          )}
        >
          {message.body}
        </p>
      )}
      <time dateTime={message.createdAt} className="px-1 text-caption text-muted">
        {mine ? 'Sent · ' : ''}
        {timeAgo(message.createdAt, now)}
      </time>
    </div>
  )
}
