import { Handshake, RotateCw, SendHorizontal } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { ButtonLink } from '@/components/ui/Button'
import { MESSAGE_MAX } from '@/features/messages/message-limits'
import type { PendingMessage } from '@/features/messages/use-send-message'
import { tradeSentence } from '@/features/offers/offer-terms'
import { cx } from '@/lib/cx'
import { timeAgo } from '@/lib/time/time'
import type { ChatMessage, OfferStatus } from '@/types/api'

const closedLabels: Record<Exclude<OfferStatus, 'PENDING'>, string> = {
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
  CLOSED_UNAVAILABLE: 'No longer available',
}

/** Plain text only: React escapes it, links stay text, and long words wrap (FE-MSG-04). */
const textClass = 'text-body break-words whitespace-pre-line [overflow-wrap:anywhere]'

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
            textClass,
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
          textClass,
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

/**
 * An offer version in the thread (ruling R6-6). Its terms come from the offer, never from typed text, and it
 * opens the offer page, where accepting and countering check the version is still current.
 */
export function OfferCardBubble({
  message,
  viewerId,
  viewerRole,
  otherName,
  now,
}: {
  message: ChatMessage
  viewerId: string
  viewerRole: 'offerer' | 'owner'
  otherName: string
  now: number
}) {
  const card = message.offer!
  const byMe = card.authorId === viewerId
  const status = !card.current
    ? 'Earlier version'
    : card.offerStatus === 'PENDING'
      ? byMe
        ? `Waiting for ${otherName}`
        : 'Your decision'
      : closedLabels[card.offerStatus]
  const decide = card.current && card.offerStatus === 'PENDING' && !byMe

  return (
    <section
      aria-label={`Offer, version ${card.versionNumber}`}
      className={cx(
        'mx-auto flex w-full max-w-md flex-col gap-2 rounded-card border bg-surface p-4',
        card.current ? 'border-action/40' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption font-semibold tracking-wide text-muted uppercase">
          {card.versionNumber === 1 ? 'Offer' : 'Counteroffer'} · version {card.versionNumber}
        </p>
        <span
          className={cx(
            'rounded-full px-2 text-caption leading-6 font-semibold',
            card.current ? 'bg-mint text-action' : 'bg-cloud text-muted',
          )}
        >
          {status}
        </span>
      </div>
      <p className={cx('text-body font-semibold', card.current ? 'text-ink' : 'text-muted')}>
        {tradeSentence(
          { terms: card.terms, listingTitle: card.listingTitle, itemTitle: card.itemTitle },
          viewerRole,
          card.offerStatus === 'ACCEPTED',
        )}
      </p>
      <p className="text-caption text-muted">
        From {byMe ? 'you' : otherName} · {timeAgo(message.createdAt, now)}
      </p>
      {card.current && (
        <ButtonLink
          to={`/offers/${card.offerId}`}
          variant={decide ? 'primary' : 'secondary'}
          size="sm"
          className="self-start"
        >
          {decide ? 'Review offer' : 'Open offer'}
        </ButtonLink>
      )}
    </section>
  )
}

export function EventLine({ message }: { message: ChatMessage }) {
  return (
    <p className="mx-auto flex max-w-md items-start gap-2 rounded-control bg-mint px-3 py-2 text-compact text-ink">
      <Handshake aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
      <span>
        {message.body}{' '}
        {message.link && (
          <Link
            to={message.link}
            className="font-semibold whitespace-nowrap text-action underline-offset-4 hover:underline"
          >
            View the deal
          </Link>
        )}
      </span>
    </p>
  )
}

/** Keyboard-resilient composer: it grows with the text and stays above the keyboard and bottom nav. */
export function Composer({ onSend }: { onSend: (body: string) => void }) {
  const [body, setBody] = useState('')
  const trimmed = body.trim()

  function submit() {
    if (!trimmed) return
    onSend(trimmed)
    setBody('')
  }

  // Enter sends with a keyboard and mouse; on touch screens Enter is a new line and the button sends
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex items-end gap-2"
    >
      <label htmlFor="message-body" className="sr-only">
        Message
      </label>
      <textarea
        id="message-body"
        rows={1}
        maxLength={MESSAGE_MAX}
        value={body}
        placeholder="Write a message"
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        className="field-input [field-sizing:content] h-auto max-h-36 min-h-11 flex-1 resize-none py-2.5 leading-6"
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={!trimmed}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-action text-action-foreground transition-[transform,opacity] duration-120 ease-out active:scale-95 disabled:opacity-40"
      >
        <SendHorizontal aria-hidden className="size-5" />
      </button>
    </form>
  )
}
