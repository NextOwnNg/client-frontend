import { authDb } from '@/mocks/db/auth'
import { listingsDb, toSummary } from '@/mocks/db/listings'
import { notificationsDb } from '@/mocks/db/notifications'
import { seedFeed, type StoredComment, type StoredPost } from '@/mocks/fixtures/community'
import type { FeedComment, FeedPost } from '@/types/api'

/**
 * The mock API's discovery feed (DSC-04). FICTIONAL. A post is a caption on one listing; the listing is
 * joined live whenever the feed is read, so price and status always match the listing page.
 */

const STORAGE_KEY = 'nextown-mock-feed'
const persistent = import.meta.env.MODE !== 'test'

let posts: StoredPost[] = []
let comments: StoredComment[] = []
let rateLimitNext = false
let counter = 0

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`

function save() {
  if (!persistent) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ posts, comments }))
  } catch {
    // Storage full or unavailable: changes last until reload
  }
}

function seed() {
  const seeded = seedFeed()
  posts = seeded.posts
  comments = seeded.comments
}

function load() {
  seed()
  if (!persistent) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as { posts: StoredPost[]; comments: StoredComment[] }
    posts = saved.posts
    comments = saved.comments
  } catch {
    // Corrupted entry: start from the seeded feed
  }
}
load()

const newest = (a: { createdAt: string }, b: { createdAt: string }) => Date.parse(b.createdAt) - Date.parse(a.createdAt)

function view(post: StoredPost): FeedPost {
  const listing = listingsDb.byIdOrSlug(post.listingId)?.detail
  // A removed listing takes its post with it (ruling R6-2)
  const removed = post.removed || !listing || listing.status === 'REMOVED'
  return {
    id: post.id,
    author: authDb.seller(post.authorId),
    caption: removed ? '' : post.caption,
    listing: removed ? null : toSummary(listing),
    commentCount: comments.filter((c) => c.postId === post.id).length,
    createdAt: post.createdAt,
    removed: removed || undefined,
  }
}

const commentView = (c: StoredComment): FeedComment => ({
  id: c.id,
  author: authDb.seller(c.authorId),
  body: c.removed ? '' : c.body,
  removed: c.removed,
  createdAt: c.createdAt,
})

export const feedDb = {
  /** Newest first, `size` at a time from the cursor (ruling R6-1). */
  page(cursor: number, size: number): { items: FeedPost[]; nextCursor: string | null } {
    const sorted = [...posts].sort(newest)
    const next = cursor + size
    return { items: sorted.slice(cursor, next).map(view), nextCursor: next < sorted.length ? String(next) : null }
  },

  get(id: string) {
    return posts.find((p) => p.id === id)
  },

  view,

  views(ids: string[]): FeedPost[] {
    return ids.flatMap((id) => {
      const post = feedDb.get(id)
      return post ? [view(post)] : []
    })
  },

  postFor: (listingId: string) => posts.find((p) => p.listingId === listingId && !p.removed),

  create(authorId: string, listingId: string, caption: string): FeedPost {
    const post: StoredPost = { id: newId('p'), authorId, listingId, caption, createdAt: new Date().toISOString() }
    posts.push(post)
    save()
    return view(post)
  },

  comments(postId: string): FeedComment[] {
    return comments
      .filter((c) => c.postId === postId)
      .sort(newest)
      .map(commentView)
  },

  addComment(post: StoredPost, authorId: string, body: string): FeedComment {
    const comment: StoredComment = {
      id: newId('c'),
      postId: post.id,
      authorId,
      body,
      removed: false,
      createdAt: new Date().toISOString(),
    }
    comments.push(comment)
    if (post.authorId !== authorId) {
      const title = listingsDb.byIdOrSlug(post.listingId)?.detail.title ?? 'your post'
      notificationsDb.notify(
        post.authorId,
        'COMMENT',
        `${authDb.seller(authorId).displayName} commented on your post`,
        `/feed?post=${post.id}`,
        title,
      )
    }
    save()
    return commentView(comment)
  },

  takeRateLimit() {
    const limited = rateLimitNext
    rateLimitNext = false
    return limited
  },
}

/** Controls for the dev toolbar and tests. */
export const mockFeed = {
  rateLimitNextComment() {
    rateLimitNext = true
  },
  /** Moderators remove the newest visible comment that isn't the member's own. */
  removeNewestComment() {
    const me = authDb.current()?.id
    const target = [...comments].sort(newest).find((c) => !c.removed && c.authorId !== me)
    if (!target) return false
    target.removed = true
    save()
    return true
  },
  reset() {
    seed()
    rateLimitNext = false
  },
}
