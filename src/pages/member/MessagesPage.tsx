import { MessageCircle, MessagesSquare, SearchX } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, Outlet, useMatch, useNavigate, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useConversations, useOpenConversation } from '@/features/messages/api'
import { ItemThumb } from '@/features/offers/components/OfferParts'
import { cx } from '@/lib/cx'
import { useServerNow } from '@/lib/time/server-clock'
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

function ConversationRow({ conv, active, now }: { conv: Conversation; active: boolean; now: number }) {
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

/**
 * UX-20: `/messages` and `/messages/:id`. Phones show the inbox or one conversation; from 1024px the inbox
 * stays on the left with the open conversation beside it, as in Offers.
 */
export function MessagesLayout() {
  const thread = useMatch('/messages/:id')
  const [params] = useSearchParams()
  // Opening from an offer or a deal counts as open, so phones show its progress instead of the inbox
  const open = Boolean(thread) || params.has('offer') || params.has('transaction')
  const now = useServerNow()
  const { data, isPending, isError, refetch } = useConversations()
  const Heading = open ? 'h2' : 'h1'

  return (
    <div className="mx-auto w-full max-w-content desktop:grid desktop:grid-cols-[22rem_minmax(0,1fr)] desktop:items-start desktop:gap-8">
      {!open && <Seo title="Messages" noindex />}
      <div className={cx('flex flex-col gap-5', open && 'hidden desktop:flex')}>
        <Heading className="text-h2 text-ink tablet:text-h1 desktop:text-h2">Messages</Heading>
        {isPending ? (
          <div aria-busy="true" aria-label="Loading your messages" className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-cloud" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="We couldn't load your messages" onRetry={() => void refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No messages yet"
            body="Conversations start from an offer or a deal, so the terms always sit beside the chat."
            action={<ButtonLink to="/offers">Go to your offers</ButtonLink>}
          />
        ) : (
          <ul aria-label="Conversations" className="flex flex-col gap-2">
            {data.map((conv) => (
              <li key={conv.id}>
                <ConversationRow conv={conv} active={thread?.params.id === conv.id} now={now} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={cx('min-w-0', !open && 'hidden desktop:block')}>
        <Outlet />
      </div>
    </div>
  )
}

/**
 * `/messages` with nothing open. Arriving with `?offer=` or `?transaction=` (from an offer or a deal) finds or
 * starts that conversation and opens it.
 */
export function MessagesIndex() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const openConversation = useOpenConversation()
  const offerId = params.get('offer')
  const transactionId = params.get('transaction')
  const asked = useRef(false)

  useEffect(() => {
    if (asked.current || (!offerId && !transactionId)) return
    asked.current = true
    openConversation.mutate(offerId ? { offerId } : { transactionId: transactionId! }, {
      onSuccess: (id) => void navigate(`/messages/${id}`, { replace: true }),
    })
  }, [offerId, transactionId, openConversation, navigate])

  if (offerId || transactionId) {
    if (openConversation.isError) {
      return (
        <EmptyState
          icon={SearchX}
          title="We couldn’t open that conversation"
          body="The offer or deal may not exist, or it isn’t one of yours."
          action={<ButtonLink to="/messages">Go to your messages</ButtonLink>}
        />
      )
    }
    return <p className="py-12 text-center text-compact text-muted">Opening the conversation…</p>
  }
  return (
    <div className="hidden desktop:block">
      <EmptyState
        icon={MessageCircle}
        title="Choose a conversation"
        body="Pick one on the left to read it and reply."
      />
    </div>
  )
}
