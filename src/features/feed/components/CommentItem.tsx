import { Flag } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '@/components/domain/Avatar'
import { timeAgo } from '@/lib/time/time'
import type { FeedComment } from '@/types/api'

/** One comment: author, time and plain text, with Report for other people's. Removed ones are a placeholder. */
export function CommentItem({
  comment,
  now,
  viewerId,
}: {
  comment: FeedComment
  now: number
  viewerId: string | null
}) {
  if (comment.removed) {
    return (
      <li className="rounded-control border border-dashed border-border px-3 py-2 text-compact text-muted">
        This comment was removed by moderators.
      </li>
    )
  }
  return (
    <li className="flex gap-3">
      <Avatar name={comment.author.displayName} src={comment.author.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-compact">
          <Link
            to={`/users/${comment.author.id}`}
            className="font-semibold text-ink underline-offset-4 hover:underline"
          >
            {comment.author.displayName}
          </Link>
          <time dateTime={comment.createdAt} className="text-caption text-muted">
            {timeAgo(comment.createdAt, now)}
          </time>
        </p>
        {/* Plain text: never parsed as HTML, links stay text, long words wrap */}
        <p className="text-body [overflow-wrap:anywhere] break-words whitespace-pre-line text-ink">{comment.body}</p>
      </div>
      {comment.author.id !== viewerId && (
        <Link
          to={`/report/comment/${comment.id}`}
          aria-label={`Report ${comment.author.displayName}’s comment`}
          className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted pointer-fine:hover:bg-mint pointer-fine:hover:text-ink"
        >
          <Flag aria-hidden className="size-4" strokeWidth={1.75} />
        </Link>
      )}
    </li>
  )
}
