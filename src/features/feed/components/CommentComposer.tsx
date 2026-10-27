import { Button } from '@heroui/react'
import { useState } from 'react'
import { useAddComment } from '@/features/feed/api'
import { COMMENT_MAX } from '@/features/feed/feed-limits'
import { errorMessage } from '@/lib/api/error-message'
import type { FeedPost } from '@/types/api'

/** Writes a comment on a post. A failed post keeps the draft, so nothing typed is lost. */
export function CommentComposer({ post }: { post: FeedPost }) {
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
      setProblem(errorMessage(error, 'Your comment wasn’t posted.', { field: 'body' }))
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
