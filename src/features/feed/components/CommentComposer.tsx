import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAddComment } from '@/features/feed/api'
import { COMMENT_MAX } from '@/features/feed/feed-limits'
import { errorMessage } from '@/lib/api/error-message'
import type { FeedComment, FeedPost } from '@/types/api'

const commentSchema = z.object({
  body: z.string().trim().min(1, 'Write a comment first.').max(COMMENT_MAX, `Keep it under ${COMMENT_MAX} characters.`),
})

type CommentForm = z.infer<typeof commentSchema>

/**
 * Writes a comment on a post, or a reply when `replyTo` is set. Choosing Reply moves focus here; cancelling
 * keeps the draft as a new comment. A failed post keeps the draft, so nothing typed is lost.
 */
export function CommentComposer({
  post,
  replyTo,
  onReplyEnd,
}: {
  post: FeedPost
  replyTo: FeedComment | null
  /** Called when the reply is posted or cancelled. */
  onReplyEnd: () => void
}) {
  const add = useAddComment(post.id)
  const { register, handleSubmit, reset, setError, setFocus, clearErrors, formState } = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: '' },
  })
  const problem = formState.errors.body?.message ?? formState.errors.root?.message
  const inputId = `comment-${post.id}`
  const replyName = replyTo?.author.displayName

  useEffect(() => {
    if (replyTo) setFocus('body')
  }, [replyTo, setFocus])

  const submit = handleSubmit(async ({ body }) => {
    try {
      await add.mutateAsync({ body, parentId: replyTo?.id })
      reset()
      onReplyEnd()
    } catch (error) {
      const fallback = replyTo ? 'Your reply wasn’t posted.' : 'Your comment wasn’t posted.'
      setError('root', { message: errorMessage(error, fallback, { field: 'body' }) })
    }
  })

  return (
    <form noValidate className="flex w-full flex-col gap-2" onSubmit={(e) => void submit(e)}>
      {replyName && (
        <div className="flex items-center justify-between gap-2 rounded-control bg-mint py-1 pr-1 pl-3">
          <p className="min-w-0 truncate text-compact text-ink">
            Replying to <span className="font-semibold">{replyName}</span>
          </p>
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={() => {
              clearErrors()
              onReplyEnd()
              setFocus('body')
            }}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-120 hover:bg-cloud hover:text-ink"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      )}
      <label htmlFor={inputId} className="sr-only">
        {replyName ? `Write a reply to ${replyName}` : 'Add a comment'}
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id={inputId}
          rows={1}
          maxLength={COMMENT_MAX}
          placeholder={replyName ? 'Write a reply' : 'Ask about the item'}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? `${inputId}-problem` : undefined}
          className="field-input field-sizing-content h-auto max-h-32 min-h-11 flex-1 resize-none py-2.5 leading-6"
          {...register('body')}
        />
        <Button type="submit" isPending={formState.isSubmitting} className="shrink-0">
          Post
        </Button>
      </div>
      {problem && (
        <p id={`${inputId}-problem`} role="alert" className="text-compact text-danger">
          {problem}
        </p>
      )}
    </form>
  )
}
