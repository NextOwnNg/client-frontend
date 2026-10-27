import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAddComment } from '@/features/feed/api'
import { COMMENT_MAX } from '@/features/feed/feed-limits'
import { errorMessage } from '@/lib/api/error-message'
import type { FeedPost } from '@/types/api'

const commentSchema = z.object({
  body: z.string().trim().min(1, 'Write a comment first.').max(COMMENT_MAX, `Keep it under ${COMMENT_MAX} characters.`),
})

type CommentForm = z.infer<typeof commentSchema>

/** Writes a comment on a post. A failed post keeps the draft, so nothing typed is lost. */
export function CommentComposer({ post }: { post: FeedPost }) {
  const add = useAddComment(post.id)
  const { register, handleSubmit, reset, setError, formState } = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: '' },
  })
  const problem = formState.errors.body?.message ?? formState.errors.root?.message
  const inputId = `comment-${post.id}`

  const submit = handleSubmit(async ({ body }) => {
    try {
      await add.mutateAsync(body)
      reset()
    } catch (error) {
      setError('root', { message: errorMessage(error, 'Your comment wasn’t posted.', { field: 'body' }) })
    }
  })

  return (
    <form noValidate className="flex w-full flex-col gap-2" onSubmit={(e) => void submit(e)}>
      <label htmlFor={inputId} className="sr-only">
        Add a comment
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id={inputId}
          rows={1}
          maxLength={COMMENT_MAX}
          placeholder="Ask about the item"
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
