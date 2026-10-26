import { Button } from '@heroui/react'
import { Flag, Info } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/domain/Avatar'
import { ButtonLink } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { useAddComment, useComments } from '@/features/feed/api'
import { COMMENT_MAX } from '@/features/feed/feed-limits'
import { isApiError } from '@/lib/api/api-error'
import { copy } from '@/lib/copy/copy'
import { isAvailable } from '@/lib/copy/status'
import { serverNow } from '@/lib/time/server-clock'
import { timeAgo } from '@/lib/time/time'
import { useSessionStore } from '@/stores/session'
import type { FeedComment, FeedPost } from '@/types/api'

function Comment({ comment, now, viewerId }: { comment: FeedComment; now: number; viewerId: string | null }) {
  if (comment.removed) {
    return (
      <li className="rounded-control border border-dashed border-border px-3 py-2 text-compact text-muted">
        This comment was removed by moderators.
      </li>
    )
  }
  return (
    <li className="flex gap-3">
      <Avatar name={comment.author.displayName} />
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

function Composer({ post }: { post: FeedPost }) {
  const add = useAddComment(post.id)
  const [body, setBody] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const trimmed = body.trim()

  async function submit() {
    if (!trimmed) {
      setProblem('Write a comment first.')
      return
    }
    setProblem(null)
    try {
      await add.mutateAsync(trimmed)
      setBody('')
    } catch (error) {
      // The draft stays, so nothing typed is lost
      setProblem(
        isApiError(error) && error.status === 429
          ? 'You’re commenting quickly. Wait a minute, then try again.'
          : isApiError(error) && error.fieldErrors?.body
            ? error.fieldErrors.body
            : 'Your comment wasn’t posted. Check your connection and try again.',
      )
    }
  }

  return (
    <form
      noValidate
      className="flex w-full flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <label htmlFor={`comment-${post.id}`} className="sr-only">
        Add a comment
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id={`comment-${post.id}`}
          rows={1}
          maxLength={COMMENT_MAX}
          value={body}
          placeholder="Ask about the item"
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? `comment-${post.id}-problem` : undefined}
          onChange={(e) => setBody(e.target.value)}
          className="field-input [field-sizing:content] h-auto max-h-32 min-h-11 flex-1 resize-none py-2.5 leading-6"
        />
        <Button type="submit" isPending={add.isPending} className="shrink-0">
          Post
        </Button>
      </div>
      {problem && (
        <p id={`comment-${post.id}-problem`} role="alert" className="text-compact text-danger">
          {problem}
        </p>
      )}
    </form>
  )
}

/**
 * UX-06: a post's comments in a sheet. Newest first; the "not tracked" note stays pinned above the composer,
 * so a question never looks like a way to agree terms (FE-FED-03).
 */
export function CommentsSheet({ post, onClose }: { post: FeedPost | null; onClose: () => void }) {
  const viewerId = useSessionStore((s) => s.userId)
  const status = useSessionStore((s) => s.status)
  const { data, isPending, isError, refetch } = useComments(post?.id ?? '', Boolean(post))
  const now = serverNow()
  const listing = post?.listing

  return (
    <Sheet
      open={post !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Comments"
      footer={
        post && (
          <div className="flex w-full flex-col gap-3">
            <p className="flex items-start gap-2 text-compact text-muted">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
              {copy.commentsNote}
            </p>
            {status === 'member' ? (
              <Composer key={post.id} post={post} />
            ) : (
              <ButtonLink to={`/login?next=${encodeURIComponent(`/feed?post=${post.id}`)}`} fullWidth>
                Sign in to comment
              </ButtonLink>
            )}
          </div>
        )
      }
    >
      {listing && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-control bg-cloud px-3 py-2">
          <p className="min-w-0 truncate text-compact text-ink">
            <span className="font-semibold">{listing.title}</span>
            {!isAvailable(listing.status) && <span className="text-muted"> · Not accepting offers</span>}
          </p>
          <Link
            to={`/listings/${listing.slug}`}
            className="shrink-0 text-compact font-semibold text-action underline-offset-4 hover:underline"
          >
            View item
          </Link>
        </div>
      )}
      {isPending ? (
        <div aria-busy="true" aria-label="Loading comments" className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-control bg-cloud" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p className="text-compact text-ink">We couldn’t load the comments.</p>
          <Button variant="secondary" size="sm" onPress={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : data.length === 0 ? (
        <p className="text-compact text-muted">No comments yet. Ask the first question.</p>
      ) : (
        <ul aria-label="Comments, newest first" className="flex flex-col gap-4">
          {data.map((comment) => (
            <Comment key={comment.id} comment={comment} now={now} viewerId={viewerId} />
          ))}
        </ul>
      )}
    </Sheet>
  )
}
