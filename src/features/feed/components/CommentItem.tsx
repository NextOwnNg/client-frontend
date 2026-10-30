import { Flag } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/domain/Avatar'
import { timeAgo } from '@/lib/time/time'
import type { FeedComment } from '@/types/api'

/**
 * One comment: author, time and plain text, with Reply for members and Report for other people's.
 * Removed ones are a placeholder. `replies` is the comment's thread, nested under it.
 */
export function CommentItem({
  comment,
  now,
  viewerId,
  onReply,
  replies,
}: {
  comment: FeedComment
  now: number
  viewerId: string | null
  /** Absent for guests, who sign in to take part. */
  onReply?: (comment: FeedComment) => void
  replies?: ReactNode
}) {
  if (comment.removed) {
    return (
      <li>
        <p className="rounded-control border border-dashed border-border px-3 py-2 text-compact text-muted">
          This comment was removed by moderators.
        </p>
        {replies}
      </li>
    )
  }
  const name = comment.author.displayName
  return (
    <li>
      <div className="flex gap-3">
        <Avatar name={name} src={comment.author.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 text-compact">
            <Link
              to={`/users/${comment.author.id}`}
              className="font-semibold text-ink underline-offset-4 hover:underline"
            >
              {name}
            </Link>
            <time dateTime={comment.createdAt} className="text-caption text-muted">
              {timeAgo(comment.createdAt, now)}
            </time>
          </p>
          {/* Plain text: never parsed as HTML, links stay text, long words wrap */}
          <p className="text-body [overflow-wrap:anywhere] break-words whitespace-pre-line text-ink">{comment.body}</p>
          {onReply && (
            <button
              type="button"
              aria-label={`Reply to ${name}`}
              onClick={() => onReply(comment)}
              className="-ml-2 inline-flex min-h-11 items-center rounded-control px-2 text-compact font-semibold text-muted transition-colors duration-120 hover:bg-cloud hover:text-ink"
            >
              Reply
            </button>
          )}
        </div>
        {comment.author.id !== viewerId && (
          <Link
            to={`/report/comment/${comment.id}`}
            aria-label={`Report ${name}’s comment`}
            className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted pointer-fine:hover:bg-mint pointer-fine:hover:text-ink"
          >
            <Flag aria-hidden className="size-4" strokeWidth={1.75} />
          </Link>
        )}
      </div>
      {replies}
    </li>
  )
}

/** A comment's replies, oldest first, set in under it with a rule so the thread reads as one conversation. */
export function CommentReplies({ to, children }: { to: FeedComment; children: ReactNode }) {
  return (
    <ul
      aria-label={`Replies to ${to.removed ? 'a removed comment' : to.author.displayName}`}
      className="mt-3 ml-5 flex flex-col gap-4 border-l-2 border-border pl-4"
    >
      {children}
    </ul>
  )
}
