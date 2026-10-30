import type { FeedComment } from '@/types/api'

export type CommentThread = { comment: FeedComment; replies: FeedComment[] }

/**
 * Groups a post's comments into one-level threads. Top-level comments keep the server's newest-first order;
 * replies read oldest first under the comment they answer, like a conversation. A reply whose comment
 * isn't in the list is left out rather than shown out of context.
 */
export function commentThreads(comments: FeedComment[]): CommentThread[] {
  const replies = new Map<string, FeedComment[]>()
  for (const comment of comments) {
    if (comment.parentId === null) continue
    replies.set(comment.parentId, [...(replies.get(comment.parentId) ?? []), comment])
  }
  const oldestFirst = (a: FeedComment, b: FeedComment) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
  return comments
    .filter((comment) => comment.parentId === null)
    .map((comment) => ({ comment, replies: (replies.get(comment.id) ?? []).sort(oldestFirst) }))
}
