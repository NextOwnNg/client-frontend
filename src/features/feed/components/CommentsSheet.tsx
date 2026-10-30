import { Button } from '@heroui/react'
import { Info } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { ButtonLink } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { useComments } from '@/features/feed/api'
import { commentThreads } from '@/features/feed/comment-threads'
import { CommentComposer } from '@/features/feed/components/CommentComposer'
import { CommentItem, CommentReplies } from '@/features/feed/components/CommentItem'
import { copy } from '@/lib/copy/copy'
import { isAvailable } from '@/lib/copy/status'
import { serverNow } from '@/lib/time/server-clock'
import { useSessionStore } from '@/stores/session'
import type { FeedComment, FeedPost } from '@/types/api'

/**
 * UX-06: a post's comments in a sheet. Newest first, each with its replies threaded under it; the
 * "not tracked" note stays pinned above the composer, so a question never looks like a way to agree
 * terms (FE-FED-03).
 */
export function CommentsSheet({ post, onClose }: { post: FeedPost | null; onClose: () => void }) {
  const viewerId = useSessionStore((s) => s.userId)
  const status = useSessionStore((s) => s.status)
  const { data, isPending, isError, refetch } = useComments(post?.id ?? '', Boolean(post))
  const now = serverNow()
  const listing = post?.listing
  // Which comment the composer replies to, for this post only
  const [reply, setReply] = useState<{ postId: string; comment: FeedComment } | null>(null)
  const replyTo = reply && reply.postId === post?.id ? reply.comment : null
  const onReply =
    status === 'member' && post ? (comment: FeedComment) => setReply({ postId: post.id, comment }) : undefined

  return (
    <Sheet
      open={post !== null}
      onOpenChange={(open) => {
        if (open) return
        setReply(null)
        onClose()
      }}
      title="Comments"
      footer={
        post && (
          <div className="flex w-full flex-col gap-3">
            <p className="flex items-start gap-2 text-compact text-muted">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
              {copy.commentsNote}
            </p>
            {status === 'member' ? (
              <CommentComposer key={post.id} post={post} replyTo={replyTo} onReplyEnd={() => setReply(null)} />
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
          {commentThreads(data).map(({ comment, replies }) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              now={now}
              viewerId={viewerId}
              // A removed comment's thread stays readable but takes no new replies
              onReply={comment.removed ? undefined : onReply}
              replies={
                replies.length > 0 && (
                  <CommentReplies to={comment}>
                    {replies.map((r) => (
                      <CommentItem
                        key={r.id}
                        comment={r}
                        now={now}
                        viewerId={viewerId}
                        onReply={r.removed || comment.removed ? undefined : onReply}
                      />
                    ))}
                  </CommentReplies>
                )
              }
            />
          ))}
        </ul>
      )}
    </Sheet>
  )
}
