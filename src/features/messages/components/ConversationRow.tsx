import { Link } from 'react-router'
import { ItemThumb } from '@/features/offers/components/OfferParts'
import { cx } from '@/lib/cx'
import { timeAgo } from '@/lib/time/time'
import { useSessionStore } from '@/stores/session'
import type { Conversation } from '@/types/api'

function preview(conv: Conversation, viewerId: string | null) {
  const last = conv.lastMessage
  if (!last) return 'No messages yet'
  if (last.kind === 'offer' || last.kind === 'event') return last.body
  const text = last.body || 'Message removed by moderators'
  return last.senderId === viewerId ? `You: ${text}` : text
}

/** One conversation in the inbox: the other person, the item, the latest message and any unread count. */
export function ConversationRow({ conv, active, now }: { conv: Conversation; active: boolean; now: number }) {
  const viewerId = useSessionStore((s) => s.userId)
  const unread = conv.unreadCount > 0
  return (
    <Link
      to={`/messages/${conv.id}`}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex gap-3 rounded-card border p-3 transition-colors duration-120',
        active ? 'border-action bg-mint/40' : 'border-border bg-surface pointer-fine:hover:border-action/40',
      )}
    >
      <ItemThumb url={conv.listing.cover.url} size="sm" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cx('truncate text-body text-ink', unread ? 'font-bold' : 'font-semibold')}>
            {conv.other.displayName}
          </span>
          {conv.lastMessage && (
            <time dateTime={conv.lastMessage.createdAt} className="shrink-0 text-caption text-muted">
              {timeAgo(conv.lastMessage.createdAt, now)}
            </time>
          )}
        </span>
        <span className="truncate text-compact text-muted">{conv.listing.title}</span>
        <span className="flex items-center justify-between gap-2">
          <span className={cx('truncate text-compact', unread ? 'font-semibold text-ink' : 'text-muted')}>
            {preview(conv, viewerId)}
          </span>
          {unread && (
            <span className="tabular shrink-0 rounded-full bg-action px-1.5 text-caption leading-5 font-semibold text-action-foreground">
              {conv.unreadCount}
              <span className="sr-only"> unread</span>
            </span>
          )}
        </span>
      </span>
    </Link>
  )
}
