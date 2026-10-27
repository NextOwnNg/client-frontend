import { ChevronLeft, Flag, Info, Lock, SearchX, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useConversation, useMarkConversationRead } from '@/features/messages/api'
import { EventLine } from '@/features/messages/components/EventLine'
import { MessageComposer } from '@/features/messages/components/MessageComposer'
import { OfferCardBubble } from '@/features/messages/components/OfferCardBubble'
import { PendingBubble } from '@/features/messages/components/PendingBubble'
import { TextBubble } from '@/features/messages/components/TextBubble'
import { useSendMessage } from '@/features/messages/use-send-message'
import { ItemThumb } from '@/features/offers/components/OfferParts'
import { useOnline } from '@/hooks/useOnline'
import { isMissingOrPrivate } from '@/lib/api/error-checks'
import { copy } from '@/lib/copy/copy'
import { useServerNow } from '@/lib/time/server-clock'
import { useSessionStore } from '@/stores/session'
import type { ConversationDetail } from '@/types/api'

/** Where the deal or offer behind the chat stands, when it's no longer open (ruling R6-7). */
function contextLine(conv: ConversationDetail): { text: string; to: string; link: string } | null {
  const deal = conv.transactionId && `/transactions/${conv.transactionId}`
  switch (conv.transactionStatus) {
    case 'COMPLETED':
      return {
        text: 'You both confirmed this exchange. Messages stay open for follow-ups.',
        to: deal!,
        link: 'View the record',
      }
    case 'CANCELLED':
      return { text: 'This deal was cancelled.', to: deal!, link: 'View the deal' }
    case 'EXPIRED':
      return { text: 'The reservation for this deal ended.', to: deal!, link: 'View the deal' }
    case 'DISPUTED':
      return { text: 'This deal is under review by support.', to: deal!, link: 'View the deal' }
  }
  if (conv.offerStatus !== 'PENDING' && conv.offerStatus !== 'ACCEPTED') {
    return { text: 'This offer is closed.', to: `/offers/${conv.offerId}`, link: 'View the offer' }
  }
  return null
}

/** Announces the other person's new messages, but not the ones already there when the thread opened. */
function useArrivals(conv: ConversationDetail | undefined, viewerId: string) {
  const seen = useRef<Set<string> | null>(null)
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => {
    if (!conv) return
    if (!seen.current) {
      seen.current = new Set(conv.messages.map((m) => m.id))
      return
    }
    const fresh = conv.messages.filter((m) => !seen.current!.has(m.id))
    fresh.forEach((m) => seen.current!.add(m.id))
    const theirs = fresh.filter((m) => m.senderId === conv.other.id && m.kind === 'text' && !m.moderated)
    const last = theirs.at(-1)
    if (last) setAnnouncement(`New message from ${conv.other.displayName}: ${last.body}`)
  }, [conv, viewerId])
  return announcement
}

/** UX-20: one conversation, tied to its listing and offer. Terms are agreed on offer cards, never in text. */
export function ConversationPage() {
  const { id = '' } = useParams()
  const viewerId = useSessionStore((s) => s.userId) ?? ''
  const { data: conv, isPending, isError, error, refetch } = useConversation(id)
  const { pending, send, retry, discard } = useSendMessage(id)
  const markRead = useMarkConversationRead(id)
  const online = useOnline()
  const now = useServerNow(30_000)
  const announcement = useArrivals(conv, viewerId)
  const end = useRef<HTMLDivElement>(null)
  const count = (conv?.messages.length ?? 0) + pending.length

  // Reading the thread clears its unread count
  const unread = conv?.unreadCount ?? 0
  const { mutate: markAsRead } = markRead
  useEffect(() => {
    if (unread > 0) markAsRead()
  }, [unread, markAsRead])

  // Newest at the bottom, as in any chat
  useEffect(() => {
    if (count === 0) return
    // After the router restores scroll for the new page, or the newest message would be pushed off screen
    const frame = requestAnimationFrame(() => end.current?.scrollIntoView?.({ block: 'end' }))
    return () => cancelAnimationFrame(frame)
  }, [count])

  if (isPending) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading the conversation"
        className="h-96 animate-pulse rounded-card bg-cloud"
      />
    )
  }
  if (isError && !conv) {
    if (isMissingOrPrivate(error)) {
      return (
        <EmptyState
          icon={SearchX}
          title="We couldn’t find that conversation"
          body="It may not exist, or it isn’t one of yours."
          action={<ButtonLink to="/messages">Go to your messages</ButtonLink>}
        />
      )
    }
    return <ErrorState title="We couldn't load this conversation" onRetry={() => void refetch()} />
  }

  const context = contextLine(conv)
  const delivered = new Set(conv.messages.map((m) => m.clientId))
  const waiting = pending.filter((m) => !delivered.has(m.clientId))
  const reconnecting = !online || isError

  return (
    <div className="flex flex-col">
      <Seo title={`Messages with ${conv.other.displayName}`} noindex />
      <Link
        to="/messages"
        className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-control px-2 text-compact font-semibold text-action desktop:hidden"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Messages
      </Link>

      <header className="flex items-center gap-3 border-b border-border pb-4">
        <ItemThumb url={conv.listing.cover.url} size="sm" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-h3 text-ink">{conv.other.displayName}</h1>
          <Link
            to={`/listings/${conv.listing.slug}`}
            className="block truncate text-compact text-muted underline-offset-4 hover:underline"
          >
            {conv.listing.title}
          </Link>
          <Link
            to={conv.transactionId ? `/transactions/${conv.transactionId}` : `/offers/${conv.offerId}`}
            className="text-compact font-semibold text-action underline-offset-4 hover:underline"
          >
            {conv.transactionId ? 'View the deal' : 'View the offer'}
          </Link>
        </div>
        <Link
          to={`/report/conversation/${conv.id}`}
          aria-label={`Report this conversation with ${conv.other.displayName}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted pointer-fine:hover:bg-mint pointer-fine:hover:text-ink"
        >
          <Flag aria-hidden className="size-4.5" strokeWidth={1.75} />
        </Link>
      </header>

      {/* FE-MSG-03: in every thread, always visible */}
      <p className="flex items-start gap-2 border-b border-border py-3 text-compact text-ink">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
        {copy.chatNote}
      </p>

      {context && (
        <p className="mt-3 rounded-control bg-cloud px-3 py-2 text-compact text-ink">
          {context.text}{' '}
          <Link to={context.to} className="font-semibold text-action underline-offset-4 hover:underline">
            {context.link}
          </Link>
        </p>
      )}

      <ol aria-label="Messages" className="flex flex-col gap-4 py-5">
        {conv.messages.map((m) => (
          <li key={m.id} className="flex flex-col">
            {m.kind === 'offer' ? (
              <OfferCardBubble
                message={m}
                viewerId={viewerId}
                viewerRole={conv.viewerRole}
                otherName={conv.other.displayName}
                now={now}
              />
            ) : m.kind === 'event' ? (
              <EventLine message={m} />
            ) : (
              <TextBubble message={m} mine={m.senderId === viewerId} now={now} />
            )}
          </li>
        ))}
        {waiting.map((m) => (
          <li key={m.clientId} className="flex flex-col">
            <PendingBubble message={m} onRetry={() => retry(m.clientId)} onDiscard={() => discard(m.clientId)} />
          </li>
        ))}
      </ol>
      {/* Clears the sticky composer and the phone's bottom nav when scrolled into view */}
      <div ref={end} className="scroll-mb-[calc(64px+6rem+env(safe-area-inset-bottom))] desktop:scroll-mb-28" />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] -mx-4 flex flex-col gap-2 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm tablet:-mx-6 tablet:px-6 desktop:bottom-0 desktop:mx-0 desktop:px-0">
        {reconnecting && (
          <p role="status" className="flex items-center gap-2 text-compact text-muted">
            <WifiOff aria-hidden className="size-4 shrink-0 text-warning" />
            Reconnecting… New messages will appear when you’re back online.
          </p>
        )}
        {conv.blocked === 'none' ? (
          <MessageComposer onSend={send} />
        ) : (
          <p className="flex items-start gap-2 text-compact text-ink">
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
            {conv.blocked === 'by-them'
              ? 'You can’t send messages in this conversation. You can still read it, and your offers and deals stay on their own pages.'
              : `You blocked ${conv.other.displayName}, so neither of you can send messages here.`}
          </p>
        )}
      </div>
    </div>
  )
}
