import { useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  CalendarClock,
  CircleCheck,
  CircleSlash,
  Flag,
  Handshake,
  Inbox,
  MessageCircle,
  Reply,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink, PlainButton } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { openNotification, useMarkAllRead, useNotifications } from '@/features/notifications/api'
import { cx } from '@/lib/cx'
import { useServerNow } from '@/lib/time/server-clock'
import { timeAgo } from '@/lib/time/time'
import type { NotificationKind } from '@/types/api'

const icons: Record<NotificationKind, LucideIcon> = {
  OFFER_RECEIVED: Inbox,
  OFFER_COUNTERED: Reply,
  OFFER_ACCEPTED: Handshake,
  OFFER_DECLINED: CircleSlash,
  OFFER_WITHDRAWN: Undo2,
  MEETING_UPDATED: CalendarClock,
  CONFIRMED: CircleCheck,
  CANCEL_REQUESTED: CircleSlash,
  DISPUTE_OPENED: Flag,
  MESSAGE: MessageCircle,
  COMMENT: MessageCircle,
}

/**
 * UX-26: `/notifications`. Each alert says what happened at the time; opening it shows where things stand now,
 * so an old "accepted" alert never offers an action the deal no longer allows (FE-NTF-01, ruling R6-8).
 */
export function NotificationsPage() {
  const queryClient = useQueryClient()
  const now = useServerNow()
  const { data, isPending, isError, refetch } = useNotifications()
  const markAll = useMarkAllRead()
  const unread = data?.filter((n) => !n.read).length ?? 0

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Seo title="Notifications" noindex />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 text-ink tablet:text-h1">Notifications</h1>
          <p className="text-compact text-muted" aria-live="polite">
            {data ? (unread === 0 ? 'You’re all caught up.' : `${unread} unread`) : ''}
          </p>
        </div>
        {unread > 0 && (
          <PlainButton variant="secondary" size="sm" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
            Mark all as read
          </PlainButton>
        )}
      </div>

      {isPending ? (
        <div aria-busy="true" aria-label="Loading notifications" className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-18 animate-pulse rounded-card bg-cloud" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="We couldn't load your notifications" onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          body="Offers, counteroffers, meeting updates and confirmations will show up here."
          action={<ButtonLink to="/explore">Explore items</ButtonLink>}
        />
      ) : (
        <ul aria-label="Notifications" className="flex flex-col gap-2">
          {data.map((n) => {
            const Icon = icons[n.kind]
            return (
              <li key={n.id}>
                <Link
                  to={n.link}
                  onClick={() => openNotification(queryClient, n)}
                  className={cx(
                    'flex items-start gap-3 rounded-card border p-3 transition-colors duration-120 pointer-fine:hover:border-action/40',
                    n.read ? 'border-border bg-surface' : 'border-action/30 bg-mint/40',
                  )}
                >
                  <span
                    className={cx(
                      'flex size-10 shrink-0 items-center justify-center rounded-full',
                      n.read ? 'bg-cloud text-muted' : 'bg-mint text-action',
                    )}
                  >
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cx('text-body text-ink', n.read ? 'font-medium' : 'font-semibold')}>
                      {n.title}
                      {!n.read && <span className="sr-only"> (unread)</span>}
                    </span>
                    {n.body && <span className="truncate text-compact text-muted">{n.body}</span>}
                    <time dateTime={n.createdAt} className="text-caption text-muted">
                      {timeAgo(n.createdAt, now)}
                    </time>
                  </span>
                  {!n.read && <span aria-hidden className="mt-2 size-2.5 shrink-0 rounded-full bg-action" />}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
